-- ============================================
-- Migration 005: Multi-tenancy — Data isolation per admin
-- Each admin = 1 business. Couriers belong to one admin.
-- Super_admin sees everything.
-- ============================================

-- ============================================
-- 1. ADD admin_id COLUMN TO ALL TABLES
-- ============================================

ALTER TABLE users ADD COLUMN admin_id UUID REFERENCES auth.users(id);
ALTER TABLE customers ADD COLUMN admin_id UUID REFERENCES auth.users(id);
ALTER TABLE products ADD COLUMN admin_id UUID REFERENCES auth.users(id);
ALTER TABLE orders ADD COLUMN admin_id UUID REFERENCES auth.users(id);
ALTER TABLE order_items ADD COLUMN admin_id UUID REFERENCES auth.users(id);
ALTER TABLE payments ADD COLUMN admin_id UUID REFERENCES auth.users(id);
ALTER TABLE inventory_movements ADD COLUMN admin_id UUID REFERENCES auth.users(id);
ALTER TABLE cash_closings ADD COLUMN admin_id UUID REFERENCES auth.users(id);
ALTER TABLE business_config ADD COLUMN admin_id UUID REFERENCES auth.users(id);
ALTER TABLE audit_log ADD COLUMN admin_id UUID;

-- ============================================
-- 2. MIGRATE EXISTING DATA
-- Assign admin_id to existing records.
-- Admins: admin_id = their own id
-- Couriers: admin_id = NULL (must be assigned manually or by first admin)
-- All business data: assigned to the first admin found
-- ============================================

-- Set admin_id for admin users (each admin owns themselves)
UPDATE users SET admin_id = id WHERE role = 'admin';

-- Set admin_id for super_admin users (null — they are global)
-- Already NULL by default, no action needed.

-- Assign all existing business data to the first admin
-- If multiple admins exist, data goes to the oldest one (first created)
DO $$
DECLARE
  first_admin_id UUID;
BEGIN
  SELECT id INTO first_admin_id
  FROM users
  WHERE role = 'admin'
  ORDER BY created_at ASC
  LIMIT 1;

  IF first_admin_id IS NOT NULL THEN
    -- Assign couriers to first admin
    UPDATE users SET admin_id = first_admin_id WHERE role = 'courier' AND admin_id IS NULL;

    -- Assign all business data to first admin
    UPDATE customers SET admin_id = first_admin_id WHERE admin_id IS NULL;
    UPDATE products SET admin_id = first_admin_id WHERE admin_id IS NULL;
    UPDATE orders SET admin_id = first_admin_id WHERE admin_id IS NULL;
    UPDATE order_items SET admin_id = first_admin_id WHERE admin_id IS NULL;
    UPDATE payments SET admin_id = first_admin_id WHERE admin_id IS NULL;
    UPDATE inventory_movements SET admin_id = first_admin_id WHERE admin_id IS NULL;
    UPDATE cash_closings SET admin_id = first_admin_id WHERE admin_id IS NULL;
    UPDATE business_config SET admin_id = first_admin_id WHERE admin_id IS NULL;
    UPDATE audit_log SET admin_id = first_admin_id WHERE admin_id IS NULL;
  END IF;
END $$;

-- Now enforce NOT NULL on business tables (not on users — super_admin has null)
ALTER TABLE customers ALTER COLUMN admin_id SET NOT NULL;
ALTER TABLE products ALTER COLUMN admin_id SET NOT NULL;
ALTER TABLE orders ALTER COLUMN admin_id SET NOT NULL;
ALTER TABLE order_items ALTER COLUMN admin_id SET NOT NULL;
ALTER TABLE payments ALTER COLUMN admin_id SET NOT NULL;
ALTER TABLE inventory_movements ALTER COLUMN admin_id SET NOT NULL;
ALTER TABLE cash_closings ALTER COLUMN admin_id SET NOT NULL;
ALTER TABLE business_config ALTER COLUMN admin_id SET NOT NULL;

