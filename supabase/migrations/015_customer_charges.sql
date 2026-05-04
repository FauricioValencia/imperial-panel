-- ============================================
-- Migration 015: Manual customer charges (cartera)
-- Allows admins to add manual debt to a customer's wallet
-- without creating an order (legacy debt, adjustments, fees).
-- ============================================

-- ============================================
-- 1. TABLE: customer_charges
-- ============================================
CREATE TABLE customer_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0 AND amount <= 50000000),
  charge_type TEXT NOT NULL CHECK (
    charge_type IN ('legacy_debt', 'adjustment', 'late_fee', 'service', 'other')
  ),
  reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 5 AND 500),
  due_date DATE,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES auth.users(id),
  cancel_reason TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 2. INDEXES
-- ============================================
CREATE INDEX idx_customer_charges_customer
  ON customer_charges(customer_id, created_at DESC)
  WHERE cancelled_at IS NULL;
CREATE INDEX idx_customer_charges_admin
  ON customer_charges(admin_id, created_at DESC);

-- ============================================
-- 3. RLS
-- ============================================
ALTER TABLE customer_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_full_customer_charges" ON customer_charges
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "admin_full_customer_charges" ON customer_charges
  FOR ALL TO authenticated
  USING (
    get_user_role() = 'admin'
    AND admin_id = auth.uid()
  )
  WITH CHECK (
    get_user_role() = 'admin'
    AND admin_id = auth.uid()
    AND created_by = auth.uid()
  );

-- ============================================
-- 4. TRIGGER: derive admin_id from customer
-- Prevents cross-tenant leaks if client sends a wrong admin_id.
-- Also blocks inserts on inactive (soft-deleted) customers.
-- ============================================
CREATE OR REPLACE FUNCTION enforce_customer_charge_tenant()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_admin UUID;
  v_customer_active BOOLEAN;
BEGIN
  SELECT admin_id, active
    INTO v_customer_admin, v_customer_active
  FROM customers
  WHERE id = NEW.customer_id;

  IF v_customer_admin IS NULL THEN
    RAISE EXCEPTION 'Customer not found: %', NEW.customer_id;
  END IF;

  IF NOT v_customer_active THEN
    RAISE EXCEPTION 'Cannot add charge to inactive customer';
  END IF;

  -- Force admin_id from the customer record (ignore client value).
  NEW.admin_id := v_customer_admin;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_enforce_customer_charge_tenant
  BEFORE INSERT ON customer_charges
  FOR EACH ROW EXECUTE FUNCTION enforce_customer_charge_tenant();

-- ============================================
-- 5. AUDIT TRIGGER (reuse existing log_audit)
-- ============================================
CREATE TRIGGER audit_customer_charges
  AFTER INSERT OR UPDATE OR DELETE ON customer_charges
  FOR EACH ROW EXECUTE FUNCTION log_audit();

-- ============================================
-- 6. UPDATE update_customer_balance() to include charges
-- Adds pessimistic lock on the customer row to prevent
-- race conditions between concurrent payments/charges.
-- ============================================
CREATE OR REPLACE FUNCTION update_customer_balance(p_customer_id UUID)
RETURNS VOID AS $$
DECLARE
  total_orders NUMERIC(12, 2);
  total_payments NUMERIC(12, 2);
  total_charges NUMERIC(12, 2);
  v_admin_id UUID;
BEGIN
  -- Lock the customer row to serialize balance updates.
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
    AND status NOT IN ('returned');

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

-- ============================================
-- 7. VIEW: customer_ledger
-- Unified read-only view of all wallet movements (payments + charges).
-- Reports and PDFs should consume this view.
-- ============================================
CREATE OR REPLACE VIEW customer_ledger AS
SELECT
  p.id,
  p.customer_id,
  p.admin_id,
  'payment'::text AS entry_type,
  p.payment_method::text AS subtype,
  -p.amount AS amount_signed,
  p.amount AS amount,
  p.order_id,
  NULL::text AS reason,
  NULL::timestamptz AS cancelled_at,
  p.registered_by AS actor_id,
  p.created_at
FROM payments p
UNION ALL
SELECT
  c.id,
  c.customer_id,
  c.admin_id,
  'charge'::text AS entry_type,
  c.charge_type AS subtype,
  c.amount AS amount_signed,
  c.amount AS amount,
  NULL::uuid AS order_id,
  c.reason,
  c.cancelled_at,
  c.created_by AS actor_id,
  c.created_at
FROM customer_charges c;
