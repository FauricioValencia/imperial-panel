-- ============================================
-- Migration 002: Rename all tables, columns, constraints,
-- functions, triggers and policies to English
-- ============================================

-- ============================================
-- DROP TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS trigger_pedidos_updated_at ON pedidos;
DROP TRIGGER IF EXISTS audit_pagos ON pagos;
DROP TRIGGER IF EXISTS audit_pedidos ON pedidos;
DROP TRIGGER IF EXISTS audit_movimientos ON movimientos_inventario;
DROP TRIGGER IF EXISTS audit_productos ON productos;

-- ============================================
-- DROP ALL POLICIES
-- ============================================
DROP POLICY IF EXISTS "admin_full_usuarios" ON usuarios;
DROP POLICY IF EXISTS "mensajero_ver_propio" ON usuarios;
DROP POLICY IF EXISTS "admin_full_clientes" ON clientes;
DROP POLICY IF EXISTS "mensajero_leer_clientes" ON clientes;
DROP POLICY IF EXISTS "admin_full_productos" ON productos;
DROP POLICY IF EXISTS "mensajero_leer_productos" ON productos;
DROP POLICY IF EXISTS "admin_full_pedidos" ON pedidos;
DROP POLICY IF EXISTS "mensajero_ver_pedidos" ON pedidos;
DROP POLICY IF EXISTS "mensajero_actualizar_pedidos" ON pedidos;
DROP POLICY IF EXISTS "admin_full_pedido_items" ON pedido_items;
DROP POLICY IF EXISTS "mensajero_ver_items" ON pedido_items;
DROP POLICY IF EXISTS "admin_full_pagos" ON pagos;
DROP POLICY IF EXISTS "mensajero_insertar_pagos" ON pagos;
DROP POLICY IF EXISTS "mensajero_ver_pagos" ON pagos;
DROP POLICY IF EXISTS "admin_full_movimientos" ON movimientos_inventario;
DROP POLICY IF EXISTS "mensajero_leer_movimientos" ON movimientos_inventario;
DROP POLICY IF EXISTS "admin_full_cierres" ON cierres_caja;
DROP POLICY IF EXISTS "mensajero_cierres_propios" ON cierres_caja;
DROP POLICY IF EXISTS "mensajero_insertar_cierre" ON cierres_caja;
DROP POLICY IF EXISTS "admin_full_config" ON configuracion_negocio;
DROP POLICY IF EXISTS "todos_leer_config" ON configuracion_negocio;
DROP POLICY IF EXISTS "admin_leer_audit" ON audit_log;

-- ============================================
-- DROP FUNCTIONS
-- ============================================
DROP FUNCTION IF EXISTS descontar_stock(UUID, INTEGER, UUID);
DROP FUNCTION IF EXISTS reingresar_stock(UUID, INTEGER, UUID);
DROP FUNCTION IF EXISTS actualizar_saldo_cliente(UUID);
DROP FUNCTION IF EXISTS actualizar_updated_at();
DROP FUNCTION IF EXISTS registrar_auditoria();
DROP FUNCTION IF EXISTS obtener_rol_usuario();

-- ============================================
-- DROP OLD INDEXES
-- ============================================
DROP INDEX IF EXISTS idx_pedidos_cliente;
DROP INDEX IF EXISTS idx_pedidos_mensajero;
DROP INDEX IF EXISTS idx_pedidos_estado;
DROP INDEX IF EXISTS idx_pedidos_created;
DROP INDEX IF EXISTS idx_pagos_cliente;
DROP INDEX IF EXISTS idx_pagos_pedido;
DROP INDEX IF EXISTS idx_movimientos_producto;
DROP INDEX IF EXISTS idx_pedido_items_pedido;
DROP INDEX IF EXISTS idx_cierres_mensajero;
DROP INDEX IF EXISTS idx_cierres_fecha;
DROP INDEX IF EXISTS idx_audit_tabla;
DROP INDEX IF EXISTS idx_audit_created;
DROP INDEX IF EXISTS idx_usuarios_rol;
DROP INDEX IF EXISTS idx_clientes_activo;
DROP INDEX IF EXISTS idx_productos_activo;

-- ============================================
-- RENAME TABLES
-- ============================================
ALTER TABLE usuarios RENAME TO users;
ALTER TABLE clientes RENAME TO customers;
ALTER TABLE productos RENAME TO products;
ALTER TABLE pedidos RENAME TO orders;
ALTER TABLE pedido_items RENAME TO order_items;
ALTER TABLE pagos RENAME TO payments;
ALTER TABLE movimientos_inventario RENAME TO inventory_movements;
ALTER TABLE cierres_caja RENAME TO cash_closings;
ALTER TABLE configuracion_negocio RENAME TO business_config;

