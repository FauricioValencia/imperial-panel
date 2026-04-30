-- =============================================
-- MIGRACION 013: Vistas de costeo y rentabilidad por lote
-- =============================================
-- Agrega capa de analisis financiero por lote SIN tocar la logica
-- transaccional ya estabilizada en 009-012:
--   1. product_lots.suggested_price: precio sugerido por lote, solo
--      para preview de margen en UX. NO valida ni se usa en ventas
--      (el precio real vive en order_items.unit_price).
--   2. lot_profitability_view: margen real por allocation (consumo
--      ya entregado). Fuente unica de verdad para reportes.
--   3. current_inventory_valuation: valor del inventario vigente y
--      Costo Promedio Ponderado (CPP) por producto.
--   4. outbound_lot_allocations_courier: vista filtrada que NO expone
--      unit_cost_snapshot al rol courier (info financiera sensible).
--
-- Es aditiva y reversible: no modifica datos ni RPCs existentes.
-- =============================================

-- =============================================
-- 1. ALTER product_lots: suggested_price
-- Precio sugerido al recibir el lote. Permite a la UX mostrar margen
-- estimado sin acoplar el calculo a una venta real. NO se usa en
-- deduct_stock ni en ningun flujo transaccional.
-- =============================================
ALTER TABLE product_lots
  ADD COLUMN suggested_price NUMERIC(14,2)
    CHECK (suggested_price IS NULL OR suggested_price >= 0);

-- =============================================
-- 2. VISTA lot_profitability_view
-- Margen real por allocation: precio venta del item vs costo snapshot
-- del lote. Solo considera ordenes con status final (delivered o
-- partial), porque allocations en pending/assigned/in_transit aun
-- pueden revertirse y distorsionarian el reporte.
--
-- Una venta multi-lote produce N filas (una por allocation), cada una
-- con su margen propio. El consumidor agrega como necesite (por
-- producto, por mes, por lote).
--
-- Nota sobre devoluciones: return_stock_by_item DELETE/UPDATE las
-- allocations, asi que quantity aqui ya refleja lo netamente vendido.
-- =============================================
CREATE OR REPLACE VIEW lot_profitability_view AS
SELECT
  a.id                                                AS allocation_id,
  a.lot_id,
  pl.lot_number,
  pl.product_id,
  p.name                                              AS product_name,
  p.codigo                                            AS product_code,
  a.order_item_id,
  oi.order_id,
  o.status                                            AS order_status,
  o.delivered_at,
  a.admin_id,
  a.quantity                                          AS quantity_sold,
  a.unit_cost_snapshot,
  oi.unit_price,
  (oi.unit_price - a.unit_cost_snapshot)              AS unit_margin,
  (a.quantity * a.unit_cost_snapshot)                 AS total_cost,
  (a.quantity * oi.unit_price)                        AS total_revenue,
  (a.quantity * (oi.unit_price - a.unit_cost_snapshot)) AS total_margin,
  CASE
    WHEN a.unit_cost_snapshot > 0
      THEN ROUND(((oi.unit_price - a.unit_cost_snapshot) / a.unit_cost_snapshot) * 100, 2)
    ELSE NULL
  END                                                 AS margin_percent,
  a.created_at                                        AS allocated_at
FROM outbound_lot_allocations a
JOIN product_lots pl ON pl.id = a.lot_id
JOIN products      p  ON p.id  = pl.product_id
JOIN order_items   oi ON oi.id = a.order_item_id
JOIN orders        o  ON o.id  = oi.order_id
WHERE o.status IN ('delivered', 'partial');

GRANT SELECT ON lot_profitability_view TO authenticated;

-- =============================================
-- 3. VISTA current_inventory_valuation
-- Valor del inventario vigente y CPP por producto. Solo considera
-- lotes asignables (active=TRUE, quantity_remaining>0, no vencidos).
-- Los vencidos se excluyen porque no son convertibles a ingresos
-- aunque sean stock fisico contable; reportarlos requiere otra vista.
--
-- CPP = SUM(quantity_remaining * unit_cost) / SUM(quantity_remaining)
-- Ponderado por unidades restantes, no por unidades originales.
-- =============================================
CREATE OR REPLACE VIEW current_inventory_valuation AS
SELECT
  pl.product_id,
  p.name                                              AS product_name,
  p.codigo                                            AS product_code,
  pl.admin_id,
  COUNT(*)                                            AS active_lots_count,
  SUM(pl.quantity_remaining)                          AS total_units_available,
  SUM(pl.quantity_remaining * pl.unit_cost)           AS total_inventory_value,
  CASE
    WHEN SUM(pl.quantity_remaining) > 0
      THEN ROUND(
        SUM(pl.quantity_remaining * pl.unit_cost)::NUMERIC
        / SUM(pl.quantity_remaining), 2
      )
    ELSE NULL
  END                                                 AS weighted_avg_cost,
  MIN(pl.unit_cost)                                   AS min_lot_cost,
  MAX(pl.unit_cost)                                   AS max_lot_cost
FROM product_lots pl
JOIN products p ON p.id = pl.product_id
WHERE pl.active = TRUE
  AND pl.quantity_remaining > 0
  AND (pl.expires_at IS NULL OR pl.expires_at > NOW())
GROUP BY pl.product_id, p.name, p.codigo, pl.admin_id;

GRANT SELECT ON current_inventory_valuation TO authenticated;

-- =============================================
-- 4. VISTA outbound_lot_allocations_courier
-- Postgres no soporta RLS por columna. El courier necesita poder
-- consultar allocations (para conciliar entregas) pero NO debe ver
-- unit_cost_snapshot. Esta vista expone solo campos no financieros
-- y filtra por su admin. La policy de SELECT en la tabla base se
-- mantiene (la usan admin/super_admin), pero al courier se le
-- revoca SELECT directo en la tabla.
-- =============================================
CREATE OR REPLACE VIEW outbound_lot_allocations_courier AS
SELECT
  id,
  order_item_id,
  lot_id,
  quantity,
  admin_id,
  created_at
FROM outbound_lot_allocations
WHERE admin_id = get_admin_id();

GRANT SELECT ON outbound_lot_allocations_courier TO authenticated;

-- =============================================
-- 5. RESTRICTIVE POLICY: bloquear SELECT directo del courier sobre
-- outbound_lot_allocations
-- La policy "courier_read_allocations" (PERMISSIVE) permitia al
-- courier leer todas las columnas, incluyendo unit_cost_snapshot.
-- Esta RESTRICTIVE se AND-ea: si el rol es courier, niega SELECT
-- a la tabla base. El courier debe usar la vista courier-safe.
-- admin/super_admin no se ven afectados (rol distinto).
-- =============================================
CREATE POLICY "block_courier_select_allocations" ON outbound_lot_allocations
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (get_user_role() <> 'courier');
