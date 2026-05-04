-- =============================================
-- MIGRACION 018: Bodega del domiciliario - Schema
-- =============================================
-- Crea las tablas para la bodega personal del courier:
--   - courier_inventory: stock por (courier, lote)
--   - stock_transfers: movimientos central <-> courier
--   - stock_transfer_lines: detalle de cada transferencia
--   - pending_inventory_adjustments: ajustes pendientes de resolver
--   - delivery_attempts: idempotency keys de confirmDelivery
-- Extiende inventory_movements con courier_id y nuevos types.
-- Agrega UNIQUE (courier_id, date) a cash_closings.
-- =============================================

-- ---------- 1. courier_inventory ----------
CREATE TABLE IF NOT EXISTS courier_inventory (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id          UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  admin_id            UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  product_id          UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  lot_id              UUID NOT NULL REFERENCES product_lots(id) ON DELETE RESTRICT,
  quantity_remaining  INTEGER NOT NULL CHECK (quantity_remaining >= 0),
  received_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT courier_inventory_unique UNIQUE (courier_id, lot_id)
);

CREATE INDEX IF NOT EXISTS courier_inventory_courier_product_idx
  ON courier_inventory(courier_id, product_id)
  WHERE quantity_remaining > 0;
CREATE INDEX IF NOT EXISTS courier_inventory_admin_idx ON courier_inventory(admin_id);
CREATE INDEX IF NOT EXISTS courier_inventory_lot_idx ON courier_inventory(lot_id);
CREATE INDEX IF NOT EXISTS courier_inventory_product_idx ON courier_inventory(product_id);

-- Solo SECURITY DEFINER RPCs pueden mutar quantity_remaining
REVOKE UPDATE (quantity_remaining) ON courier_inventory FROM authenticated;

-- ---------- 2. stock_transfers ----------
CREATE TABLE IF NOT EXISTS stock_transfers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  courier_id      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  kind            TEXT NOT NULL CHECK (kind IN ('dispatch', 'return', 'adjustment')),
  status          TEXT NOT NULL DEFAULT 'completed'
                    CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes           TEXT,
  created_by      UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  cancel_reason   TEXT
);

CREATE INDEX IF NOT EXISTS stock_transfers_admin_idx ON stock_transfers(admin_id);
CREATE INDEX IF NOT EXISTS stock_transfers_courier_idx ON stock_transfers(courier_id);
CREATE INDEX IF NOT EXISTS stock_transfers_status_idx ON stock_transfers(admin_id, status)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS stock_transfers_kind_idx ON stock_transfers(admin_id, kind, created_at DESC);

-- ---------- 3. stock_transfer_lines ----------
CREATE TABLE IF NOT EXISTS stock_transfer_lines (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id         UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  product_id          UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  lot_id              UUID NOT NULL REFERENCES product_lots(id) ON DELETE RESTRICT,
  quantity            INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost_snapshot  NUMERIC(14,2) NOT NULL,
  admin_id            UUID NOT NULL REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stock_transfer_lines_transfer_idx ON stock_transfer_lines(transfer_id);
CREATE INDEX IF NOT EXISTS stock_transfer_lines_lot_idx ON stock_transfer_lines(lot_id);
CREATE INDEX IF NOT EXISTS stock_transfer_lines_admin_idx ON stock_transfer_lines(admin_id);

-- ---------- 4. pending_inventory_adjustments ----------
-- Para casos donde sync offline o reconciliacion deja stock fuera de cuadre.
-- Admin las resuelve manualmente.
CREATE TABLE IF NOT EXISTS pending_inventory_adjustments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  admin_id          UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  order_item_id     UUID REFERENCES order_items(id) ON DELETE SET NULL,
  product_id        UUID NOT NULL REFERENCES products(id),
  quantity          INTEGER NOT NULL CHECK (quantity > 0),
  reason            TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'resolved', 'cancelled')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at       TIMESTAMPTZ,
  resolved_by       UUID REFERENCES users(id),
  resolution_note   TEXT
);

CREATE INDEX IF NOT EXISTS pending_adj_admin_idx ON pending_inventory_adjustments(admin_id, status);
CREATE INDEX IF NOT EXISTS pending_adj_courier_idx ON pending_inventory_adjustments(courier_id);