-- ============================================
-- RENAME COLUMNS: users
-- ============================================
ALTER TABLE users RENAME COLUMN nombre TO name;
ALTER TABLE users RENAME COLUMN rol TO role;
ALTER TABLE users RENAME COLUMN activo TO active;

-- ============================================
-- RENAME COLUMNS: customers
-- ============================================
ALTER TABLE customers RENAME COLUMN nombre TO name;
ALTER TABLE customers RENAME COLUMN telefono TO phone;
ALTER TABLE customers RENAME COLUMN direccion TO address;
ALTER TABLE customers RENAME COLUMN saldo_pendiente TO pending_balance;
ALTER TABLE customers RENAME COLUMN activo TO active;

-- ============================================
-- RENAME COLUMNS: products
-- ============================================
ALTER TABLE products RENAME COLUMN nombre TO name;
ALTER TABLE products RENAME COLUMN descripcion TO description;
ALTER TABLE products RENAME COLUMN precio TO price;
ALTER TABLE products RENAME COLUMN stock_minimo TO min_stock;
ALTER TABLE products RENAME COLUMN activo TO active;

-- ============================================
-- RENAME COLUMNS: orders
-- ============================================
ALTER TABLE orders RENAME COLUMN cliente_id TO customer_id;
ALTER TABLE orders RENAME COLUMN mensajero_id TO courier_id;
ALTER TABLE orders RENAME COLUMN estado TO status;
ALTER TABLE orders RENAME COLUMN notas TO notes;
ALTER TABLE orders RENAME COLUMN fecha_asignacion TO assigned_at;
ALTER TABLE orders RENAME COLUMN fecha_entrega TO delivered_at;

-- ============================================
-- RENAME COLUMNS: order_items
-- ============================================
ALTER TABLE order_items RENAME COLUMN pedido_id TO order_id;
ALTER TABLE order_items RENAME COLUMN producto_id TO product_id;
ALTER TABLE order_items RENAME COLUMN cantidad TO quantity;
ALTER TABLE order_items RENAME COLUMN precio_unitario TO unit_price;
ALTER TABLE order_items RENAME COLUMN devuelto TO returned;
ALTER TABLE order_items RENAME COLUMN cantidad_devuelta TO returned_quantity;

-- ============================================
-- RENAME COLUMNS: payments
-- ============================================
ALTER TABLE payments RENAME COLUMN pedido_id TO order_id;
ALTER TABLE payments RENAME COLUMN cliente_id TO customer_id;
ALTER TABLE payments RENAME COLUMN monto TO amount;
ALTER TABLE payments RENAME COLUMN tipo TO type;
ALTER TABLE payments RENAME COLUMN metodo_pago TO payment_method;
ALTER TABLE payments RENAME COLUMN registrado_por TO registered_by;

-- ============================================
-- RENAME COLUMNS: inventory_movements
-- ============================================
ALTER TABLE inventory_movements RENAME COLUMN producto_id TO product_id;
ALTER TABLE inventory_movements RENAME COLUMN tipo TO type;
ALTER TABLE inventory_movements RENAME COLUMN cantidad TO quantity;
ALTER TABLE inventory_movements RENAME COLUMN referencia_pedido TO order_reference;
ALTER TABLE inventory_movements RENAME COLUMN notas TO notes;

-- ============================================
-- RENAME COLUMNS: cash_closings
-- ============================================
ALTER TABLE cash_closings RENAME COLUMN mensajero_id TO courier_id;
ALTER TABLE cash_closings RENAME COLUMN fecha TO date;
ALTER TABLE cash_closings RENAME COLUMN total_reportado TO reported_total;
ALTER TABLE cash_closings RENAME COLUMN total_sistema TO system_total;
ALTER TABLE cash_closings RENAME COLUMN diferencia TO difference;
ALTER TABLE cash_closings RENAME COLUMN estado TO status;
ALTER TABLE cash_closings RENAME COLUMN notas TO notes;

-- ============================================
-- RENAME COLUMNS: business_config
-- ============================================
ALTER TABLE business_config RENAME COLUMN nombre_empresa TO company_name;
ALTER TABLE business_config RENAME COLUMN nit TO tax_id;
ALTER TABLE business_config RENAME COLUMN telefono TO phone;
ALTER TABLE business_config RENAME COLUMN direccion TO address;
ALTER TABLE business_config RENAME COLUMN condiciones_pago TO payment_terms;

