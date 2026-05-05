-- Swap en sitio: cuando el cliente cambia de producto al recibir.
-- El courier registra "le entregue Y unidades del producto Z en lugar del original".
-- El stock del producto sustituto sale del CENTRAL o del STOCK MOVIL del courier.
-- El order_item original mantiene su precio y cantidad: el swap es solo inventario.

-- =============================================
-- 1. Tabla de auditoria de swaps
-- =============================================
CREATE TABLE IF NOT EXISTS order_item_swaps (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id       UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  swapped_product_id  UUID NOT NULL REFERENCES products(id),
  swapped_quantity    INTEGER NOT NULL CHECK (swapped_quantity > 0),
  source              TEXT NOT NULL CHECK (source IN ('central', 'courier_kit')),
  courier_id          UUID NOT NULL REFERENCES users(id),
  admin_id            UUID NOT NULL REFERENCES users(id),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_item_swaps_order_item ON order_item_swaps(order_item_id);
CREATE INDEX IF NOT EXISTS idx_order_item_swaps_admin ON order_item_swaps(admin_id);
CREATE INDEX IF NOT EXISTS idx_order_item_swaps_courier ON order_item_swaps(courier_id);

ALTER TABLE order_item_swaps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS order_item_swaps_admin_select ON order_item_swaps;
CREATE POLICY order_item_swaps_admin_select ON order_item_swaps
  FOR SELECT TO authenticated
  USING (admin_id = auth.uid());

DROP POLICY IF EXISTS order_item_swaps_courier_select ON order_item_swaps;
CREATE POLICY order_item_swaps_courier_select ON order_item_swaps
  FOR SELECT TO authenticated
  USING (courier_id = auth.uid());

-- INSERT/UPDATE/DELETE solo via RPC SECURITY DEFINER (sin policy = sin acceso directo).

COMMENT ON TABLE order_item_swaps IS
  'Cambios en sitio: el cliente acepto un producto sustituto al original. Audit + atribucion.';

-- =============================================
-- 2. Discriminar allocations: swap_id NULL = deduccion original; non-NULL = swap.
-- =============================================
ALTER TABLE outbound_lot_allocations
  ADD COLUMN IF NOT EXISTS swap_id UUID NULL REFERENCES order_item_swaps(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_outbound_lot_allocations_swap ON outbound_lot_allocations(swap_id)
  WHERE swap_id IS NOT NULL;

-- =============================================
-- 3. return_stock_by_item: filtrar para no tocar allocations de swaps.
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

  PERFORM 1 FROM products WHERE id = v_product_id FOR UPDATE;

  FOR v_alloc IN
    SELECT id, lot_id, quantity, unit_cost_snapshot
    FROM outbound_lot_allocations
    WHERE order_item_id = p_order_item_id
      AND swap_id IS NULL
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

  UPDATE products SET stock = stock + v_total_returned WHERE id = v_product_id;

  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'No hay allocations originales suficientes para devolver: faltan % unidades', v_remaining;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 4. return_courier_stock_by_item: mismo filtro de swap_id.
-- =============================================
CREATE OR REPLACE FUNCTION return_courier_stock_by_item(
  p_order_item_id UUID,
  p_quantity      INTEGER,
  p_admin_id      UUID,
  p_courier_id    UUID
) RETURNS VOID AS $$
DECLARE
  v_remaining INTEGER := p_quantity;
  v_alloc RECORD;
  v_revert INTEGER;
  v_product_id UUID;
  v_item_admin UUID;
  v_order_id UUID;
BEGIN
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'admin_id es requerido';
  END IF;
  IF p_courier_id IS NULL THEN
    RAISE EXCEPTION 'courier_id es requerido';
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

  PERFORM 1 FROM users WHERE id = p_courier_id FOR UPDATE;

  FOR v_alloc IN
    SELECT id, lot_id, quantity, unit_cost_snapshot
    FROM outbound_lot_allocations
    WHERE order_item_id = p_order_item_id
      AND swap_id IS NULL
    ORDER BY created_at DESC, id DESC
  LOOP
    EXIT WHEN v_remaining = 0;
    v_revert := LEAST(v_remaining, v_alloc.quantity);

    INSERT INTO courier_inventory (courier_id, product_id, lot_id, quantity_remaining, admin_id)
    VALUES (p_courier_id, v_product_id, v_alloc.lot_id, v_revert, p_admin_id)
    ON CONFLICT (courier_id, lot_id)
      DO UPDATE SET quantity_remaining = courier_inventory.quantity_remaining + EXCLUDED.quantity_remaining;

    IF v_revert >= v_alloc.quantity THEN
      DELETE FROM outbound_lot_allocations WHERE id = v_alloc.id;
    ELSE
      UPDATE outbound_lot_allocations
      SET quantity = quantity - v_revert
      WHERE id = v_alloc.id;
    END IF;

    INSERT INTO inventory_movements (
      product_id, type, quantity, lot_id, unit_cost_snapshot,
      order_reference, order_item_id, admin_id, courier_id, notes
    ) VALUES (
      v_product_id, 'return', v_revert, v_alloc.lot_id, v_alloc.unit_cost_snapshot,
      v_order_id, p_order_item_id, p_admin_id, p_courier_id,
      'Devolucion al stock movil del courier via allocation'
    );

    v_remaining := v_remaining - v_revert;
  END LOOP;

  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'No hay allocations originales suficientes para devolver: faltan % unidades', v_remaining;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. register_swap_at_delivery
-- Inserta el swap, hace FIFO sobre product_lots o courier_inventory segun source,
-- registra movements y allocations con swap_id (no contamina las del item original).
-- =============================================
CREATE OR REPLACE FUNCTION register_swap_at_delivery(
  p_order_item_id        UUID,
  p_swapped_product_id   UUID,
  p_quantity             INTEGER,
  p_source               TEXT,
  p_courier_id           UUID,
  p_admin_id             UUID,
  p_order_reference      UUID,
  p_notes                TEXT DEFAULT NULL
) RETURNS TABLE(swap_id UUID, lot_id UUID, allocated_qty INTEGER, unit_cost NUMERIC) AS $$
DECLARE
  v_swap_id      UUID;
  v_remaining    INTEGER := p_quantity;
  v_lot          RECORD;
  v_consume      INTEGER;
  v_swapped_admin UUID;
  v_movement_notes TEXT;
BEGIN
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'admin_id es requerido';
  END IF;
  IF p_courier_id IS NULL THEN
    RAISE EXCEPTION 'courier_id es requerido';
  END IF;
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'La cantidad de cambio debe ser mayor a cero';
  END IF;
  IF p_source NOT IN ('central', 'courier_kit') THEN
    RAISE EXCEPTION 'Origen invalido (debe ser central o courier_kit): %', p_source;
  END IF;

  -- Validar que el producto sustituto pertenezca al mismo admin
  SELECT admin_id INTO v_swapped_admin FROM products WHERE id = p_swapped_product_id FOR UPDATE;
  IF v_swapped_admin IS NULL THEN
    RAISE EXCEPTION 'Producto sustituto no encontrado';
  END IF;
  IF v_swapped_admin IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'Producto sustituto no pertenece al admin';
  END IF;

  -- Insertar el swap antes de descontar (necesitamos el id para las allocations)
  INSERT INTO order_item_swaps (
    order_item_id, swapped_product_id, swapped_quantity, source,
    courier_id, admin_id, notes
  ) VALUES (
    p_order_item_id, p_swapped_product_id, p_quantity, p_source,
    p_courier_id, p_admin_id, p_notes
  ) RETURNING id INTO v_swap_id;

  v_movement_notes := COALESCE(p_notes, CASE WHEN p_source = 'central'
    THEN 'Cambio en sitio (desde central)'
    ELSE 'Cambio en sitio (desde stock movil)' END);

  IF p_source = 'central' THEN
    -- FIFO sobre product_lots (mismo patron que deduct_stock)
    FOR v_lot IN
      SELECT pl.id, pl.quantity_remaining, pl.unit_cost AS uc
      FROM product_lots pl
      WHERE pl.product_id = p_swapped_product_id
        AND pl.quantity_remaining > 0
        AND pl.active = TRUE
        AND (pl.expires_at IS NULL OR pl.expires_at > NOW())
      ORDER BY pl.received_at ASC, pl.id ASC
      FOR UPDATE OF pl
    LOOP
      EXIT WHEN v_remaining = 0;
      v_consume := LEAST(v_remaining, v_lot.quantity_remaining);

      UPDATE product_lots SET quantity_remaining = quantity_remaining - v_consume WHERE id = v_lot.id;

      INSERT INTO inventory_movements (
        product_id, type, quantity, lot_id, unit_cost_snapshot,
        order_reference, order_item_id, admin_id, courier_id, notes
      ) VALUES (
        p_swapped_product_id, 'outbound', v_consume, v_lot.id, v_lot.uc,
        p_order_reference, NULL, p_admin_id, p_courier_id, v_movement_notes
      );

      INSERT INTO outbound_lot_allocations (
        order_item_id, lot_id, quantity, unit_cost_snapshot, admin_id, swap_id
      ) VALUES (
        NULL, v_lot.id, v_consume, v_lot.uc, p_admin_id, v_swap_id
      );

      swap_id := v_swap_id;
      lot_id := v_lot.id;
      allocated_qty := v_consume;
      unit_cost := v_lot.uc;
      RETURN NEXT;

      v_remaining := v_remaining - v_consume;
    END LOOP;

    IF v_remaining > 0 THEN
      RAISE EXCEPTION 'Stock central insuficiente para producto sustituto: faltan % unidades', v_remaining;
    END IF;

    UPDATE products SET stock = stock - p_quantity WHERE id = p_swapped_product_id;

  ELSE  -- courier_kit
    PERFORM 1 FROM users WHERE id = p_courier_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Courier no encontrado';
    END IF;

    -- FIFO sobre courier_inventory (mismo patron que deduct_courier_stock)
    FOR v_lot IN
      SELECT ci.lot_id AS id, ci.quantity_remaining, pl.unit_cost AS uc
      FROM courier_inventory ci
      JOIN product_lots pl ON pl.id = ci.lot_id
      WHERE ci.courier_id = p_courier_id
        AND ci.product_id = p_swapped_product_id
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
      WHERE courier_id = p_courier_id AND lot_id = v_lot.id;

      INSERT INTO inventory_movements (
        product_id, type, quantity, lot_id, unit_cost_snapshot,
        order_reference, order_item_id, admin_id, courier_id, notes
      ) VALUES (
        p_swapped_product_id, 'outbound', v_consume, v_lot.id, v_lot.uc,
        p_order_reference, NULL, p_admin_id, p_courier_id, v_movement_notes
      );

      INSERT INTO outbound_lot_allocations (
        order_item_id, lot_id, quantity, unit_cost_snapshot, admin_id, swap_id
      ) VALUES (
        NULL, v_lot.id, v_consume, v_lot.uc, p_admin_id, v_swap_id
      );

      swap_id := v_swap_id;
      lot_id := v_lot.id;
      allocated_qty := v_consume;
      unit_cost := v_lot.uc;
      RETURN NEXT;

      v_remaining := v_remaining - v_consume;
    END LOOP;

    IF v_remaining > 0 THEN
      RAISE EXCEPTION 'Stock movil del courier insuficiente para producto sustituto: faltan % unidades', v_remaining;
    END IF;
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION register_swap_at_delivery IS
  'Registra un cambio en sitio: descuenta producto sustituto del central o stock movil del courier (FIFO) y registra el swap.';

-- =============================================
-- 6. revert_swap
-- Rollback de un swap: lee allocations LIFO con swap_id y devuelve al origen,
-- luego borra el swap. Usado por confirmDelivery rollback y admin_cancel_order.
-- =============================================
CREATE OR REPLACE FUNCTION revert_swap(
  p_swap_id  UUID,
  p_admin_id UUID
) RETURNS VOID AS $$
DECLARE
  v_swap RECORD;
  v_alloc RECORD;
BEGIN
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'admin_id es requerido';
  END IF;

  SELECT id, swapped_product_id, source, courier_id, admin_id
    INTO v_swap
  FROM order_item_swaps
  WHERE id = p_swap_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Swap no encontrado: %', p_swap_id;
  END IF;
  IF v_swap.admin_id IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'Swap no pertenece al admin';
  END IF;

  FOR v_alloc IN
    SELECT id, lot_id, quantity, unit_cost_snapshot
    FROM outbound_lot_allocations
    WHERE swap_id = p_swap_id
    ORDER BY created_at DESC, id DESC
  LOOP
    IF v_swap.source = 'central' THEN
      UPDATE product_lots
      SET quantity_remaining = quantity_remaining + v_alloc.quantity
      WHERE id = v_alloc.lot_id;

      UPDATE products SET stock = stock + v_alloc.quantity WHERE id = v_swap.swapped_product_id;
    ELSE
      INSERT INTO courier_inventory (courier_id, product_id, lot_id, quantity_remaining, admin_id)
      VALUES (v_swap.courier_id, v_swap.swapped_product_id, v_alloc.lot_id, v_alloc.quantity, p_admin_id)
      ON CONFLICT (courier_id, lot_id)
        DO UPDATE SET quantity_remaining = courier_inventory.quantity_remaining + EXCLUDED.quantity_remaining;
    END IF;

    INSERT INTO inventory_movements (
      product_id, type, quantity, lot_id, unit_cost_snapshot,
      order_reference, admin_id, courier_id, notes
    ) VALUES (
      v_swap.swapped_product_id, 'return', v_alloc.quantity, v_alloc.lot_id, v_alloc.unit_cost_snapshot,
      NULL, p_admin_id, v_swap.courier_id,
      'Reversion de cambio en sitio'
    );

    DELETE FROM outbound_lot_allocations WHERE id = v_alloc.id;
  END LOOP;

  DELETE FROM order_item_swaps WHERE id = p_swap_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION revert_swap IS
  'Revierte un swap: devuelve unidades al lote original (central o stock movil) y borra el registro.';

-- =============================================
-- 7. admin_cancel_order: tambien revierte swaps de la orden cancelada.
-- =============================================
CREATE OR REPLACE FUNCTION admin_cancel_order(
  p_order_id UUID,
  p_admin_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_swap RECORD;
  v_qty INTEGER;
  v_direct BOOLEAN;
  v_reason TEXT;
BEGIN
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'admin_id es requerido';
  END IF;

  SELECT id, admin_id, customer_id, status, order_type, courier_id, legacy_courier_deduction
  INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido no encontrado';
  END IF;

  IF v_order.admin_id IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'No autorizado para cancelar este pedido';
  END IF;

  IF v_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'El pedido ya esta cancelado';
  END IF;

  v_direct := (v_order.order_type = 'direct');
  v_reason := LEFT(COALESCE(NULLIF(TRIM(p_reason), ''), 'sin motivo'), 500);

  -- Revertir swaps primero (de cualquier estado entregable; los swaps existen
  -- solo si el courier los registro al confirmar).
  IF v_order.status IN ('delivered', 'partial', 'returned') THEN
    FOR v_swap IN
      SELECT s.id
      FROM order_item_swaps s
      JOIN order_items oi ON oi.id = s.order_item_id
      WHERE oi.order_id = p_order_id
    LOOP
      PERFORM revert_swap(v_swap.id, p_admin_id);
    END LOOP;
  END IF;

  IF v_direct AND v_order.status = 'delivered' THEN
    FOR v_item IN
      SELECT id, quantity, COALESCE(returned_quantity, 0) AS rq
      FROM order_items
      WHERE order_id = p_order_id
    LOOP
      v_qty := v_item.quantity - v_item.rq;
      IF v_qty > 0 THEN
        PERFORM return_stock_by_item(v_item.id, v_qty, p_admin_id);
      END IF;
    END LOOP;
  ELSIF (NOT v_direct) AND v_order.status IN ('delivered', 'partial', 'returned') THEN
    FOR v_item IN
      SELECT id, quantity, COALESCE(returned_quantity, 0) AS rq
      FROM order_items
      WHERE order_id = p_order_id
    LOOP
      v_qty := v_item.quantity - v_item.rq;
      IF v_qty > 0 THEN
        IF v_order.legacy_courier_deduction THEN
          IF v_order.courier_id IS NULL THEN
            RAISE EXCEPTION 'Pedido legacy sin domiciliario; no se puede revertir el inventario consumido en entrega';
          END IF;
          PERFORM return_courier_stock_by_item(v_item.id, v_qty, p_admin_id, v_order.courier_id);
        ELSE
          PERFORM return_stock_by_item(v_item.id, v_qty, p_admin_id);
        END IF;
      END IF;
    END LOOP;
  END IF;

  DELETE FROM payments WHERE order_id = p_order_id;

  UPDATE orders
  SET
    status = 'cancelled',
    notes = TRIM(COALESCE(notes, '') || E'\n[CANCELADO por admin] ' || v_reason),
    updated_at = NOW()
  WHERE id = p_order_id;

  PERFORM update_customer_balance(v_order.customer_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION admin_cancel_order(UUID, UUID, TEXT) IS
  'Admin: revierte swaps y inventario segun tipo de pedido y flag legacy_courier_deduction, borra pagos, marca cancelled y actualiza saldo.';