-- ============================================
-- 3. HELPER FUNCTION: get_admin_id()
-- Returns the admin_id of the current authenticated user
-- ============================================

CREATE OR REPLACE FUNCTION get_admin_id()
RETURNS UUID AS $$
  SELECT admin_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- 4. DROP ALL EXISTING RLS POLICIES
-- ============================================

-- users
DROP POLICY IF EXISTS "admin_full_users" ON users;
DROP POLICY IF EXISTS "user_view_own" ON users;
DROP POLICY IF EXISTS "super_admin_full_users" ON users;

-- customers
DROP POLICY IF EXISTS "admin_full_customers" ON customers;
DROP POLICY IF EXISTS "courier_read_customers" ON customers;

-- products
DROP POLICY IF EXISTS "admin_full_products" ON products;
DROP POLICY IF EXISTS "courier_read_products" ON products;

-- orders
DROP POLICY IF EXISTS "admin_full_orders" ON orders;
DROP POLICY IF EXISTS "courier_view_orders" ON orders;
DROP POLICY IF EXISTS "courier_update_orders" ON orders;

-- order_items
DROP POLICY IF EXISTS "admin_full_order_items" ON order_items;
DROP POLICY IF EXISTS "courier_view_order_items" ON order_items;

-- payments
DROP POLICY IF EXISTS "admin_full_payments" ON payments;
DROP POLICY IF EXISTS "courier_insert_payments" ON payments;
DROP POLICY IF EXISTS "courier_view_payments" ON payments;

-- inventory_movements
DROP POLICY IF EXISTS "admin_full_inventory_movements" ON inventory_movements;
DROP POLICY IF EXISTS "courier_read_inventory_movements" ON inventory_movements;

-- cash_closings
DROP POLICY IF EXISTS "admin_full_cash_closings" ON cash_closings;
DROP POLICY IF EXISTS "courier_view_own_closings" ON cash_closings;
DROP POLICY IF EXISTS "courier_insert_closing" ON cash_closings;

-- business_config
DROP POLICY IF EXISTS "admin_full_business_config" ON business_config;
DROP POLICY IF EXISTS "all_read_business_config" ON business_config;
DROP POLICY IF EXISTS "super_admin_full_business_config" ON business_config;

-- audit_log
DROP POLICY IF EXISTS "admin_read_audit" ON audit_log;
DROP POLICY IF EXISTS "super_admin_read_audit_log" ON audit_log;

-- ============================================
-- 5. RECREATE RLS POLICIES WITH TENANT ISOLATION
-- Pattern:
--   Admin: admin_id = auth.uid() (admin's own id IS admin_id)
--   Courier: admin_id = get_admin_id() (courier's admin_id links to their admin)
--   Super admin: get_user_role() = 'super_admin' (sees everything)
-- ============================================

-- ----- USERS -----
-- Super admin: full access
CREATE POLICY "super_admin_full_users" ON users
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin');

-- Admin: see self + couriers that belong to them
CREATE POLICY "admin_view_users" ON users
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'admin'
    AND (id = auth.uid() OR admin_id = auth.uid())
  );

-- Admin: manage couriers that belong to them
CREATE POLICY "admin_manage_users" ON users
  FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'admin'
    AND admin_id = auth.uid()
    AND role = 'courier'
  )
  WITH CHECK (
    get_user_role() = 'admin'
    AND admin_id = auth.uid()
    AND role = 'courier'
  );

-- User: view own profile
CREATE POLICY "user_view_own" ON users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- ----- CUSTOMERS -----
CREATE POLICY "super_admin_full_customers" ON customers
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "admin_full_customers" ON customers
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'admin'
    AND admin_id = auth.uid()
  );

CREATE POLICY "courier_read_customers" ON customers
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'courier'
    AND admin_id = get_admin_id()
  );

