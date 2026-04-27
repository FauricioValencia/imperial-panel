-- =============================================
-- MIGRACION 009: Inventario por lotes (DDL)
-- =============================================
-- Introduce manejo de inventario por lotes con costo unitario por lote,
-- FIFO automatico (omite vencidos), trazabilidad de devoluciones por
-- order_item via tabla outbound_lot_allocations, y proteccion de
-- invariantes via REVOKE + RPCs SECURITY DEFINER unicas.
--
-- Esta migracion solo agrega estructura. El backfill va en 010 y los
-- RPCs en 011. Es seguro correrla sin afectar codigo existente:
--   - inventory_movements.lot_id queda NULLABLE (movimientos viejos
--     siguen siendo validos)
--   - products.stock_available se inicializa en 0 y se sincroniza por
--     trigger; 010 lo deja consistente con products.stock
-- =============================================

-- =============================================
-- 1. TABLA product_lots
-- =============================================
CREATE TABLE product_lots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  admin_id            UUID NOT NULL REFERENCES auth.users(id),
  lot_number          TEXT NOT NULL,
  unit_cost           NUMERIC(14,2) NOT NULL CHECK (unit_cost >= 0),
  is_estimated_cost   BOOLEAN NOT NULL DEFAULT FALSE,
  quantity_received   INTEGER NOT NULL CHECK (quantity_received > 0),
  quantity_remaining  INTEGER NOT NULL CHECK (quantity_remaining >= 0),
  received_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 month'),
  supplier            TEXT,
  notes               TEXT,
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_remaining_le_received CHECK (quantity_remaining <= quantity_received),
  CONSTRAINT chk_expires_after_received CHECK (expires_at IS NULL OR expires_at >= received_at)
);

-- Numero de lote unico por tenant (admin)
CREATE UNIQUE INDEX product_lots_lot_number_admin_idx
  ON product_lots(admin_id, lot_number);

-- Indice partial clave para FIFO eficiente: solo lotes con stock disponible
CREATE INDEX product_lots_fifo_idx
  ON product_lots(product_id, received_at, id)
  WHERE quantity_remaining > 0;

CREATE INDEX product_lots_admin_idx ON product_lots(admin_id);

-- Indice partial para alertas de vencimiento
CREATE INDEX product_lots_expires_idx
  ON product_lots(admin_id, expires_at)
  WHERE quantity_remaining > 0 AND active = TRUE;

ALTER TABLE product_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_full_product_lots" ON product_lots
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "admin_full_product_lots" ON product_lots
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin' AND admin_id = auth.uid());

CREATE POLICY "courier_read_product_lots" ON product_lots
  FOR SELECT TO authenticated
  USING (get_user_role() = 'courier' AND admin_id = get_admin_id());

-- Defensa contra mutacion directa: solo SECURITY DEFINER RPCs pueden
-- modificar quantity_remaining / quantity_received. Sin esto, un admin
-- con cliente Supabase podria romper la invariante stock<->lots.
REVOKE UPDATE (quantity_remaining, quantity_received) ON product_lots FROM authenticated;

-- =============================================
-- 2. TABLA outbound_lot_allocations
-- Truth-source para devoluciones FIFO multi-lote.
-- Mapea consumo lote -> order_item para que un return parcial sepa
-- exactamente a que lote regresar.
-- =============================================
CREATE TABLE outbound_lot_allocations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id       UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  lot_id              UUID NOT NULL REFERENCES product_lots(id) ON DELETE RESTRICT,
  quantity            INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost_snapshot  NUMERIC(14,2) NOT NULL,
  admin_id            UUID NOT NULL REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX outbound_lot_allocations_order_item_idx ON outbound_lot_allocations(order_item_id);
CREATE INDEX outbound_lot_allocations_lot_idx        ON outbound_lot_allocations(lot_id);
CREATE INDEX outbound_lot_allocations_admin_idx      ON outbound_lot_allocations(admin_id);

