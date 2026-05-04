-- =============================================
-- MIGRACION 017: Correccion de cantidad recibida y merma/muestra por lote
-- =============================================
-- Decisiones de negocio:
--   1. Los lotes NO se cierran manualmente (se agotan naturalmente al
--      consumirse via FIFO o ajustes). El RPC close_lot se conserva
--      para casos administrativos especiales pero deja de exponerse
--      en UI.
--   2. NO hay devoluciones a lotes (return_stock_by_item queda como
--      esta para casos de orden devuelta, pero no es flujo principal).
--   3. SI se permite ajustar la cantidad recibida (correccion de
--      digitacion): editar quantity_received con razon obligatoria.
--   4. SI se permite registrar merma/muestra apuntando a un lote
--      especifico (no FIFO automatico): el admin sabe cual lote tuvo
--      el daño/muestra.
--   5. lot_number siempre editable (es display, ID interno UUID es la
--      verdad para trazabilidad).
--
-- Cambios:
--   1. update_lot_metadata extendido:
--      - p_suggested_price (precio sugerido del lote)
--      - p_quantity_received (correccion de captura inicial)
--      - p_correction_reason (obligatorio si cambia quantity_received)
--      Si quantity_received cambia: ajusta quantity_remaining por la
--      diferencia, valida que no quede inconsistente con el consumido
--      historico, registra inventory_movement type='adjustment',
--      actualiza products.stock y products.stock_available.
--   2. inbound_stock_with_lot acepta p_suggested_price (move-in del
--      update directo que estaba en el Server Action).
--   3. NUEVA RPC register_lot_outbound: merma/muestra apuntando a un
--      lote especifico. Bypasses FIFO porque el admin elige el lote.
-- =============================================

