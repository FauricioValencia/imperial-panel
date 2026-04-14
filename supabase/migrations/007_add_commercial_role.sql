-- 1. Expandir CHECK de users.role
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'courier', 'super_admin', 'commercial'));

-- 2. FK en customers
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS commercial_id UUID
  REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS customers_commercial_idx ON customers(commercial_id);

-- 3. RLS: commercial puede leer solo sus clientes asignados
DROP POLICY IF EXISTS "commercial_read_customers" ON customers;
CREATE POLICY "commercial_read_customers" ON customers
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'commercial'
    AND admin_id = get_admin_id()
    AND commercial_id = auth.uid()
  );

-- 4. RLS: commercial puede actualizar solo sus clientes (columnas restringidas via trigger)
DROP POLICY IF EXISTS "commercial_update_own_customers" ON customers;
CREATE POLICY "commercial_update_own_customers" ON customers
  FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'commercial'
    AND admin_id = get_admin_id()
    AND commercial_id = auth.uid()
  )
  WITH CHECK (
    get_user_role() = 'commercial'
    AND admin_id = get_admin_id()
    AND commercial_id = auth.uid()
  );

-- 5. Trigger: restringir qué columnas puede modificar un commercial
-- Un commercial SOLO puede tocar phone, address y name. Todo lo demás queda congelado.
CREATE OR REPLACE FUNCTION restrict_commercial_customer_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF get_user_role() = 'commercial' THEN
    IF NEW.commercial_id IS DISTINCT FROM OLD.commercial_id THEN
      RAISE EXCEPTION 'Un comercial no puede reasignar clientes';
    END IF;
    IF NEW.admin_id IS DISTINCT FROM OLD.admin_id THEN
      RAISE EXCEPTION 'Un comercial no puede cambiar el admin del cliente';
    END IF;
    IF NEW.pending_balance IS DISTINCT FROM OLD.pending_balance THEN
      RAISE EXCEPTION 'Un comercial no puede modificar saldos';
    END IF;
    IF NEW.reference_code IS DISTINCT FROM OLD.reference_code THEN
      RAISE EXCEPTION 'Un comercial no puede cambiar el código de referencia';
    END IF;
    IF NEW.preferred_courier_id IS DISTINCT FROM OLD.preferred_courier_id THEN
      RAISE EXCEPTION 'Un comercial no puede cambiar el domiciliario preferido';
    END IF;
    IF NEW.active IS DISTINCT FROM OLD.active THEN
      RAISE EXCEPTION 'Un comercial no puede activar/desactivar clientes';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restrict_commercial_customer_updates ON customers;
CREATE TRIGGER trg_restrict_commercial_customer_updates
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION restrict_commercial_customer_updates();

-- 6. RLS: commercial lee orders de sus clientes
DROP POLICY IF EXISTS "commercial_read_orders" ON orders;
CREATE POLICY "commercial_read_orders" ON orders
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'commercial'
    AND admin_id = get_admin_id()
    AND customer_id IN (
      SELECT id FROM customers WHERE commercial_id = auth.uid()
    )
  );