ALTER TABLE outbound_lot_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_full_allocations" ON outbound_lot_allocations
  FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "admin_full_allocations" ON outbound_lot_allocations
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin' AND admin_id = auth.uid());

CREATE POLICY "courier_read_allocations" ON outbound_lot_allocations
  FOR SELECT TO authenticated
  USING (get_user_role() = 'courier' AND admin_id = get_admin_id());

-- =============================================
-- 3. ALTER inventory_movements
-- =============================================
ALTER TABLE inventory_movements
  ADD COLUMN lot_id UUID REFERENCES product_lots(id) ON DELETE RESTRICT,
  ADD COLUMN unit_cost_snapshot NUMERIC(14,2),
  ADD COLUMN order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL;

CREATE INDEX inventory_movements_lot_idx ON inventory_movements(lot_id) WHERE lot_id IS NOT NULL;
CREATE INDEX inventory_movements_order_item_idx ON inventory_movements(order_item_id) WHERE order_item_id IS NOT NULL;

-- =============================================
-- 4. ALTER products: stock_available
-- products.stock = total fisico (incluye vencidos)
-- products.stock_available = vigente (lo que se puede vender)
-- Mantenido por trigger en product_lots y por cron diario.
-- =============================================
ALTER TABLE products ADD COLUMN stock_available INTEGER NOT NULL DEFAULT 0;
CREATE INDEX products_stock_available_idx ON products(stock_available);

-- =============================================
-- 5. VISTA product_lots_courier
-- Postgres no soporta RLS por columna. Esta vista expone solo los
-- campos que un courier necesita ver, ocultando unit_cost (info
-- financiera sensible), supplier y notes.
-- =============================================
CREATE OR REPLACE VIEW product_lots_courier AS
SELECT
  id,
  product_id,
  admin_id,
  lot_number,
  quantity_received,
  quantity_remaining,
  received_at,
  expires_at,
  active,
  created_at
FROM product_lots
WHERE admin_id = get_admin_id();

GRANT SELECT ON product_lots_courier TO authenticated;

-- =============================================
-- 6. AUDIT TRIGGERS
-- =============================================
CREATE TRIGGER audit_product_lots
  AFTER INSERT OR UPDATE OR DELETE ON product_lots
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER audit_outbound_lot_allocations
  AFTER INSERT OR UPDATE OR DELETE ON outbound_lot_allocations
  FOR EACH ROW EXECUTE FUNCTION log_audit();

-- =============================================
-- 7. TRIGGER refresh_product_stock_available
-- Mantiene products.stock_available sincronizado con la suma de
-- quantity_remaining de lotes vigentes (no vencidos, activos).
-- =============================================
CREATE OR REPLACE FUNCTION refresh_product_stock_available()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id UUID;
BEGIN
  v_product_id := COALESCE(NEW.product_id, OLD.product_id);

  UPDATE products
  SET stock_available = COALESCE((
    SELECT SUM(quantity_remaining)
    FROM product_lots
    WHERE product_id = v_product_id
      AND quantity_remaining > 0
      AND active = TRUE
      AND (expires_at IS NULL OR expires_at > NOW())
  ), 0)
  WHERE id = v_product_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_refresh_stock_available
  AFTER INSERT OR UPDATE OR DELETE ON product_lots
  FOR EACH ROW EXECUTE FUNCTION refresh_product_stock_available();

-- =============================================
-- 8. recompute_all_stock_available()
-- Llamada por cron diario para capturar lotes recien vencidos
-- (los triggers solo se disparan en mutacion, no por paso del tiempo).
-- =============================================
CREATE OR REPLACE FUNCTION recompute_all_stock_available()
RETURNS INTEGER AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  UPDATE products p
  SET stock_available = COALESCE((
    SELECT SUM(pl.quantity_remaining)
    FROM product_lots pl
    WHERE pl.product_id = p.id
      AND pl.quantity_remaining > 0
      AND pl.active = TRUE
      AND (pl.expires_at IS NULL OR pl.expires_at > NOW())
  ), 0);
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