-- ---------- 5. delivery_attempts (idempotency) ----------
-- UNIQUE (order_id, attempt_key) hace que un reintento del mismo cliente
-- con el mismo key sea idempotente: el server detecta la fila existente
-- y retorna exito sin re-procesar.
CREATE TABLE IF NOT EXISTS delivery_attempts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  attempt_key   TEXT NOT NULL,
  courier_id    UUID NOT NULL REFERENCES users(id),
  admin_id      UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT delivery_attempts_unique UNIQUE (order_id, attempt_key)
);

CREATE INDEX IF NOT EXISTS delivery_attempts_courier_idx ON delivery_attempts(courier_id);

-- ---------- 6. inventory_movements: extender ----------
ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS courier_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS transfer_id UUID REFERENCES stock_transfers(id) ON DELETE SET NULL;

-- Ampliar enum 'type'. Recreamos el CHECK para evitar duplicados.
ALTER TABLE inventory_movements DROP CONSTRAINT IF EXISTS inventory_movements_type_check;
ALTER TABLE inventory_movements ADD CONSTRAINT inventory_movements_type_check
  CHECK (type IN ('inbound', 'outbound', 'return', 'adjustment',
                  'transfer_out', 'transfer_in'));

CREATE INDEX IF NOT EXISTS inventory_movements_courier_idx
  ON inventory_movements(courier_id) WHERE courier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS inventory_movements_transfer_idx
  ON inventory_movements(transfer_id) WHERE transfer_id IS NOT NULL;

-- ---------- 7. cash_closings: UNIQUE (courier_id, date) ----------
-- Solo si no existe ya. Evitamos cierres duplicados del mismo dia.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'cash_closings'
      AND indexname = 'cash_closings_courier_date_unique'
  ) THEN
    CREATE UNIQUE INDEX cash_closings_courier_date_unique
      ON cash_closings(courier_id, date);
  END IF;
END $$;

-- ---------- 8. Trigger: bloquea desactivacion de courier con stock ----------
CREATE OR REPLACE FUNCTION block_courier_deactivation_with_stock()
RETURNS TRIGGER AS $$
DECLARE
  v_total INTEGER;
BEGIN
  -- Solo aplicar si pasa de active=true a active=false y el rol es courier
  IF OLD.active = TRUE AND NEW.active = FALSE AND OLD.role = 'courier' THEN
    SELECT COALESCE(SUM(quantity_remaining), 0) INTO v_total
    FROM courier_inventory
    WHERE courier_id = OLD.id;

    IF v_total > 0 THEN
      RAISE EXCEPTION 'No se puede desactivar al courier: tiene % unidades en su bodega. Solicita devolucion total primero.', v_total;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_block_courier_deactivation ON users;
CREATE TRIGGER trg_block_courier_deactivation
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION block_courier_deactivation_with_stock();

-- ---------- 9. Trigger: bloquea mutacion post-delivered ----------
-- Una vez la orden esta delivered/returned/partial, no se puede modificar
-- order_items.returned_quantity ni status (excepto super_admin).
CREATE OR REPLACE FUNCTION block_order_items_post_delivery()
RETURNS TRIGGER AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status FROM orders WHERE id = NEW.order_id;
  IF v_status IN ('delivered', 'returned', 'partial') THEN
    -- Permitir solo si nada relevante cambia (no-op updates)
    IF (OLD.returned_quantity IS DISTINCT FROM NEW.returned_quantity)
       OR (OLD.returned IS DISTINCT FROM NEW.returned)
       OR (OLD.quantity IS DISTINCT FROM NEW.quantity)
       OR (OLD.unit_price IS DISTINCT FROM NEW.unit_price) THEN
      RAISE EXCEPTION 'No se puede modificar order_items en estado %', v_status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_block_order_items_post_delivery ON order_items;
CREATE TRIGGER trg_block_order_items_post_delivery
  BEFORE UPDATE ON order_items
  FOR EACH ROW EXECUTE FUNCTION block_order_items_post_delivery();

-- ---------- 10. Trigger: actualiza updated_at en courier_inventory ----------
CREATE OR REPLACE FUNCTION refresh_courier_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_refresh_courier_inventory_updated_at ON courier_inventory;
CREATE TRIGGER trg_refresh_courier_inventory_updated_at
  BEFORE UPDATE ON courier_inventory
  FOR EACH ROW EXECUTE FUNCTION refresh_courier_inventory_updated_at();