-- ============================================
-- RENAME COLUMNS: audit_log
-- ============================================
ALTER TABLE audit_log RENAME COLUMN tabla TO table_name;
ALTER TABLE audit_log RENAME COLUMN registro_id TO record_id;
ALTER TABLE audit_log RENAME COLUMN accion TO action;
ALTER TABLE audit_log RENAME COLUMN datos_anteriores TO old_data;
ALTER TABLE audit_log RENAME COLUMN datos_nuevos TO new_data;
ALTER TABLE audit_log RENAME COLUMN usuario_id TO user_id;

-- ============================================
-- UPDATE CHECK CONSTRAINTS & ENUM VALUES
-- ============================================

-- users.role
ALTER TABLE users DROP CONSTRAINT usuarios_rol_check;
UPDATE users SET role = 'courier' WHERE role = 'mensajero';
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'courier'));

-- orders.status
ALTER TABLE orders DROP CONSTRAINT pedidos_estado_check;
UPDATE orders SET status = CASE status
  WHEN 'pendiente' THEN 'pending'
  WHEN 'asignado' THEN 'assigned'
  WHEN 'en_camino' THEN 'in_transit'
  WHEN 'entregado' THEN 'delivered'
  WHEN 'devuelto' THEN 'returned'
  WHEN 'parcial' THEN 'partial'
  ELSE status
END;
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'assigned', 'in_transit', 'delivered', 'returned', 'partial'));

-- payments.type
ALTER TABLE payments DROP CONSTRAINT pagos_tipo_check;
UPDATE payments SET type = CASE type
  WHEN 'completo' THEN 'full'
  WHEN 'abono' THEN 'partial'
  ELSE type
END;
ALTER TABLE payments ADD CONSTRAINT payments_type_check CHECK (type IN ('full', 'partial'));

-- payments.payment_method
ALTER TABLE payments DROP CONSTRAINT pagos_metodo_pago_check;
UPDATE payments SET payment_method = CASE payment_method
  WHEN 'efectivo' THEN 'cash'
  WHEN 'transferencia' THEN 'transfer'
  ELSE payment_method
END;
ALTER TABLE payments ALTER COLUMN payment_method SET DEFAULT 'cash';
ALTER TABLE payments ADD CONSTRAINT payments_payment_method_check
  CHECK (payment_method IN ('cash', 'transfer', 'nequi', 'daviplata'));

-- inventory_movements.type
ALTER TABLE inventory_movements DROP CONSTRAINT movimientos_inventario_tipo_check;
UPDATE inventory_movements SET type = CASE type
  WHEN 'entrada' THEN 'inbound'
  WHEN 'salida' THEN 'outbound'
  WHEN 'devolucion' THEN 'return'
  WHEN 'ajuste' THEN 'adjustment'
  ELSE type
END;
ALTER TABLE inventory_movements ADD CONSTRAINT inventory_movements_type_check
  CHECK (type IN ('inbound', 'outbound', 'return', 'adjustment'));

-- cash_closings.status
ALTER TABLE cash_closings DROP CONSTRAINT cierres_caja_estado_check;
UPDATE cash_closings SET status = CASE status
  WHEN 'pendiente' THEN 'pending'
  WHEN 'aprobado' THEN 'approved'
  WHEN 'con_diferencia' THEN 'with_difference'
  ELSE status
END;
ALTER TABLE cash_closings ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE cash_closings ADD CONSTRAINT cash_closings_status_check
  CHECK (status IN ('pending', 'approved', 'with_difference'));

-- audit_log.action (values already in English, just rename constraint)
ALTER TABLE audit_log DROP CONSTRAINT audit_log_accion_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_action_check
  CHECK (action IN ('INSERT', 'UPDATE', 'DELETE'));