-- =============================================
-- 1. inbound_stock_with_lot: aceptar suggested_price
-- =============================================
CREATE OR REPLACE FUNCTION inbound_stock_with_lot(
  p_product_id      UUID,
  p_quantity        INTEGER,
  p_unit_cost       NUMERIC,
  p_admin_id        UUID,
  p_lot_number      TEXT        DEFAULT NULL,
  p_expires_at      TIMESTAMPTZ DEFAULT NULL,
  p_no_expiration   BOOLEAN     DEFAULT FALSE,
  p_supplier        TEXT        DEFAULT NULL,
  p_notes           TEXT        DEFAULT NULL,
  p_suggested_price NUMERIC     DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_product_admin UUID;
  v_lot_id UUID;
  v_lot_number TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'admin_id es requerido';
  END IF;
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a cero';
  END IF;
  IF p_unit_cost IS NULL OR p_unit_cost < 0 THEN
    RAISE EXCEPTION 'El costo unitario debe ser cero o positivo';
  END IF;
  IF p_suggested_price IS NOT NULL AND p_suggested_price < 0 THEN
    RAISE EXCEPTION 'El precio sugerido no puede ser negativo';
  END IF;

  SELECT admin_id INTO v_product_admin
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  IF v_product_admin IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;
  IF v_product_admin IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'Producto no pertenece al admin';
  END IF;

  IF p_lot_number IS NULL OR length(trim(p_lot_number)) = 0 THEN
    v_lot_number := generate_lot_number(p_product_id, p_admin_id);
  ELSE
    v_lot_number := trim(p_lot_number);
  END IF;

  IF p_no_expiration THEN
    v_expires_at := NULL;
  ELSE
    v_expires_at := COALESCE(p_expires_at, NOW() + INTERVAL '1 month');
  END IF;

  INSERT INTO product_lots (
    product_id, admin_id, lot_number, unit_cost, is_estimated_cost,
    suggested_price,
    quantity_received, quantity_remaining, expires_at, supplier, notes
  ) VALUES (
    p_product_id, p_admin_id, v_lot_number, p_unit_cost, FALSE,
    p_suggested_price,
    p_quantity, p_quantity, v_expires_at, p_supplier, p_notes
  ) RETURNING id INTO v_lot_id;

  INSERT INTO inventory_movements (
    product_id, type, quantity, lot_id, unit_cost_snapshot, admin_id, notes
  ) VALUES (
    p_product_id, 'inbound', p_quantity, v_lot_id, p_unit_cost, p_admin_id,
    COALESCE(p_notes, 'Entrada de stock')
  );

  UPDATE products
  SET stock = stock + p_quantity
  WHERE id = p_product_id;

  RETURN v_lot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 2. update_lot_metadata: extender con suggested_price,
--    quantity_received y correction_reason
-- =============================================
-- Reglas para quantity_received:
--   - Si cambia, p_correction_reason es obligatoria (min 5 chars).
--   - Nuevo valor debe ser >= consumido historico
--     (consumido = quantity_received_actual - quantity_remaining_actual).
--   - quantity_remaining se ajusta por la diferencia (delta).
--   - products.stock fisico se ajusta por delta.
--   - products.stock_available se recalcula si el lote esta vigente.
--   - Se registra inventory_movements type='adjustment' con quantity
--     = abs(delta) y notes capturando direccion + razon.
-- =============================================
CREATE OR REPLACE FUNCTION update_lot_metadata(
  p_lot_id              UUID,
  p_admin_id            UUID,
  p_supplier            TEXT        DEFAULT NULL,
  p_notes               TEXT        DEFAULT NULL,
  p_expires_at          TIMESTAMPTZ DEFAULT NULL,
  p_lot_number          TEXT        DEFAULT NULL,
  p_clear_expiration    BOOLEAN     DEFAULT FALSE,
  p_suggested_price     NUMERIC     DEFAULT NULL,
  p_clear_suggested_price BOOLEAN   DEFAULT FALSE,
  p_quantity_received   INTEGER     DEFAULT NULL,
  p_correction_reason   TEXT        DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_lot_admin           UUID;
  v_product_id          UUID;
  v_received_at         TIMESTAMPTZ;
  v_old_expires_at      TIMESTAMPTZ;
  v_new_expires_at      TIMESTAMPTZ;
  v_new_lot_number      TEXT;
  v_old_qty_received    INTEGER;
  v_old_qty_remaining   INTEGER;
  v_consumed            INTEGER;
  v_delta               INTEGER;
  v_old_active          BOOLEAN;
  v_unit_cost           NUMERIC;
  v_movement_notes      TEXT;
BEGIN
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'admin_id es requerido';
  END IF;
  IF p_suggested_price IS NOT NULL AND p_suggested_price < 0 THEN
    RAISE EXCEPTION 'El precio sugerido no puede ser negativo';
  END IF;

  SELECT admin_id, product_id, received_at, expires_at, active,
         quantity_received, quantity_remaining, unit_cost
    INTO v_lot_admin, v_product_id, v_received_at, v_old_expires_at, v_old_active,
         v_old_qty_received, v_old_qty_remaining, v_unit_cost
  FROM product_lots WHERE id = p_lot_id FOR UPDATE;

  IF v_lot_admin IS NULL THEN
    RAISE EXCEPTION 'Lote no encontrado';
  END IF;
  IF v_lot_admin IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'Lote no pertenece al admin';
  END IF;

  -- Resolver nuevo expires_at
  IF p_clear_expiration THEN
    v_new_expires_at := NULL;
  ELSIF p_expires_at IS NOT NULL THEN
    IF p_expires_at < v_received_at THEN
      RAISE EXCEPTION 'La fecha de vencimiento no puede ser anterior a la fecha de recepcion';
    END IF;
    v_new_expires_at := p_expires_at;
  ELSE
    v_new_expires_at := v_old_expires_at;
  END IF;

  -- Resolver nuevo lot_number (display name)
  IF p_lot_number IS NOT NULL AND length(trim(p_lot_number)) > 0 THEN
    v_new_lot_number := trim(p_lot_number);
  ELSE
    v_new_lot_number := NULL;
  END IF;

  -- Procesar cambio de quantity_received (si aplica)
  IF p_quantity_received IS NOT NULL THEN
    IF p_quantity_received <= 0 THEN
      RAISE EXCEPTION 'La cantidad recibida debe ser mayor a cero';
    END IF;
    IF p_correction_reason IS NULL OR length(trim(p_correction_reason)) < 5 THEN
      RAISE EXCEPTION 'Indica una razon de al menos 5 caracteres para la correccion de cantidad';
    END IF;

    v_consumed := v_old_qty_received - v_old_qty_remaining;
    v_delta := p_quantity_received - v_old_qty_received;

    IF p_quantity_received < v_consumed THEN
      RAISE EXCEPTION 'La nueva cantidad recibida (%) no puede ser menor a lo ya consumido (%)',
        p_quantity_received, v_consumed;
    END IF;

    -- Aplicar cambio a quantity_received y quantity_remaining
    UPDATE product_lots
    SET quantity_received  = p_quantity_received,
        quantity_remaining = quantity_remaining + v_delta
    WHERE id = p_lot_id;

    -- Ajustar stock fisico del producto
    UPDATE products
    SET stock = stock + v_delta
    WHERE id = v_product_id;

    -- Registrar movimiento de ajuste
    v_movement_notes := format(
      'Correccion de cantidad recibida (%s%s unidades): %s',
      CASE WHEN v_delta >= 0 THEN '+' ELSE '' END,
      v_delta,
      trim(p_correction_reason)
    );

    INSERT INTO inventory_movements (
      product_id, type, quantity, lot_id, unit_cost_snapshot,
      reason, notes, admin_id
    ) VALUES (
      v_product_id, 'adjustment', abs(v_delta), p_lot_id, v_unit_cost,
      'correccion_captura', v_movement_notes, p_admin_id
    );
  END IF;

  -- Aplicar cambios de metadatos (supplier/notes/expires/lot_number/suggested_price)
  UPDATE product_lots
  SET supplier        = CASE WHEN p_supplier IS NULL THEN supplier
                             WHEN length(trim(p_supplier)) = 0 THEN NULL
                             ELSE p_supplier END,
      notes           = CASE WHEN p_notes IS NULL THEN notes
                             WHEN length(trim(p_notes)) = 0 THEN NULL
                             ELSE p_notes END,
      expires_at      = v_new_expires_at,
      lot_number      = COALESCE(v_new_lot_number, lot_number),
      suggested_price = CASE WHEN p_clear_suggested_price THEN NULL
                             WHEN p_suggested_price IS NULL THEN suggested_price
                             ELSE p_suggested_price END
  WHERE id = p_lot_id;

  -- Recalcular stock_available si: cambio expires_at, o cambio
  -- quantity_received y el lote esta activo y vigente.
  IF v_new_expires_at IS DISTINCT FROM v_old_expires_at
     OR p_quantity_received IS NOT NULL THEN
    UPDATE products p
    SET stock_available = COALESCE((
      SELECT SUM(pl.quantity_remaining)
      FROM product_lots pl
      WHERE pl.product_id = v_product_id
        AND pl.quantity_remaining > 0
        AND pl.active = TRUE
        AND (pl.expires_at IS NULL OR pl.expires_at > NOW())
    ), 0)
    WHERE p.id = v_product_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. NUEVA RPC register_lot_outbound
-- Merma/muestra apuntando a un lote especifico.
-- A diferencia de register_outbound (FIFO), aqui el admin elige
-- explicitamente el lote afectado: caso real es "este jugo del lote
-- L-X se daño" o "saque una muestra de ese lote especifico".
--
-- No crea allocations (no es flujo de orden).
-- Permite consumir lotes vencidos o cuyo expires_at pase a estar
-- en el pasado: la merma/muestra puede ocurrir despues del
-- vencimiento (descarte por vencimiento). El unico requisito es
-- que el lote este active=TRUE y tenga quantity_remaining suficiente.
-- =============================================
CREATE OR REPLACE FUNCTION register_lot_outbound(
  p_lot_id      UUID,
  p_quantity    INTEGER,
  p_reason      TEXT,
  p_admin_id    UUID,
  p_customer_id UUID DEFAULT NULL,
  p_notes       TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_lot_admin       UUID;
  v_lot_active      BOOLEAN;
  v_lot_remaining   INTEGER;
  v_product_id      UUID;
  v_unit_cost       NUMERIC;
  v_customer_admin  UUID;
BEGIN
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'admin_id es requerido';
  END IF;
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a cero';
  END IF;
  IF p_reason NOT IN ('merma', 'muestra') THEN
    RAISE EXCEPTION 'Razon invalida: %. Valores permitidos: merma, muestra', p_reason;
  END IF;
  IF p_reason = 'muestra' AND p_customer_id IS NULL THEN
    RAISE EXCEPTION 'Se requiere cliente para salidas tipo muestra';
  END IF;

  SELECT admin_id, active, quantity_remaining, product_id, unit_cost
    INTO v_lot_admin, v_lot_active, v_lot_remaining, v_product_id, v_unit_cost
  FROM product_lots WHERE id = p_lot_id FOR UPDATE;

  IF v_lot_admin IS NULL THEN
    RAISE EXCEPTION 'Lote no encontrado';
  END IF;
  IF v_lot_admin IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'Lote no pertenece al admin';
  END IF;
  IF NOT v_lot_active THEN
    RAISE EXCEPTION 'No se puede registrar salida en un lote inactivo';
  END IF;
  IF p_quantity > v_lot_remaining THEN
    RAISE EXCEPTION 'Cantidad solicitada (%) supera el restante del lote (%)',
      p_quantity, v_lot_remaining;
  END IF;

  IF p_customer_id IS NOT NULL THEN
    SELECT admin_id INTO v_customer_admin FROM customers WHERE id = p_customer_id;
    IF v_customer_admin IS NULL THEN
      RAISE EXCEPTION 'Cliente no encontrado';
    END IF;
    IF v_customer_admin IS DISTINCT FROM p_admin_id THEN
      RAISE EXCEPTION 'Cliente no pertenece al admin';
    END IF;
  END IF;

  -- Lock del producto para serializar contra deduct_stock concurrente
  PERFORM 1 FROM products WHERE id = v_product_id FOR UPDATE;

  UPDATE product_lots
  SET quantity_remaining = quantity_remaining - p_quantity
  WHERE id = p_lot_id;

  INSERT INTO inventory_movements (
    product_id, type, quantity, lot_id, unit_cost_snapshot,
    reason, sample_customer_id, notes, admin_id
  ) VALUES (
    v_product_id, 'outbound', p_quantity, p_lot_id, v_unit_cost,
    p_reason, p_customer_id, p_notes, p_admin_id
  );

  UPDATE products
  SET stock = stock - p_quantity
  WHERE id = v_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
