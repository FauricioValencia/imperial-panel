-- =============================================
-- MIGRACIÓN 006: Códigos de producto/cliente, domiciliario preferido,
--                zonas, y salidas manuales de inventario (mermas/muestras)
-- =============================================

-- =============================================
-- 1. CÓDIGO EN PRODUCTOS (SKU / código interno)
-- =============================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS codigo TEXT;
-- Unicidad por admin, case-insensitive. Partial index para permitir NULL.
CREATE UNIQUE INDEX IF NOT EXISTS products_codigo_admin_idx
  ON products (admin_id, lower(codigo))
  WHERE codigo IS NOT NULL;

-- =============================================
-- 2. CÓDIGO REFERENCIA EN CLIENTES
-- =============================================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS reference_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS customers_reference_code_admin_idx
  ON customers (admin_id, lower(reference_code))
  WHERE reference_code IS NOT NULL;

-- =============================================
-- 3. DOMICILIARIO PREFERIDO EN CLIENTE (solo informativo)
-- =============================================
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS preferred_courier_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS customers_preferred_courier_idx
  ON customers(preferred_courier_id);

-- =============================================
-- 4. TABLA ZONAS
-- =============================================
CREATE TABLE IF NOT EXISTS zones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  admin_id    UUID NOT NULL REFERENCES auth.users(id),
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS zones_admin_id_idx ON zones(admin_id);

-- Nombre único por admin (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS zones_name_admin_idx
  ON zones (admin_id, lower(name));

-- RLS para zonas
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

-- Admin: CRUD completo sobre sus zonas
CREATE POLICY "admin_zones_all" ON zones
  FOR ALL TO authenticated
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

-- Courier: solo lectura de zonas de su admin
CREATE POLICY "courier_zones_read" ON zones
  FOR SELECT TO authenticated
  USING (admin_id = get_admin_id());

-- Super admin: acceso total
CREATE POLICY "super_admin_zones_all" ON zones
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (true);

-- =============================================
-- 5. ZONA EN DOMICILIARIOS (1 zona por domiciliario)
-- =============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES zones(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS users_zone_id_idx ON users(zone_id);

-- =============================================
-- 6. CAMPOS PARA MERMAS Y MUESTRAS EN MOVIMIENTOS DE INVENTARIO
-- =============================================
ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS sample_customer_id UUID
    REFERENCES customers(id) ON DELETE SET NULL;

-- Constraint: si reason='muestra', sample_customer_id es requerido
ALTER TABLE inventory_movements
  ADD CONSTRAINT chk_muestra_requiere_cliente
  CHECK (reason != 'muestra' OR sample_customer_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS inventory_movements_reason_idx
  ON inventory_movements(reason) WHERE reason IS NOT NULL;

-- =============================================
-- 7. RPC: register_outbound
--    Salida manual de inventario (mermas y muestras)
-- =============================================
CREATE OR REPLACE FUNCTION register_outbound(
  p_product_id       UUID,
  p_quantity         INTEGER,
  p_reason           TEXT,
  p_customer_id      UUID    DEFAULT NULL,
  p_notes            TEXT    DEFAULT NULL,
  p_admin_id         UUID    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_stock INTEGER;
BEGIN
  -- Validar reason
  IF p_reason NOT IN ('merma', 'muestra') THEN
    RAISE EXCEPTION 'Razón inválida: %. Valores permitidos: merma, muestra', p_reason;
  END IF;

  -- Muestra requiere cliente
  IF p_reason = 'muestra' AND p_customer_id IS NULL THEN
    RAISE EXCEPTION 'Se requiere cliente para salidas tipo muestra';
  END IF;

  -- Lock de fila para evitar race conditions
  SELECT stock INTO v_current_stock
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  IF v_current_stock IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado: %', p_product_id;
  END IF;

  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a cero';
  END IF;

  IF v_current_stock < p_quantity THEN
    RAISE EXCEPTION 'Stock insuficiente: disponible %, solicitado %',
      v_current_stock, p_quantity;
  END IF;

  -- Descontar stock
  UPDATE products
  SET stock = stock - p_quantity
  WHERE id = p_product_id;

  -- Registrar movimiento con razón y cliente (si aplica)
  INSERT INTO inventory_movements
    (product_id, type, quantity, reason, sample_customer_id, notes, admin_id)
  VALUES
    (p_product_id, 'outbound', p_quantity, p_reason, p_customer_id, p_notes, p_admin_id);
END;
$$;

-- Índice adicional: delivered_at en orders para queries de reportes
CREATE INDEX IF NOT EXISTS orders_delivered_at_idx ON orders(delivered_at)
  WHERE delivered_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_courier_delivered_idx
  ON orders(courier_id, delivered_at)
  WHERE delivered_at IS NOT NULL AND status IN ('delivered', 'partial');