-- ----- PRODUCTS -----
CREATE POLICY "super_admin_full_products" ON products
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "admin_full_products" ON products
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'admin'
    AND admin_id = auth.uid()
  );

CREATE POLICY "courier_read_products" ON products
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'courier'
    AND admin_id = get_admin_id()
  );

-- ----- ORDERS -----
CREATE POLICY "super_admin_full_orders" ON orders
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "admin_full_orders" ON orders
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'admin'
    AND admin_id = auth.uid()
  );

CREATE POLICY "courier_view_orders" ON orders
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'courier'
    AND admin_id = get_admin_id()
    AND courier_id = auth.uid()
  );

CREATE POLICY "courier_update_orders" ON orders
  FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'courier'
    AND admin_id = get_admin_id()
    AND courier_id = auth.uid()
  )
  WITH CHECK (
    get_user_role() = 'courier'
    AND admin_id = get_admin_id()
    AND courier_id = auth.uid()
  );

-- ----- ORDER_ITEMS -----
CREATE POLICY "super_admin_full_order_items" ON order_items
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "admin_full_order_items" ON order_items
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'admin'
    AND admin_id = auth.uid()
  );

CREATE POLICY "courier_view_order_items" ON order_items
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'courier'
    AND admin_id = get_admin_id()
    AND order_id IN (SELECT id FROM orders WHERE courier_id = auth.uid())
  );

-- ----- PAYMENTS -----
CREATE POLICY "super_admin_full_payments" ON payments
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "admin_full_payments" ON payments
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'admin'
    AND admin_id = auth.uid()
  );

CREATE POLICY "courier_insert_payments" ON payments
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() = 'courier'
    AND admin_id = get_admin_id()
    AND registered_by = auth.uid()
  );

CREATE POLICY "courier_view_payments" ON payments
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'courier'
    AND admin_id = get_admin_id()
    AND registered_by = auth.uid()
  );

-- ----- INVENTORY_MOVEMENTS -----
CREATE POLICY "super_admin_full_inventory_movements" ON inventory_movements
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "admin_full_inventory_movements" ON inventory_movements
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'admin'
    AND admin_id = auth.uid()
  );

CREATE POLICY "courier_read_inventory_movements" ON inventory_movements
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'courier'
    AND admin_id = get_admin_id()
  );

-- ----- CASH_CLOSINGS -----
CREATE POLICY "super_admin_full_cash_closings" ON cash_closings
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "admin_full_cash_closings" ON cash_closings
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'admin'
    AND admin_id = auth.uid()
  );

CREATE POLICY "courier_view_own_closings" ON cash_closings
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'courier'
    AND admin_id = get_admin_id()
    AND courier_id = auth.uid()
  );

CREATE POLICY "courier_insert_closing" ON cash_closings
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() = 'courier'
    AND admin_id = get_admin_id()
    AND courier_id = auth.uid()
  );

-- ----- BUSINESS_CONFIG -----
CREATE POLICY "super_admin_full_business_config" ON business_config
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "admin_full_business_config" ON business_config
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'admin'
    AND admin_id = auth.uid()
  );

CREATE POLICY "courier_read_business_config" ON business_config
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'courier'
    AND admin_id = get_admin_id()
  );

-- ----- AUDIT_LOG -----
CREATE POLICY "super_admin_read_audit" ON audit_log
  FOR SELECT TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "admin_read_audit" ON audit_log
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'admin'
    AND admin_id = auth.uid()
  );

-- ============================================
-- 6. UPDATE RPC FUNCTIONS
-- Add admin_id to inventory_movements inserts
-- Scope update_customer_balance by admin_id
-- ============================================

