-- Flag legacy para diferenciar pedidos que descontaron de bodega del courier
-- (modelo viejo) vs los que descontaran del central (modelo nuevo).
-- Las ordenes en vuelo al momento del deploy quedan marcadas como legacy
-- para que confirmDelivery y admin_cancel_order usen el flujo viejo.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS legacy_courier_deduction BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN orders.legacy_courier_deduction IS
  'TRUE si el pedido se asigno antes del cambio al modelo central-first. confirmDelivery descuenta de courier_inventory; admin_cancel_order revierte a courier_inventory. FALSE = flujo nuevo (descuenta del central).';

-- Marcar ordenes ya assigned/in_transit como legacy. Idempotente: re-correr no hace dano.
UPDATE orders
SET legacy_courier_deduction = true
WHERE status IN ('assigned', 'in_transit')
  AND legacy_courier_deduction = false;

-- admin_cancel_order: ahora considera el flag para decidir si revierte a
-- courier_inventory (legacy) o a central (flujo nuevo).
CREATE OR REPLACE FUNCTION admin_cancel_order(
  p_order_id UUID,
  p_admin_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
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
  'Admin: revierte inventario segun tipo de pedido y flag legacy_courier_deduction, borra pagos, marca cancelled y actualiza saldo.';