-- ============================================
-- RECREATE INDEXES
-- ============================================
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_courier ON orders(courier_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_cash_closings_courier ON cash_closings(courier_id);
CREATE INDEX idx_cash_closings_date ON cash_closings(date);
CREATE INDEX idx_audit_table ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_customers_active ON customers(active);
CREATE INDEX idx_products_active ON products(active);

-- ============================================
-- RECREATE FUNCTIONS
-- ============================================

-- Deduct stock with row locking
CREATE OR REPLACE FUNCTION deduct_stock(
  p_product_id UUID,
  p_quantity INTEGER,
  p_order_reference UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  current_stock INTEGER;
BEGIN
  SELECT stock INTO current_stock
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  IF current_stock IS NULL THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;

  IF current_stock < p_quantity THEN
    RETURN FALSE;
  END IF;

  UPDATE products SET stock = stock - p_quantity WHERE id = p_product_id;

  INSERT INTO inventory_movements (product_id, type, quantity, order_reference, notes)
  VALUES (p_product_id, 'outbound', p_quantity, p_order_reference, 'Stock deducted for order assignment');

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Return stock
CREATE OR REPLACE FUNCTION return_stock(
  p_product_id UUID,
  p_quantity INTEGER,
  p_order_reference UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE products SET stock = stock + p_quantity WHERE id = p_product_id;

  INSERT INTO inventory_movements (product_id, type, quantity, order_reference, notes)
  VALUES (p_product_id, 'return', p_quantity, p_order_reference, 'Stock returned');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update customer pending balance
CREATE OR REPLACE FUNCTION update_customer_balance(p_customer_id UUID)
RETURNS VOID AS $$
DECLARE
  total_orders NUMERIC(12,2);
  total_payments NUMERIC(12,2);
BEGIN
  SELECT COALESCE(SUM(total), 0) INTO total_orders
  FROM orders
  WHERE customer_id = p_customer_id
    AND status NOT IN ('returned');

  SELECT COALESCE(SUM(amount), 0) INTO total_payments
  FROM payments
  WHERE customer_id = p_customer_id;

  UPDATE customers
  SET pending_balance = total_orders - total_payments
  WHERE id = p_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Audit trigger function
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (table_name, record_id, action, new_data, user_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, user_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (table_name, record_id, action, old_data, user_id)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit triggers
CREATE TRIGGER audit_payments AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER audit_orders AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER audit_inventory_movements AFTER INSERT OR UPDATE OR DELETE ON inventory_movements
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER audit_products AFTER UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION log_audit();

-- ============================================
-- HELPER FUNCTION FOR RLS
-- ============================================
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- RECREATE RLS POLICIES
-- ============================================

-- USERS
CREATE POLICY "admin_full_users" ON users
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "user_view_own" ON users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- CUSTOMERS
CREATE POLICY "admin_full_customers" ON customers
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "courier_read_customers" ON customers
  FOR SELECT TO authenticated
  USING (get_user_role() = 'courier');

-- PRODUCTS
CREATE POLICY "admin_full_products" ON products
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "courier_read_products" ON products
  FOR SELECT TO authenticated
  USING (get_user_role() = 'courier');

-- ORDERS
CREATE POLICY "admin_full_orders" ON orders
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "courier_view_orders" ON orders
  FOR SELECT TO authenticated
  USING (get_user_role() = 'courier' AND courier_id = auth.uid());

CREATE POLICY "courier_update_orders" ON orders
  FOR UPDATE TO authenticated
  USING (get_user_role() = 'courier' AND courier_id = auth.uid())
  WITH CHECK (get_user_role() = 'courier' AND courier_id = auth.uid());

-- ORDER_ITEMS
CREATE POLICY "admin_full_order_items" ON order_items
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "courier_view_order_items" ON order_items
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'courier'
    AND order_id IN (SELECT id FROM orders WHERE courier_id = auth.uid())
  );

-- PAYMENTS
CREATE POLICY "admin_full_payments" ON payments
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "courier_insert_payments" ON payments
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'courier' AND registered_by = auth.uid());

CREATE POLICY "courier_view_payments" ON payments
  FOR SELECT TO authenticated
  USING (get_user_role() = 'courier' AND registered_by = auth.uid());

-- INVENTORY_MOVEMENTS
CREATE POLICY "admin_full_inventory_movements" ON inventory_movements
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "courier_read_inventory_movements" ON inventory_movements
  FOR SELECT TO authenticated
  USING (get_user_role() = 'courier');

-- CASH_CLOSINGS
CREATE POLICY "admin_full_cash_closings" ON cash_closings
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "courier_view_own_closings" ON cash_closings
  FOR SELECT TO authenticated
  USING (get_user_role() = 'courier' AND courier_id = auth.uid());

CREATE POLICY "courier_insert_closing" ON cash_closings
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'courier' AND courier_id = auth.uid());

-- BUSINESS_CONFIG
CREATE POLICY "admin_full_business_config" ON business_config
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "all_read_business_config" ON business_config
  FOR SELECT TO authenticated
  USING (true);

-- AUDIT_LOG
CREATE POLICY "admin_read_audit" ON audit_log
  FOR SELECT TO authenticated
  USING (get_user_role() = 'admin');

-- ============================================
-- UPDATE SEED DATA
-- ============================================
UPDATE business_config
SET payment_terms = 'Payment on delivery or credit by prior agreement.'
WHERE payment_terms = 'Pago contra entrega o a credito segun acuerdo previo.';