-- Deduct stock: add admin_id to inventory_movements insert
CREATE OR REPLACE FUNCTION deduct_stock(
  p_product_id UUID,
  p_quantity INTEGER,
  p_order_reference UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  current_stock INTEGER;
  v_admin_id UUID;
BEGIN
  SELECT stock, admin_id INTO current_stock, v_admin_id
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

  INSERT INTO inventory_movements (product_id, type, quantity, order_reference, notes, admin_id)
  VALUES (p_product_id, 'outbound', p_quantity, p_order_reference, 'Stock deducted for order assignment', v_admin_id);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Return stock: add admin_id to inventory_movements insert
CREATE OR REPLACE FUNCTION return_stock(
  p_product_id UUID,
  p_quantity INTEGER,
  p_order_reference UUID DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  SELECT admin_id INTO v_admin_id FROM products WHERE id = p_product_id;

  UPDATE products SET stock = stock + p_quantity WHERE id = p_product_id;

  INSERT INTO inventory_movements (product_id, type, quantity, order_reference, notes, admin_id)
  VALUES (p_product_id, 'return', p_quantity, p_order_reference, 'Stock returned', v_admin_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Inbound stock: add admin_id to inventory_movements insert
CREATE OR REPLACE FUNCTION inbound_stock(
  p_product_id UUID,
  p_quantity INTEGER,
  p_notes TEXT DEFAULT 'Manual stock entry'
) RETURNS VOID AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  SELECT admin_id INTO v_admin_id FROM products WHERE id = p_product_id;

  UPDATE products SET stock = stock + p_quantity WHERE id = p_product_id;

  INSERT INTO inventory_movements (product_id, type, quantity, notes, admin_id)
  VALUES (p_product_id, 'inbound', p_quantity, p_notes, v_admin_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update customer balance: scope by admin_id for safety
CREATE OR REPLACE FUNCTION update_customer_balance(p_customer_id UUID)
RETURNS VOID AS $$
DECLARE
  total_orders NUMERIC(12,2);
  total_payments NUMERIC(12,2);
  v_admin_id UUID;
BEGIN
  SELECT admin_id INTO v_admin_id FROM customers WHERE id = p_customer_id;

  SELECT COALESCE(SUM(total), 0) INTO total_orders
  FROM orders
  WHERE customer_id = p_customer_id
    AND admin_id = v_admin_id
    AND status NOT IN ('returned');

  SELECT COALESCE(SUM(amount), 0) INTO total_payments
  FROM payments
  WHERE customer_id = p_customer_id
    AND admin_id = v_admin_id;

  UPDATE customers
  SET pending_balance = total_orders - total_payments
  WHERE id = p_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update audit trigger to capture admin_id
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (table_name, record_id, action, new_data, user_id, admin_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), auth.uid(),
      CASE WHEN NEW.admin_id IS NOT NULL THEN NEW.admin_id ELSE NULL END);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, user_id, admin_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid(),
      CASE WHEN NEW.admin_id IS NOT NULL THEN NEW.admin_id ELSE NULL END);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (table_name, record_id, action, old_data, user_id, admin_id)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), auth.uid(),
      CASE WHEN OLD.admin_id IS NOT NULL THEN OLD.admin_id ELSE NULL END);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. INDEXES ON admin_id
-- ============================================

CREATE INDEX idx_users_admin ON users(admin_id);
CREATE INDEX idx_customers_admin ON customers(admin_id);
CREATE INDEX idx_products_admin ON products(admin_id);
CREATE INDEX idx_orders_admin ON orders(admin_id);
CREATE INDEX idx_order_items_admin ON order_items(admin_id);
CREATE INDEX idx_payments_admin ON payments(admin_id);
CREATE INDEX idx_inventory_movements_admin ON inventory_movements(admin_id);
CREATE INDEX idx_cash_closings_admin ON cash_closings(admin_id);
CREATE INDEX idx_business_config_admin ON business_config(admin_id);
CREATE INDEX idx_audit_log_admin ON audit_log(admin_id);

-- Unique constraint: one business_config per admin
CREATE UNIQUE INDEX idx_business_config_unique_admin ON business_config(admin_id);
