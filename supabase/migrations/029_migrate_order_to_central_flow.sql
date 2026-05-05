-- =============================================
-- MIGRACION 029: Rescate de pedidos legacy con bodega courier vacia
-- =============================================
-- RPC SECURITY DEFINER que migra un pedido del flujo legacy
-- (descuenta de courier_inventory) al flujo central (descuenta de
-- product_lots) de forma segura e idempotente:
--   1. Lockea la orden FOR UPDATE (serializa contra confirmDelivery).
--   2. Si quedan unidades en courier_inventory para los productos del
--      pedido y por la cantidad pendiente, las devuelve al lote original
--      del central via product_lots (evita doble-descuento).
--   3. Voida los delivery_attempts del pedido (soft, preserva auditoria).
--   4. Pone legacy_courier_deduction = false.
-- Si el central no tiene stock suficiente, aborta sin tocar nada.
-- =============================================

-- Agregamos voided_at a delivery_attempts para soft-void de idempotency
-- keys quemados por validaciones que fallaron pre-descuento.
ALTER TABLE delivery_attempts
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS delivery_attempts_voided_idx
  ON delivery_attempts(order_id) WHERE voided_at IS NOT NULL;

CREATE OR REPLACE FUNCTION migrate_order_to_central_flow(
  p_order_id UUID,
  p_admin_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_order            RECORD;
  v_item             RECORD;
  v_pending          INTEGER;
  v_central_avail    INTEGER;
  v_in_courier       INTEGER;
  v_returned         INTEGER := 0;
  v_inv              RECORD;
  v_consume          INTEGER;
  v_unit_cost        NUMERIC(14, 2);
  v_attempts_voided  INTEGER := 0;
  v_returns_log      JSONB := '[]'::JSONB;
BEGIN
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'admin_id es requerido';
  END IF;

  SELECT id, admin_id, courier_id, status, legacy_courier_deduction
  INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido no encontrado';
  END IF;
  IF v_order.admin_id IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'No autorizado para migrar este pedido';
  END IF;
  IF v_order.legacy_courier_deduction = FALSE THEN
    -- Idempotente: si ya esta en flujo nuevo, no hay nada que hacer.
    RETURN jsonb_build_object(
      'order_id', p_order_id,
      'already_central', true,
      'returns', v_returns_log,
      'attempts_voided', 0
    );
  END IF;
  IF v_order.status NOT IN ('assigned', 'in_transit') THEN
    RAISE EXCEPTION 'Solo se pueden migrar pedidos en estado assigned o in_transit (actual: %)', v_order.status;
  END IF;

  -- Paso 1: validar central tiene suficiente para todos los items pendientes
  -- ANTES de tocar nada. Asi la operacion es atomica: o se migra el pedido
  -- completo o no se toca.
  FOR v_item IN
    SELECT id, product_id, quantity, COALESCE(returned_quantity, 0) AS rq
    FROM order_items
    WHERE order_id = p_order_id
  LOOP
    v_pending := v_item.quantity - v_item.rq;
    IF v_pending <= 0 THEN
      CONTINUE;
    END IF;

    -- Cantidad ya en bodega del courier para este producto (lotes vigentes
    -- y vencidos cuentan: vamos a devolver TODO al central porque el flujo
    -- nuevo descontara del central).
    SELECT COALESCE(SUM(quantity_remaining), 0)
    INTO v_in_courier
    FROM courier_inventory
    WHERE courier_id = v_order.courier_id
      AND product_id = v_item.product_id;

    -- Stock vigente en central
    SELECT COALESCE(SUM(quantity_remaining), 0)
    INTO v_central_avail
    FROM product_lots
    WHERE product_id = v_item.product_id
      AND admin_id   = p_admin_id
      AND active     = TRUE
      AND quantity_remaining > 0
      AND (expires_at IS NULL OR expires_at > NOW());

    -- Stock total vendible (central + lo que vamos a devolver del courier)
    -- debe ser >= pendiente. Lo que devolvemos del courier vuelve al central
    -- y queda disponible para deduct_stock.
    IF v_central_avail + v_in_courier < v_pending THEN
      RAISE EXCEPTION 'Stock global insuficiente para producto %: necesita %, disponible % (central + courier)',
        v_item.product_id, v_pending, v_central_avail + v_in_courier;
    END IF;
  END LOOP;

  -- Paso 2: devolver TODO el courier_inventory de los productos del pedido
  -- al lote original del central. Esto evita el caso "stock parcial en courier"
  -- que causaria doble-descuento al confirmar delivery con el flujo nuevo.
  FOR v_inv IN
    SELECT ci.id, ci.product_id, ci.lot_id, ci.quantity_remaining
    FROM courier_inventory ci
    WHERE ci.courier_id = v_order.courier_id
      AND ci.product_id IN (
        SELECT product_id FROM order_items WHERE order_id = p_order_id
      )
      AND ci.quantity_remaining > 0
    FOR UPDATE
  LOOP
    v_consume := v_inv.quantity_remaining;

    -- Lock lote del central
    SELECT unit_cost INTO v_unit_cost
    FROM product_lots WHERE id = v_inv.lot_id FOR UPDATE;

    -- Descontar de courier
    UPDATE courier_inventory
    SET quantity_remaining = 0
    WHERE id = v_inv.id;

    -- Devolver al lote original
    UPDATE product_lots
    SET quantity_remaining = quantity_remaining + v_consume
    WHERE id = v_inv.lot_id;

    UPDATE products
    SET stock = stock + v_consume
    WHERE id = v_inv.product_id;

    -- Movimientos: out de courier, in al central
    INSERT INTO inventory_movements (
      product_id, type, quantity, lot_id, unit_cost_snapshot,
      admin_id, courier_id, notes
    ) VALUES (
      v_inv.product_id, 'transfer_out', v_consume, v_inv.lot_id, v_unit_cost,
      p_admin_id, v_order.courier_id,
      'Migracion pedido ' || p_order_id::text || ' a flujo central: devolucion desde courier'
    );
    INSERT INTO inventory_movements (
      product_id, type, quantity, lot_id, unit_cost_snapshot,
      admin_id, courier_id, notes
    ) VALUES (
      v_inv.product_id, 'transfer_in', v_consume, v_inv.lot_id, v_unit_cost,
      p_admin_id, NULL,
      'Migracion pedido ' || p_order_id::text || ' a flujo central: recepcion en central'
    );

    v_returned := v_returned + v_consume;
    v_returns_log := v_returns_log || jsonb_build_object(
      'product_id', v_inv.product_id,
      'lot_id', v_inv.lot_id,
      'quantity', v_consume
    );
  END LOOP;

  -- Paso 3: void delivery_attempts del pedido (soft) para que el siguiente
  -- intento no caiga en idempotent_replay con un attempt_key viejo.
  UPDATE delivery_attempts
  SET voided_at = NOW()
  WHERE order_id = p_order_id AND voided_at IS NULL;
  GET DIAGNOSTICS v_attempts_voided = ROW_COUNT;

  -- Paso 4: voltear flag a flujo central
  UPDATE orders
  SET legacy_courier_deduction = FALSE,
      updated_at = NOW(),
      notes = TRIM(COALESCE(notes, '') || E'\n[MIGRADO a flujo central por admin] ' || NOW()::text)
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'already_central', false,
    'returned_to_central', v_returned,
    'returns', v_returns_log,
    'attempts_voided', v_attempts_voided
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION migrate_order_to_central_flow(UUID, UUID) IS
  'Admin: migra un pedido legacy (descuenta de courier_inventory) al flujo central. Devuelve cualquier stock parcial del courier al central, voida delivery_attempts y voltea el flag. Idempotente y atomico.';

-- ---------- delivery_attempts: respetar voided_at en idempotency replay ----------
-- El UNIQUE(order_id, attempt_key) sigue ahi pero ahora un attempt voided
-- no debe bloquear el reintento. El codigo TS chequeara voided_at.
