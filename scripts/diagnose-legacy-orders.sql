-- =============================================
-- Diagnostico de pedidos legacy con stock insuficiente en bodega del courier
-- =============================================
-- Uso: copiar bloques al SQL Editor de Supabase. Reemplazar 0740b7b5 por el
-- prefijo del id del pedido en cuestion (o usar el bloque B para listar todos
-- los candidatos sin filtrar).
-- =============================================

-- A. Estado de un pedido especifico (ajustar prefijo)
SELECT id, status, courier_id, admin_id, legacy_courier_deduction,
       assigned_at, created_at
FROM orders
WHERE id::text LIKE '0740b7b5%';

-- B. Todos los pedidos legacy activos con su shortfall por producto.
--    Lista accionable: el que tenga in_courier < quantity_pendiente y
--    available_global >= quantity_pendiente es candidato a migrar al flujo central.
SELECT
  o.id              AS order_id,
  o.status          AS order_status,
  o.courier_id,
  oi.id             AS order_item_id,
  oi.product_id,
  p.name            AS product_name,
  oi.quantity - COALESCE(oi.returned_quantity, 0)        AS qty_pendiente,
  COALESCE(ci_sum.qty_in_courier, 0)                     AS in_courier,
  COALESCE(ig.warehouse_available, 0)                    AS in_central,
  COALESCE(ig.available_global, 0)                       AS available_global
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN products p     ON p.id = oi.product_id
LEFT JOIN (
  SELECT courier_id, product_id, SUM(quantity_remaining) AS qty_in_courier
  FROM courier_inventory
  GROUP BY courier_id, product_id
) ci_sum ON ci_sum.courier_id = o.courier_id AND ci_sum.product_id = oi.product_id
LEFT JOIN inventory_global ig ON ig.product_id = oi.product_id
WHERE o.legacy_courier_deduction = TRUE
  AND o.status IN ('assigned', 'in_transit')
ORDER BY o.created_at;

-- C. Detalle del courier_inventory para los productos del pedido
SELECT ci.product_id, p.name, ci.lot_id, pl.lot_number,
       ci.quantity_remaining, pl.expires_at,
       (pl.expires_at IS NOT NULL AND pl.expires_at < NOW()) AS lote_vencido
FROM courier_inventory ci
JOIN products p      ON p.id  = ci.product_id
JOIN product_lots pl ON pl.id = ci.lot_id
WHERE ci.courier_id = (SELECT courier_id FROM orders WHERE id::text LIKE '0740b7b5%')
  AND ci.product_id IN (
    SELECT product_id FROM order_items
    WHERE order_id = (SELECT id FROM orders WHERE id::text LIKE '0740b7b5%')
  );

-- D. Lotes vigentes en central para los productos del pedido
SELECT pl.product_id, p.name, pl.id AS lot_id, pl.lot_number,
       pl.quantity_remaining, pl.expires_at
FROM product_lots pl
JOIN products p ON p.id = pl.product_id
WHERE pl.product_id IN (
        SELECT product_id FROM order_items
        WHERE order_id = (SELECT id FROM orders WHERE id::text LIKE '0740b7b5%')
      )
  AND pl.active = TRUE
  AND pl.quantity_remaining > 0
ORDER BY pl.received_at;

-- E. Movimientos recientes del courier (ultimos 30) para auditar consumos previos
SELECT created_at, type, quantity, product_id, lot_id, order_reference, notes
FROM inventory_movements
WHERE courier_id = (SELECT courier_id FROM orders WHERE id::text LIKE '0740b7b5%')
ORDER BY created_at DESC
LIMIT 30;

-- F. delivery_attempts residuales del pedido (idempotency keys quemados)
SELECT id, attempt_key, courier_id, created_at
FROM delivery_attempts
WHERE order_id = (SELECT id FROM orders WHERE id::text LIKE '0740b7b5%')
ORDER BY created_at;
