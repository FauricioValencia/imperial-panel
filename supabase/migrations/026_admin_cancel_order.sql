-- Estado cancelado + RPC atomico para cancelar pedido como admin (inventario + pagos + saldo).

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (
  status IN (
    'pending',
    'assigned',
    'in_transit',
    'delivered',
    'returned',
    'partial',
    'cancelled'
  )
);

-- Los pedidos cancelados no deben sumar en cartera.
CREATE OR REPLACE FUNCTION update_customer_balance(p_customer_id UUID)
RETURNS VOID AS $$
DECLARE
  total_orders NUMERIC(12, 2);
  total_payments NUMERIC(12, 2);
  total_charges NUMERIC(12, 2);
  v_admin_id UUID;
BEGIN
  SELECT admin_id INTO v_admin_id
  FROM customers
  WHERE id = p_customer_id
  FOR UPDATE;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Customer not found: %', p_customer_id;
  END IF;

  SELECT COALESCE(SUM(total), 0) INTO total_orders
  FROM orders
  WHERE customer_id = p_customer_id
    AND admin_id = v_admin_id
    AND status NOT IN ('returned', 'cancelled');

  SELECT COALESCE(SUM(amount), 0) INTO total_payments
  FROM payments
  WHERE customer_id = p_customer_id
    AND admin_id = v_admin_id;

  SELECT COALESCE(SUM(amount), 0) INTO total_charges
  FROM customer_charges
  WHERE customer_id = p_customer_id
    AND admin_id = v_admin_id
    AND cancelled_at IS NULL;

  UPDATE customers
  SET pending_balance = total_orders + total_charges - total_payments
  WHERE id = p_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_customer_balance(UUID) IS
  'Recalcula pending_balance; excluye pedidos returned y cancelled del total de pedidos.';

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

  SELECT id, admin_id, customer_id, status, order_type, courier_id
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
        IF v_order.courier_id IS NULL THEN
          RAISE EXCEPTION 'Pedido de domicilio sin domiciliario asignado; no se puede revertir el inventario consumido en entrega';
        END IF;
        PERFORM return_courier_stock_by_item(v_item.id, v_qty, p_admin_id, v_order.courier_id);
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
  'Admin: revierte inventario segun tipo de pedido, borra pagos del pedido, marca cancelled y actualiza saldo del cliente.';
