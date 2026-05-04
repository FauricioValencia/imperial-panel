-- ============================================
-- Migration 024: Precios acordados por cliente
-- Precio de venta especifico (customer + product) distinto al catalogo.
-- ============================================

CREATE TABLE customer_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  custom_price NUMERIC(12, 2) NOT NULL CHECK (custom_price > 0 AND custom_price <= 50000000),
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT customer_prices_admin_customer_product_uq UNIQUE (admin_id, customer_id, product_id)
);

CREATE INDEX idx_customer_prices_customer_active
  ON customer_prices(customer_id, admin_id)
  WHERE active = true;

CREATE INDEX idx_customer_prices_product_admin
  ON customer_prices(product_id, admin_id)
  WHERE active = true;

ALTER TABLE customer_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_full_customer_prices" ON customer_prices
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "admin_full_customer_prices" ON customer_prices
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'admin'
    AND admin_id = auth.uid()
  )
  WITH CHECK (
    get_user_role() = 'admin'
    AND admin_id = auth.uid()
  );

CREATE OR REPLACE FUNCTION enforce_customer_price_tenant()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_admin UUID;
  v_customer_active BOOLEAN;
  v_product_admin UUID;
BEGIN
  SELECT admin_id, active
    INTO v_customer_admin, v_customer_active
  FROM customers
  WHERE id = NEW.customer_id;

  IF v_customer_admin IS NULL THEN
    RAISE EXCEPTION 'Customer not found: %', NEW.customer_id;
  END IF;

  IF NOT v_customer_active THEN
    RAISE EXCEPTION 'Cannot set price for inactive customer';
  END IF;

  SELECT admin_id INTO v_product_admin
  FROM products
  WHERE id = NEW.product_id;

  IF v_product_admin IS NULL THEN
    RAISE EXCEPTION 'Product not found: %', NEW.product_id;
  END IF;

  IF v_product_admin IS DISTINCT FROM v_customer_admin THEN
    RAISE EXCEPTION 'Product and customer belong to different tenants';
  END IF;

  NEW.admin_id := v_customer_admin;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_enforce_customer_price_tenant
  BEFORE INSERT OR UPDATE ON customer_prices
  FOR EACH ROW EXECUTE FUNCTION enforce_customer_price_tenant();

CREATE TRIGGER trg_customer_prices_updated_at
  BEFORE UPDATE ON customer_prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER audit_customer_prices
  AFTER INSERT OR UPDATE OR DELETE ON customer_prices
  FOR EACH ROW EXECUTE FUNCTION log_audit();
