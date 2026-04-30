-- =============================================
-- MIGRACION 014: Vista monthly_cogs_by_product
-- =============================================
-- Reporte contable: COGS y revenue por producto y mes calendario.
-- Misma fuente que lot_profitability_view (allocations + items + orders
-- entregadas/parciales) pero agregado por (admin, producto, mes).
--
-- Uso esperado:
--   - Cierre de mes: total COGS y revenue por producto en periodo
--   - Detectar drift entre margen estimado y margen real
--   - Export CSV via exportLotProfitability(period)
--
-- Indexa por delivered_at en order_items.created_at? No: orders.delivered_at
-- ya esta indexada en migraciones previas. Esta vista es agregada y se
-- recalcula bajo demanda; si el volumen crece >100k allocations/mes,
-- considerar materialized view con refresh diario.
-- =============================================

CREATE OR REPLACE VIEW monthly_cogs_by_product AS
SELECT
  pl.admin_id,
  pl.product_id,
  p.name                                               AS product_name,
  p.codigo                                             AS product_code,
  date_trunc('month', o.delivered_at)::date            AS month,
  SUM(a.quantity)                                      AS units_sold,
  SUM(a.quantity * a.unit_cost_snapshot)               AS total_cogs,
  SUM(a.quantity * oi.unit_price)                      AS total_revenue,
  SUM(a.quantity * (oi.unit_price - a.unit_cost_snapshot)) AS total_margin,
  CASE
    WHEN SUM(a.quantity * oi.unit_price) > 0
      THEN ROUND(
        (SUM(a.quantity * (oi.unit_price - a.unit_cost_snapshot))
         / SUM(a.quantity * oi.unit_price)) * 100, 2
      )
    ELSE NULL
  END                                                  AS margin_percent,
  COUNT(DISTINCT a.order_item_id)                      AS items_count,
  COUNT(DISTINCT oi.order_id)                          AS orders_count
FROM outbound_lot_allocations a
JOIN product_lots pl ON pl.id = a.lot_id
JOIN products      p  ON p.id  = pl.product_id
JOIN order_items   oi ON oi.id = a.order_item_id
JOIN orders        o  ON o.id  = oi.order_id
WHERE o.status IN ('delivered', 'partial')
  AND o.delivered_at IS NOT NULL
GROUP BY pl.admin_id, pl.product_id, p.name, p.codigo,
         date_trunc('month', o.delivered_at);

GRANT SELECT ON monthly_cogs_by_product TO authenticated;
