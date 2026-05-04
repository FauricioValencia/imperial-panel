-- =============================================
-- MIGRACION 019: Bodega del domiciliario - RLS + Audit
-- =============================================
-- Habilita RLS en las nuevas tablas y define policies por rol.
-- Agrega triggers de log_audit() para trazabilidad.
-- Ajusta policy de inventory_movements para permitir al courier ver
-- los movimientos de su propia bodega.
-- =============================================

-- ---------- 1. Enable RLS ----------
ALTER TABLE courier_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfer_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_inventory_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_attempts ENABLE ROW LEVEL SECURITY;

-- ---------- 2. courier_inventory policies ----------
DROP POLICY IF EXISTS "super_admin_full_courier_inventory" ON courier_inventory;
CREATE POLICY "super_admin_full_courier_inventory" ON courier_inventory
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin');

DROP POLICY IF EXISTS "admin_full_courier_inventory" ON courier_inventory;
CREATE POLICY "admin_full_courier_inventory" ON courier_inventory
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin' AND admin_id = auth.uid())
  WITH CHECK (get_user_role() = 'admin' AND admin_id = auth.uid());

DROP POLICY IF EXISTS "courier_read_own_inventory" ON courier_inventory;
CREATE POLICY "courier_read_own_inventory" ON courier_inventory
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'courier'
    AND admin_id = get_admin_id()
    AND courier_id = auth.uid()
  );

DROP POLICY IF EXISTS "block_delete_courier_inventory" ON courier_inventory;
CREATE POLICY "block_delete_courier_inventory" ON courier_inventory
  AS RESTRICTIVE FOR DELETE TO authenticated USING (false);

-- ---------- 3. stock_transfers policies ----------
DROP POLICY IF EXISTS "super_admin_full_stock_transfers" ON stock_transfers;
CREATE POLICY "super_admin_full_stock_transfers" ON stock_transfers
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin');

DROP POLICY IF EXISTS "admin_full_stock_transfers" ON stock_transfers;
CREATE POLICY "admin_full_stock_transfers" ON stock_transfers
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin' AND admin_id = auth.uid())
  WITH CHECK (get_user_role() = 'admin' AND admin_id = auth.uid());

DROP POLICY IF EXISTS "courier_read_own_transfers" ON stock_transfers;
CREATE POLICY "courier_read_own_transfers" ON stock_transfers
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'courier'
    AND admin_id = get_admin_id()
    AND courier_id = auth.uid()
  );

DROP POLICY IF EXISTS "block_delete_stock_transfers" ON stock_transfers;
CREATE POLICY "block_delete_stock_transfers" ON stock_transfers
  AS RESTRICTIVE FOR DELETE TO authenticated USING (false);

-- ---------- 4. stock_transfer_lines policies ----------
DROP POLICY IF EXISTS "super_admin_full_transfer_lines" ON stock_transfer_lines;
CREATE POLICY "super_admin_full_transfer_lines" ON stock_transfer_lines
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin');

DROP POLICY IF EXISTS "admin_full_transfer_lines" ON stock_transfer_lines;
CREATE POLICY "admin_full_transfer_lines" ON stock_transfer_lines
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin' AND admin_id = auth.uid())
  WITH CHECK (get_user_role() = 'admin' AND admin_id = auth.uid());

DROP POLICY IF EXISTS "courier_read_own_transfer_lines" ON stock_transfer_lines;
CREATE POLICY "courier_read_own_transfer_lines" ON stock_transfer_lines
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'courier'
    AND admin_id = get_admin_id()
    AND transfer_id IN (
      SELECT id FROM stock_transfers WHERE courier_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "block_delete_transfer_lines" ON stock_transfer_lines;
CREATE POLICY "block_delete_transfer_lines" ON stock_transfer_lines
  AS RESTRICTIVE FOR DELETE TO authenticated USING (false);

-- ---------- 5. pending_inventory_adjustments policies ----------
DROP POLICY IF EXISTS "super_admin_full_pending_adj" ON pending_inventory_adjustments;
CREATE POLICY "super_admin_full_pending_adj" ON pending_inventory_adjustments
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin');

DROP POLICY IF EXISTS "admin_full_pending_adj" ON pending_inventory_adjustments;
CREATE POLICY "admin_full_pending_adj" ON pending_inventory_adjustments
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin' AND admin_id = auth.uid())
  WITH CHECK (get_user_role() = 'admin' AND admin_id = auth.uid());

DROP POLICY IF EXISTS "courier_read_own_pending_adj" ON pending_inventory_adjustments;
CREATE POLICY "courier_read_own_pending_adj" ON pending_inventory_adjustments
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'courier'
    AND admin_id = get_admin_id()
    AND courier_id = auth.uid()
  );

-- ---------- 6. delivery_attempts policies ----------
DROP POLICY IF EXISTS "super_admin_full_delivery_attempts" ON delivery_attempts;
CREATE POLICY "super_admin_full_delivery_attempts" ON delivery_attempts
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin');

DROP POLICY IF EXISTS "admin_read_delivery_attempts" ON delivery_attempts;
CREATE POLICY "admin_read_delivery_attempts" ON delivery_attempts
  FOR SELECT TO authenticated
  USING (get_user_role() = 'admin' AND admin_id = auth.uid());

DROP POLICY IF EXISTS "courier_manage_own_delivery_attempts" ON delivery_attempts;
CREATE POLICY "courier_manage_own_delivery_attempts" ON delivery_attempts
  FOR ALL TO authenticated
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

DROP POLICY IF EXISTS "block_delete_delivery_attempts" ON delivery_attempts;
CREATE POLICY "block_delete_delivery_attempts" ON delivery_attempts
  AS RESTRICTIVE FOR DELETE TO authenticated USING (false);

-- ---------- 7. Audit triggers ----------
DROP TRIGGER IF EXISTS audit_courier_inventory ON courier_inventory;
CREATE TRIGGER audit_courier_inventory
  AFTER INSERT OR UPDATE OR DELETE ON courier_inventory
  FOR EACH ROW EXECUTE FUNCTION log_audit();

DROP TRIGGER IF EXISTS audit_stock_transfers ON stock_transfers;
CREATE TRIGGER audit_stock_transfers
  AFTER INSERT OR UPDATE OR DELETE ON stock_transfers
  FOR EACH ROW EXECUTE FUNCTION log_audit();

DROP TRIGGER IF EXISTS audit_stock_transfer_lines ON stock_transfer_lines;
CREATE TRIGGER audit_stock_transfer_lines
  AFTER INSERT OR UPDATE OR DELETE ON stock_transfer_lines
  FOR EACH ROW EXECUTE FUNCTION log_audit();

DROP TRIGGER IF EXISTS audit_pending_inventory_adjustments ON pending_inventory_adjustments;
CREATE TRIGGER audit_pending_inventory_adjustments
  AFTER INSERT OR UPDATE OR DELETE ON pending_inventory_adjustments
  FOR EACH ROW EXECUTE FUNCTION log_audit();
