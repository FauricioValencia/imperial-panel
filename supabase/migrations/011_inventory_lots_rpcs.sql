-- =============================================
-- MIGRACION 011: RPCs para inventario por lotes
-- =============================================
-- Reemplaza deduct_stock e inbound_stock con versiones que operan
-- por lote (FIFO automatico, omite vencidos). Agrega:
--   - generate_lot_number: numero de lote auto-generado
--   - inbound_stock_with_lot: entrada de stock crea siempre un lote
--   - deduct_stock (nueva firma): FIFO multi-lote, registra
--     allocations en outbound_lot_allocations para trazabilidad
--   - return_stock_by_item: devolucion al lote original via allocations
--   - return_stock (legacy): se mantiene por compat, devuelve al lote
--     mas reciente (no recomendado, usar return_stock_by_item)
--   - register_outbound: modificada para FIFO multi-lote
-- =============================================

-- =============================================
-- 1. generate_lot_number
-- Formato: L-{codigo|PRD-shortid}-{YYYYMM}-{seq3}
-- Concurrencia: serializada por el FOR UPDATE de products en los
-- callers (inbound_stock_with_lot). Index UNIQUE como red de seguridad.
-- =============================================
CREATE OR REPLACE FUNCTION generate_lot_number(p_product_id UUID) RETURNS TEXT AS $$
DECLARE
  v_codigo TEXT;
  v_prefix TEXT;
  v_seq INTEGER;
