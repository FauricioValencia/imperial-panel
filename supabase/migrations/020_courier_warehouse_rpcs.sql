-- =============================================
-- MIGRACION 020: Bodega del domiciliario - RPCs
-- =============================================
-- RPCs SECURITY DEFINER para operaciones atomicas sobre bodega courier:
--   - transfer_to_courier: descuenta de product_lots (FIFO) y crea
--     courier_inventory + stock_transfers + lines
--   - return_from_courier: descuenta de courier_inventory (lote
--     exacto) y devuelve al lote original de product_lots
--   - deduct_courier_stock: FIFO sobre courier_inventory para entrega
--   - return_courier_stock_by_item: rollback espejo
--   - validate_courier_has_stock: pre-check para asignacion
-- =============================================

-- ---------- 1. transfer_to_courier ----------
-- Recibe lineas como JSONB: [{"product_id": "...", "quantity": N}, ...]
-- Por cada linea consume FIFO de product_lots del central y suma a
-- courier_inventory. Genera multiples lineas en stock_transfer_lines
-- si el FIFO partio en varios lotes.
CREATE OR REPLACE FUNCTION transfer_to_courier(
  p_admin_id    UUID,
  p_courier_id  UUID,
  p_lines       JSONB,
  p_notes       TEXT DEFAULT NULL,
  p_created_by  UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_transfer_id   UUID;
  v_courier_admin UUID;
  v_courier_role  TEXT;
  v_line          JSONB;
  v_product_id    UUID;
  v_quantity      INTEGER;
  v_remaining     INTEGER;
  v_consume       INTEGER;
  v_lot           RECORD;
  v_now           TIMESTAMPTZ := NOW();
  v_creator       UUID;
BEGIN
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'admin_id es requerido';
  END IF;
  IF p_courier_id IS NULL THEN
    RAISE EXCEPTION 'courier_id es requerido';
  END IF;
  IF p_lines IS NULL OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'Debes transferir al menos un producto';
  END IF;

  v_creator := COALESCE(p_created_by, p_admin_id);

  -- Validar courier pertenece al admin y es courier activo
  SELECT admin_id, role INTO v_courier_admin, v_courier_role
  FROM users WHERE id = p_courier_id FOR UPDATE;

  IF v_courier_admin IS NULL THEN
    RAISE EXCEPTION 'Courier no encontrado';
  END IF;
  IF v_courier_role IS DISTINCT FROM 'courier' THEN
    RAISE EXCEPTION 'El usuario destino no es un courier';
  END IF;
  IF v_courier_admin IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'El courier no pertenece al admin';
  END IF;

  -- Crear cabecera transfer
  INSERT INTO stock_transfers (
    admin_id, courier_id, kind, status, notes, created_by, completed_at
  ) VALUES (
    p_admin_id, p_courier_id, 'dispatch', 'completed', p_notes, v_creator, v_now
  ) RETURNING id INTO v_transfer_id;

  -- Procesar cada linea
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_product_id := (v_line->>'product_id')::UUID;
    v_quantity   := (v_line->>'quantity')::INTEGER;

    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'product_id es requerido en cada linea';
    END IF;
    IF v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'La cantidad debe ser mayor a cero';
    END IF;

    -- Lock product
    PERFORM 1 FROM products WHERE id = v_product_id AND admin_id = p_admin_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto no pertenece al admin o no existe';
    END IF;

    v_remaining := v_quantity;

    -- FIFO sobre lotes vigentes del central
    FOR v_lot IN
      SELECT id, quantity_remaining, unit_cost
      FROM product_lots
      WHERE product_id = v_product_id
        AND admin_id = p_admin_id
        AND quantity_remaining > 0
        AND active = TRUE
        AND (expires_at IS NULL OR expires_at > v_now)
      ORDER BY received_at ASC, id ASC
      FOR UPDATE
    LOOP
      EXIT WHEN v_remaining = 0;

      v_consume := LEAST(v_remaining, v_lot.quantity_remaining);

      -- Descontar del central
      UPDATE product_lots
      SET quantity_remaining = quantity_remaining - v_consume
      WHERE id = v_lot.id;

      -- Sumar a bodega courier (upsert por (courier_id, lot_id))
      INSERT INTO courier_inventory (
        courier_id, admin_id, product_id, lot_id, quantity_remaining
      ) VALUES (
        p_courier_id, p_admin_id, v_product_id, v_lot.id, v_consume
      )
      ON CONFLICT (courier_id, lot_id) DO UPDATE
        SET quantity_remaining = courier_inventory.quantity_remaining + EXCLUDED.quantity_remaining;

      -- Linea del transfer
      INSERT INTO stock_transfer_lines (
        transfer_id, product_id, lot_id, quantity, unit_cost_snapshot, admin_id
      ) VALUES (
        v_transfer_id, v_product_id, v_lot.id, v_consume, v_lot.unit_cost, p_admin_id
      );

      -- Movement out (central) + in (courier)
      INSERT INTO inventory_movements (
        product_id, type, quantity, lot_id, unit_cost_snapshot,
        admin_id, courier_id, transfer_id, notes
      ) VALUES (
        v_product_id, 'transfer_out', v_consume, v_lot.id, v_lot.unit_cost,
        p_admin_id, NULL, v_transfer_id, 'Transferencia a courier'
      );
      INSERT INTO inventory_movements (
        product_id, type, quantity, lot_id, unit_cost_snapshot,
        admin_id, courier_id, transfer_id, notes
      ) VALUES (
        v_product_id, 'transfer_in', v_consume, v_lot.id, v_lot.unit_cost,
        p_admin_id, p_courier_id, v_transfer_id, 'Recepcion en bodega courier'
      );

      -- Mantener products.stock como total fisico central
      UPDATE products SET stock = stock - v_consume WHERE id = v_product_id;

      v_remaining := v_remaining - v_consume;
    END LOOP;

    IF v_remaining > 0 THEN
      RAISE EXCEPTION 'Stock vigente insuficiente para producto %: faltan % unidades', v_product_id, v_remaining;
    END IF;
  END LOOP;

  RETURN v_transfer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------- 2. return_from_courier ----------
-- Recibe lineas: [{"lot_id": "...", "quantity": N, "product_id": "..."}, ...]
-- Devuelve al lote exacto (no FIFO) para preservar costo y vencimiento.
CREATE OR REPLACE FUNCTION return_from_courier(
  p_admin_id    UUID,
  p_courier_id  UUID,
  p_lines       JSONB,
  p_kind        TEXT DEFAULT 'return',
  p_notes       TEXT DEFAULT NULL,
  p_created_by  UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_transfer_id   UUID;
  v_courier_admin UUID;
  v_line          JSONB;
  v_lot_id        UUID;
  v_product_id    UUID;
  v_quantity      INTEGER;
  v_unit_cost     NUMERIC(14,2);
  v_now           TIMESTAMPTZ := NOW();
  v_creator       UUID;
BEGIN
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'admin_id es requerido';
  END IF;
  IF p_courier_id IS NULL THEN
    RAISE EXCEPTION 'courier_id es requerido';
  END IF;
  IF p_lines IS NULL OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'Debes devolver al menos un producto';
  END IF;
  IF p_kind NOT IN ('return', 'adjustment') THEN
    RAISE EXCEPTION 'Tipo invalido: %', p_kind;
  END IF;

  v_creator := COALESCE(p_created_by, p_admin_id);

  SELECT admin_id INTO v_courier_admin
  FROM users WHERE id = p_courier_id FOR UPDATE;

  IF v_courier_admin IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'El courier no pertenece al admin';
  END IF;

  INSERT INTO stock_transfers (
    admin_id, courier_id, kind, status, notes, created_by, completed_at
  ) VALUES (
    p_admin_id, p_courier_id, p_kind, 'completed', p_notes, v_creator, v_now
  ) RETURNING id INTO v_transfer_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_lot_id   := (v_line->>'lot_id')::UUID;
    v_quantity := (v_line->>'quantity')::INTEGER;

    IF v_lot_id IS NULL THEN
      RAISE EXCEPTION 'lot_id es requerido';
    END IF;
    IF v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'La cantidad debe ser mayor a cero';
    END IF;

    -- Lock courier_inventory row
    SELECT product_id INTO v_product_id
    FROM courier_inventory
    WHERE courier_id = p_courier_id AND lot_id = v_lot_id
    FOR UPDATE;

    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'Lote % no esta en la bodega del courier', v_lot_id;
    END IF;

    -- Validar suficiente
    PERFORM 1 FROM courier_inventory
    WHERE courier_id = p_courier_id AND lot_id = v_lot_id
      AND quantity_remaining >= v_quantity;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cantidad insuficiente del lote % en bodega del courier', v_lot_id;
    END IF;

    -- Descontar de courier
    UPDATE courier_inventory
    SET quantity_remaining = quantity_remaining - v_quantity
    WHERE courier_id = p_courier_id AND lot_id = v_lot_id;

    -- Lock product_lots y devolver al lote original
    SELECT unit_cost INTO v_unit_cost
    FROM product_lots WHERE id = v_lot_id FOR UPDATE;

    UPDATE product_lots
    SET quantity_remaining = quantity_remaining + v_quantity
    WHERE id = v_lot_id;

    UPDATE products SET stock = stock + v_quantity WHERE id = v_product_id;

    -- Linea del transfer
    INSERT INTO stock_transfer_lines (
      transfer_id, product_id, lot_id, quantity, unit_cost_snapshot, admin_id
    ) VALUES (
      v_transfer_id, v_product_id, v_lot_id, v_quantity, v_unit_cost, p_admin_id
    );

    -- Movements: out de courier, in en central
    INSERT INTO inventory_movements (
      product_id, type, quantity, lot_id, unit_cost_snapshot,
      admin_id, courier_id, transfer_id, notes
    ) VALUES (
      v_product_id, 'transfer_out', v_quantity, v_lot_id, v_unit_cost,
      p_admin_id, p_courier_id, v_transfer_id, 'Devolucion desde courier'
    );
    INSERT INTO inventory_movements (
      product_id, type, quantity, lot_id, unit_cost_snapshot,
      admin_id, courier_id, transfer_id, notes
    ) VALUES (
      v_product_id, 'transfer_in', v_quantity, v_lot_id, v_unit_cost,
      p_admin_id, NULL, v_transfer_id, 'Recepcion en bodega central'
    );
  END LOOP;

  RETURN v_transfer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------- 3. deduct_courier_stock ----------
-- FIFO sobre courier_inventory para confirmacion de entrega.
-- Devuelve TABLE de allocations para registro/auditoria.
CREATE OR REPLACE FUNCTION deduct_courier_stock(
  p_courier_id      UUID,
  p_admin_id        UUID,
  p_product_id      UUID,
  p_quantity        INTEGER,
  p_order_item_id   UUID,
  p_order_reference UUID,
  p_notes           TEXT DEFAULT NULL
) RETURNS TABLE(lot_id UUID, allocated_qty INTEGER, unit_cost NUMERIC) AS $$
DECLARE
  v_remaining INTEGER := p_quantity;
  v_lot       RECORD;
  v_consume   INTEGER;
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a cero';
  END IF;

  -- Lock courier (serializa entregas concurrentes del mismo courier)
  PERFORM 1 FROM users WHERE id = p_courier_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Courier no encontrado';
  END IF;

  -- FIFO sobre courier_inventory + product_lots para vigencia
  FOR v_lot IN
    SELECT ci.lot_id, ci.quantity_remaining, pl.unit_cost AS uc, pl.received_at
    FROM courier_inventory ci
    JOIN product_lots pl ON pl.id = ci.lot_id
    WHERE ci.courier_id = p_courier_id
      AND ci.product_id = p_product_id
      AND ci.quantity_remaining > 0
      AND pl.active = TRUE
      AND (pl.expires_at IS NULL OR pl.expires_at > NOW())
    ORDER BY pl.received_at ASC, pl.id ASC
    FOR UPDATE OF ci
  LOOP
    EXIT WHEN v_remaining = 0;

    v_consume := LEAST(v_remaining, v_lot.quantity_remaining);

    UPDATE courier_inventory
    SET quantity_remaining = quantity_remaining - v_consume
    WHERE courier_id = p_courier_id AND lot_id = v_lot.lot_id;

    -- Movement
    INSERT INTO inventory_movements (
      product_id, type, quantity, lot_id, unit_cost_snapshot,
      order_reference, order_item_id, admin_id, courier_id, notes
    ) VALUES (
      p_product_id, 'outbound', v_consume, v_lot.lot_id, v_lot.uc,
      p_order_reference, p_order_item_id, p_admin_id, p_courier_id, p_notes
    );

    -- Allocation: apunta al lote original (preserva COGS y vistas existentes)
    INSERT INTO outbound_lot_allocations (
      order_item_id, lot_id, quantity, unit_cost_snapshot, admin_id
    ) VALUES (
      p_order_item_id, v_lot.lot_id, v_consume, v_lot.uc, p_admin_id
    );

    lot_id := v_lot.lot_id;
    allocated_qty := v_consume;
    unit_cost := v_lot.uc;
    RETURN NEXT;

    v_remaining := v_remaining - v_consume;
  END LOOP;

  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'Stock insuficiente en bodega del courier: faltan % unidades', v_remaining;
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------- 4. return_courier_stock_by_item ----------
-- Rollback de deduct_courier_stock: lee outbound_lot_allocations LIFO
-- y reincrementa courier_inventory (no central).
CREATE OR REPLACE FUNCTION return_courier_stock_by_item(
  p_order_item_id UUID,
  p_quantity      INTEGER,
  p_admin_id      UUID,
  p_courier_id    UUID
) RETURNS VOID AS $$
DECLARE
  v_remaining INTEGER := p_quantity;
  v_alloc     RECORD;
  v_consume   INTEGER;
  v_product_id UUID;
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a cero';
  END IF;

  SELECT product_id INTO v_product_id FROM order_items WHERE id = p_order_item_id;
  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'order_item no encontrado';
  END IF;

  -- LIFO sobre allocations
  FOR v_alloc IN
    SELECT id, lot_id, quantity, unit_cost_snapshot
    FROM outbound_lot_allocations
    WHERE order_item_id = p_order_item_id
    ORDER BY created_at DESC, id DESC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining = 0;

    v_consume := LEAST(v_remaining, v_alloc.quantity);

    -- Reducir o eliminar allocation
    IF v_consume = v_alloc.quantity THEN
      DELETE FROM outbound_lot_allocations WHERE id = v_alloc.id;
    ELSE
      UPDATE outbound_lot_allocations
      SET quantity = quantity - v_consume
      WHERE id = v_alloc.id;
    END IF;

    -- Restaurar a courier_inventory (no central)
    INSERT INTO courier_inventory (
      courier_id, admin_id, product_id, lot_id, quantity_remaining
    ) VALUES (
      p_courier_id, p_admin_id, v_product_id, v_alloc.lot_id, v_consume
    )
    ON CONFLICT (courier_id, lot_id) DO UPDATE
      SET quantity_remaining = courier_inventory.quantity_remaining + EXCLUDED.quantity_remaining;

    -- Movement de retorno
    INSERT INTO inventory_movements (
      product_id, type, quantity, lot_id, unit_cost_snapshot,
      order_item_id, admin_id, courier_id, notes
    ) VALUES (
      v_product_id, 'return', v_consume, v_alloc.lot_id, v_alloc.unit_cost_snapshot,
      p_order_item_id, p_admin_id, p_courier_id, 'Rollback de entrega'
    );

    v_remaining := v_remaining - v_consume;
  END LOOP;

  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'No hay allocations suficientes para devolver: faltan % unidades', v_remaining;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------- 5. validate_courier_has_stock ----------
-- Pre-check para assignCourier: verifica que el courier tenga
-- suficiente stock vigente para todos los items del pedido.
-- Retorna jsonb con productos faltantes (vacio si OK).
CREATE OR REPLACE FUNCTION validate_courier_has_stock(
  p_courier_id  UUID,
  p_items       JSONB
) RETURNS JSONB AS $$
DECLARE
  v_item        JSONB;
  v_product_id  UUID;
  v_quantity    INTEGER;
  v_available   INTEGER;
  v_missing     JSONB := '[]'::JSONB;
  v_product_name TEXT;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN v_missing;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity   := (v_item->>'quantity')::INTEGER;

    SELECT COALESCE(SUM(ci.quantity_remaining), 0)
    INTO v_available
    FROM courier_inventory ci
    JOIN product_lots pl ON pl.id = ci.lot_id
    WHERE ci.courier_id = p_courier_id
      AND ci.product_id = v_product_id
      AND ci.quantity_remaining > 0
      AND pl.active = TRUE
      AND (pl.expires_at IS NULL OR pl.expires_at > NOW());

    IF v_available < v_quantity THEN
      SELECT name INTO v_product_name FROM products WHERE id = v_product_id;
      v_missing := v_missing || jsonb_build_object(
        'product_id', v_product_id,
        'product_name', COALESCE(v_product_name, 'Producto desconocido'),
        'required', v_quantity,
        'available', v_available,
        'shortfall', v_quantity - v_available
      );
    END IF;
  END LOOP;

  RETURN v_missing;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
