-- =============================================
-- MIGRACION 021: Vistas globales de inventario
-- =============================================
-- Vistas para visiones agregadas (central + couriers):
--   - courier_inventory_summary: resumen por (courier, producto)
--     usado por la PWA del courier (suma multi-lote)
--   - inventory_global: visibilidad cross-ubicacion para el admin
--   - inventory_reconciliation: drift detector
-- =============================================

-- ---------- 1. courier_inventory_summary ----------
-- Resumen agregado por producto. Lo usa la PWA del courier para
-- mostrar "Producto X: 12u" sin exponer lotes individuales (salvo
-- vencimiento proximo).
CREATE OR REPLACE VIEW courier_inventory_summary AS
SELECT
  ci.courier_id,
  ci.admin_id,
  ci.product_id,
  p.name        AS product_name,
  p.codigo      AS product_code,
  p.price       AS product_price,
  SUM(ci.quantity_remaining) AS total_units,
  COUNT(*) FILTER (WHERE ci.quantity_remaining > 0) AS lots_count,
  MIN(pl.expires_at) FILTER (WHERE pl.expires_at IS NOT NULL AND ci.quantity_remaining > 0) AS earliest_expiry,
  BOOL_OR(pl.expires_at IS NOT NULL
          AND pl.expires_at < NOW() + INTERVAL '7 days'
          AND ci.quantity_remaining > 0) AS has_expiring_soon
FROM courier_inventory ci
JOIN product_lots pl ON pl.id = ci.lot_id
JOIN products p      ON p.id  = ci.product_id
WHERE ci.quantity_remaining > 0
GROUP BY ci.courier_id, ci.admin_id, ci.product_id, p.name, p.codigo, p.price;

GRANT SELECT ON courier_inventory_summary TO authenticated;

-- ---------- 2. inventory_global ----------
-- Visibilidad agregada para createOrder y dashboards admin.
-- products.stock/stock_available SIGUEN siendo "central"; esta vista
-- agrega la dimension global (central + bodegas courier).
CREATE OR REPLACE VIEW inventory_global AS
SELECT
  p.id          AS product_id,
  p.admin_id,
  p.name,
  p.codigo,
  p.price,
  p.stock           AS warehouse_total_physical,
  p.stock_available AS warehouse_available,
  COALESCE((
    SELECT SUM(ci.quantity_remaining)
    FROM courier_inventory ci
    JOIN product_lots pl ON pl.id = ci.lot_id
    WHERE ci.product_id = p.id
      AND ci.quantity_remaining > 0
      AND pl.active = TRUE
      AND (pl.expires_at IS NULL OR pl.expires_at > NOW())
  ), 0) AS in_couriers_available,
  COALESCE((
    SELECT SUM(ci.quantity_remaining)
    FROM courier_inventory ci
    WHERE ci.product_id = p.id AND ci.quantity_remaining > 0
  ), 0) AS in_couriers_total,
  -- Stock global vendible: central vigente + couriers vigentes
  p.stock_available + COALESCE((
    SELECT SUM(ci.quantity_remaining)
    FROM courier_inventory ci
    JOIN product_lots pl ON pl.id = ci.lot_id
    WHERE ci.product_id = p.id
      AND ci.quantity_remaining > 0
      AND pl.active = TRUE
      AND (pl.expires_at IS NULL OR pl.expires_at > NOW())
  ), 0) AS available_global
FROM products p
WHERE p.active = TRUE;

GRANT SELECT ON inventory_global TO authenticated;

-- ---------- 3. inventory_reconciliation ----------
-- Drift detector: por producto/lote, suma todas las ubicaciones y la
-- compara con quantity_received del lote menos lo consumido.
-- Si drift != 0 hay un problema de integridad.
CREATE OR REPLACE VIEW inventory_reconciliation AS
SELECT
  pl.product_id,
  pl.id AS lot_id,
  pl.lot_number,
  pl.admin_id,
  p.name AS product_name,
  pl.quantity_received,
  pl.quantity_remaining AS warehouse_remaining,
  COALESCE((SELECT SUM(quantity_remaining) FROM courier_inventory
            WHERE lot_id = pl.id), 0) AS in_couriers,
  COALESCE((SELECT SUM(quantity) FROM outbound_lot_allocations
            WHERE lot_id = pl.id), 0) AS allocated_to_orders,
  pl.quantity_received
    - pl.quantity_remaining
    - COALESCE((SELECT SUM(quantity_remaining) FROM courier_inventory
                WHERE lot_id = pl.id), 0)
    - COALESCE((SELECT SUM(quantity) FROM outbound_lot_allocations
                WHERE lot_id = pl.id), 0) AS drift
FROM product_lots pl
JOIN products p ON p.id = pl.product_id
WHERE pl.active = TRUE;

GRANT SELECT ON inventory_reconciliation TO authenticated;