BEGIN
  SELECT codigo INTO v_codigo FROM products WHERE id = p_product_id;
  v_prefix := 'L-'
    || COALESCE(v_codigo, 'PRD-' || substr(p_product_id::text, 1, 6))
    || '-' || to_char(NOW(), 'YYYYMM') || '-';

  SELECT COUNT(*) + 1 INTO v_seq
  FROM product_lots
  WHERE product_id = p_product_id
    AND lot_number LIKE v_prefix || '%';

  RETURN v_prefix || lpad(v_seq::text, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 2. inbound_stock_with_lot
-- Crea un nuevo lote, registra movement y suma stock.
-- =============================================
CREATE OR REPLACE FUNCTION inbound_stock_with_lot(
  p_product_id     UUID,
  p_quantity       INTEGER,
  p_unit_cost      NUMERIC,
  p_admin_id       UUID,
  p_lot_number     TEXT        DEFAULT NULL,
  p_expires_at     TIMESTAMPTZ DEFAULT NULL,
  p_no_expiration  BOOLEAN     DEFAULT FALSE,
  p_supplier       TEXT        DEFAULT NULL,
  p_notes          TEXT        DEFAULT NULL
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

  -- Lock para serializar inbounds del mismo producto y la generacion
  -- de numero de lote secuencial.
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
    v_lot_number := generate_lot_number(p_product_id);
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
    quantity_received, quantity_remaining, expires_at, supplier, notes
  ) VALUES (
    p_product_id, p_admin_id, v_lot_number, p_unit_cost, FALSE,
    p_quantity, p_quantity, v_expires_at, p_supplier, p_notes
  ) RETURNING id INTO v_lot_id;

  INSERT INTO inventory_movements (
    product_id, type, quantity, lot_id, unit_cost_snapshot, admin_id, notes
  ) VALUES (
    p_product_id, 'inbound', p_quantity, v_lot_id, p_unit_cost, p_admin_id,
    COALESCE(p_notes, 'Entrada de stock')
  );

  -- Mantener products.stock como total fisico (incluye vencidos potenciales)
  UPDATE products SET stock = stock + p_quantity WHERE id = p_product_id;

  RETURN v_lot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. inbound_stock (legacy wrapper)
-- Permite que callers viejos sigan funcionando: usa products.price
-- como costo provisional. Marcado como NO recomendado.
-- =============================================
DROP FUNCTION IF EXISTS inbound_stock(UUID, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION inbound_stock(
  p_product_id UUID,
  p_quantity   INTEGER,
  p_notes      TEXT DEFAULT 'Manual stock entry'
) RETURNS VOID AS $$
DECLARE
  v_admin_id UUID;
  v_price NUMERIC;
BEGIN
  SELECT admin_id, price INTO v_admin_id, v_price
  FROM products WHERE id = p_product_id;
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;
  PERFORM inbound_stock_with_lot(
    p_product_id := p_product_id,
    p_quantity   := p_quantity,
    p_unit_cost  := v_price,
    p_admin_id   := v_admin_id,
    p_notes      := p_notes
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 4. deduct_stock (nueva firma, FIFO multi-lote)
-- Devuelve TABLE de allocations realizadas para que el caller pueda
-- loguear o reaccionar. Saltea lotes vencidos (de facto FEFO sobre
-- vigentes). Si la suma de lotes vigentes < p_quantity, RAISES.
-- =============================================
DROP FUNCTION IF EXISTS deduct_stock(UUID, INTEGER, UUID);

CREATE OR REPLACE FUNCTION deduct_stock(
  p_product_id      UUID,
  p_quantity        INTEGER,
  p_admin_id        UUID,
  p_order_item_id   UUID DEFAULT NULL,
  p_order_reference UUID DEFAULT NULL,
  p_notes           TEXT DEFAULT NULL
) RETURNS TABLE(lot_id UUID, allocated_qty INTEGER, unit_cost NUMERIC) AS $$
DECLARE
  v_product_admin UUID;
  v_remaining INTEGER := p_quantity;
  v_lot RECORD;
  v_consume INTEGER;
BEGIN
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'admin_id es requerido';
  END IF;
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a cero';
  END IF;

  -- Lock product para serializar outbounds concurrentes
  SELECT admin_id INTO v_product_admin
  FROM products WHERE id = p_product_id FOR UPDATE;

  IF v_product_admin IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;
  IF v_product_admin IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'Producto no pertenece al admin';
  END IF;

  -- FIFO: lote mas viejo primero, omitiendo vencidos y agotados
  FOR v_lot IN
    SELECT pl.id, pl.quantity_remaining, pl.unit_cost AS uc
    FROM product_lots pl
    WHERE pl.product_id = p_product_id
      AND pl.quantity_remaining > 0
      AND pl.active = TRUE
      AND (pl.expires_at IS NULL OR pl.expires_at > NOW())
    ORDER BY pl.received_at ASC, pl.id ASC
  LOOP
    EXIT WHEN v_remaining = 0;

    v_consume := LEAST(v_remaining, v_lot.quantity_remaining);

    -- SECURITY DEFINER puede UPDATE pese al REVOKE de columna porque
    -- la funcion corre con privilegios del owner (postgres).
    UPDATE product_lots
    SET quantity_remaining = quantity_remaining - v_consume
    WHERE id = v_lot.id;

    -- Audit movement
    INSERT INTO inventory_movements (
      product_id, type, quantity, lot_id, unit_cost_snapshot,
      order_reference, order_item_id, admin_id, notes
    ) VALUES (
      p_product_id, 'outbound', v_consume, v_lot.id, v_lot.uc,
      p_order_reference, p_order_item_id, p_admin_id, p_notes
    );

    -- Allocation (truth source para devoluciones); solo cuando hay order_item
    IF p_order_item_id IS NOT NULL THEN
      INSERT INTO outbound_lot_allocations (
        order_item_id, lot_id, quantity, unit_cost_snapshot, admin_id
      ) VALUES (
        p_order_item_id, v_lot.id, v_consume, v_lot.uc, p_admin_id
      );
    END IF;

    -- Return row to caller
    lot_id := v_lot.id;
    allocated_qty := v_consume;
    unit_cost := v_lot.uc;
    RETURN NEXT;

    v_remaining := v_remaining - v_consume;
  END LOOP;

  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'Stock vigente insuficiente: faltan % unidades (puede haber stock vencido bloqueado)', v_remaining;
  END IF;

  -- products.stock = total fisico
  UPDATE products SET stock = stock - p_quantity WHERE id = p_product_id;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. return_stock_by_item
-- Devuelve stock al(los) lote(s) original(es) consultando
-- outbound_lot_allocations. LIFO sobre las allocations (ultima
-- consumida es la primera en revertir).
-- =============================================
CREATE OR REPLACE FUNCTION return_stock_by_item(
  p_order_item_id UUID,
  p_quantity      INTEGER,
  p_admin_id      UUID
) RETURNS VOID AS $$
DECLARE
  v_remaining INTEGER := p_quantity;
  v_alloc RECORD;
  v_revert INTEGER;
  v_product_id UUID;
  v_item_admin UUID;
  v_total_returned INTEGER := 0;
  v_order_id UUID;
BEGIN
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'admin_id es requerido';
  END IF;
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a cero';
  END IF;

  SELECT product_id, admin_id, order_id
    INTO v_product_id, v_item_admin, v_order_id
  FROM order_items WHERE id = p_order_item_id;

  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'Order item no encontrado';
  END IF;
  IF v_item_admin IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'Order item no pertenece al admin';
  END IF;

  -- Lock product
  PERFORM 1 FROM products WHERE id = v_product_id FOR UPDATE;

  -- LIFO sobre allocations
  FOR v_alloc IN
    SELECT id, lot_id, quantity, unit_cost_snapshot
    FROM outbound_lot_allocations
    WHERE order_item_id = p_order_item_id
    ORDER BY created_at DESC, id DESC
  LOOP
    EXIT WHEN v_remaining = 0;
    v_revert := LEAST(v_remaining, v_alloc.quantity);

    UPDATE product_lots
    SET quantity_remaining = quantity_remaining + v_revert
    WHERE id = v_alloc.lot_id;

    IF v_revert >= v_alloc.quantity THEN
      DELETE FROM outbound_lot_allocations WHERE id = v_alloc.id;
    ELSE
      UPDATE outbound_lot_allocations
      SET quantity = quantity - v_revert
      WHERE id = v_alloc.id;
    END IF;

    INSERT INTO inventory_movements (
      product_id, type, quantity, lot_id, unit_cost_snapshot,
      order_reference, order_item_id, admin_id, notes
    ) VALUES (
      v_product_id, 'return', v_revert, v_alloc.lot_id, v_alloc.unit_cost_snapshot,
      v_order_id, p_order_item_id, p_admin_id,
      'Devolucion al lote original via allocation'
    );

    v_remaining := v_remaining - v_revert;
    v_total_returned := v_total_returned + v_revert;
  END LOOP;

  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'Asignaciones insuficientes para devolver: faltan % unidades', v_remaining;
  END IF;

  UPDATE products SET stock = stock + v_total_returned WHERE id = v_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 6. return_stock (legacy)
-- Conservada por compatibilidad. Cuando el caller no tiene
-- order_item_id, devuelve al lote vigente mas reciente; si no hay
-- ninguno, crea un "lote de devolucion" con costo = price (no ideal,
-- pero defensivo). Recomendado: migrar callers a return_stock_by_item.
-- =============================================
CREATE OR REPLACE FUNCTION return_stock(
  p_product_id      UUID,
  p_quantity        INTEGER,
  p_order_reference UUID DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_admin_id UUID;
  v_target_lot UUID;
  v_unit_cost NUMERIC;
  v_price NUMERIC;
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a cero';
  END IF;

  SELECT admin_id, price INTO v_admin_id, v_price
  FROM products WHERE id = p_product_id FOR UPDATE;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;

  -- Buscar lote vigente mas reciente
  SELECT id, unit_cost INTO v_target_lot, v_unit_cost
  FROM product_lots
  WHERE product_id = p_product_id
    AND active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY received_at DESC, id DESC
  LIMIT 1;

  IF v_target_lot IS NULL THEN
    -- No hay lote vigente: crear uno de devolucion
    INSERT INTO product_lots (
      product_id, admin_id, lot_number, unit_cost, is_estimated_cost,
      quantity_received, quantity_remaining, notes
    ) VALUES (
      p_product_id, v_admin_id,
      generate_lot_number(p_product_id),
      v_price, TRUE,
      p_quantity, p_quantity,
      'Lote de devolucion (sin allocation original)'
    ) RETURNING id, unit_cost INTO v_target_lot, v_unit_cost;
  ELSE
    UPDATE product_lots
    SET quantity_remaining = quantity_remaining + p_quantity
    WHERE id = v_target_lot;
  END IF;

  INSERT INTO inventory_movements (
    product_id, type, quantity, lot_id, unit_cost_snapshot,
    order_reference, admin_id, notes
  ) VALUES (
    p_product_id, 'return', p_quantity, v_target_lot, v_unit_cost,
    p_order_reference, v_admin_id, 'Devolucion (legacy: lote mas reciente)'
  );

  UPDATE products SET stock = stock + p_quantity WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 7. register_outbound (modificada para FIFO multi-lote)
-- Mantiene la firma original. Internamente consume lotes FIFO
-- (omitiendo vencidos) y registra una fila de inventory_movements
-- por lote consumido. NO crea allocations porque es flujo de merma/
-- muestra (no orden).
-- =============================================
CREATE OR REPLACE FUNCTION register_outbound(
  p_product_id   UUID,
  p_quantity     INTEGER,
  p_reason       TEXT,
  p_customer_id  UUID DEFAULT NULL,
  p_notes        TEXT DEFAULT NULL,
  p_admin_id     UUID DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_product_admin UUID;
  v_customer_admin UUID;
  v_remaining INTEGER := p_quantity;
  v_lot RECORD;
  v_consume INTEGER;
BEGIN
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'admin_id es requerido';
  END IF;
  IF p_reason NOT IN ('merma', 'muestra') THEN
    RAISE EXCEPTION 'Razon invalida: %. Valores permitidos: merma, muestra', p_reason;
  END IF;
  IF p_reason = 'muestra' AND p_customer_id IS NULL THEN
    RAISE EXCEPTION 'Se requiere cliente para salidas tipo muestra';
  END IF;
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a cero';
  END IF;

  SELECT admin_id INTO v_product_admin
  FROM products WHERE id = p_product_id FOR UPDATE;

  IF v_product_admin IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;
  IF v_product_admin IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'Producto no pertenece al admin';
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

  FOR v_lot IN
    SELECT pl.id, pl.quantity_remaining, pl.unit_cost AS uc
    FROM product_lots pl
    WHERE pl.product_id = p_product_id
      AND pl.quantity_remaining > 0
      AND pl.active = TRUE
      AND (pl.expires_at IS NULL OR pl.expires_at > NOW())
    ORDER BY pl.received_at ASC, pl.id ASC
  LOOP
    EXIT WHEN v_remaining = 0;
    v_consume := LEAST(v_remaining, v_lot.quantity_remaining);

    UPDATE product_lots
    SET quantity_remaining = quantity_remaining - v_consume
    WHERE id = v_lot.id;

    INSERT INTO inventory_movements (
      product_id, type, quantity, lot_id, unit_cost_snapshot,
      reason, sample_customer_id, notes, admin_id
    ) VALUES (
      p_product_id, 'outbound', v_consume, v_lot.id, v_lot.uc,
      p_reason, p_customer_id, p_notes, p_admin_id
    );

    v_remaining := v_remaining - v_consume;
  END LOOP;

  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'Stock vigente insuficiente: faltan % unidades (puede haber stock vencido bloqueado)', v_remaining;
  END IF;

  UPDATE products SET stock = stock - p_quantity WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
