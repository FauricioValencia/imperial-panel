-- =============================================
-- MIGRACION 010: Backfill de Lote 1 para productos existentes (atomico)
-- =============================================
-- Crea "Lote 1" para cada producto activo con stock > 0:
--   - lot_number: L-{codigo|prdshortid}-{YYYYMM}-001
--   - unit_cost: products.price (provisional, marcado is_estimated_cost=TRUE)
--   - quantity_received / quantity_remaining: products.stock actual
--   - received_at: products.created_at (mantiene el orden FIFO real)
--   - expires_at: NOW() + 1 mes
--
-- Productos con stock = 0 NO reciben lote: cuando entre stock real,
-- el inbound RPC creara un lote con costo correcto.
--
-- Productos inactivos NO se migran: si reactivan, deberan crear lote.
--
-- Movimientos pre-migracion (sin lot_id) NO se vinculan: imposible
-- reconstruir con certeza a que lote pertenecian. La nullability del
-- FK lo cubre.
--
-- INVARIANTE: tras esta migracion, para todo producto activo con
-- stock > 0: SUM(lots.quantity_remaining) = products.stock.
-- Si la asercion final falla, la transaccion entera hace rollback.
-- =============================================

DO $$
DECLARE
  rec RECORD;
  v_total_diff INTEGER;
  v_lots_created INTEGER := 0;
BEGIN
  FOR rec IN
    SELECT id, codigo, admin_id, stock, price, created_at
    FROM products
    WHERE active = TRUE AND stock > 0
    ORDER BY created_at ASC
  LOOP
    INSERT INTO product_lots (
      product_id,
      admin_id,
      lot_number,
      unit_cost,
      is_estimated_cost,
      quantity_received,
      quantity_remaining,
      received_at,
      expires_at,
      notes
    ) VALUES (
      rec.id,
      rec.admin_id,
      'L-' || COALESCE(rec.codigo, 'PRD-' || substr(rec.id::text, 1, 6))
            || '-' || to_char(NOW(), 'YYYYMM') || '-001',
      rec.price,
      TRUE,
      rec.stock,
      rec.stock,
      rec.created_at,
      NOW() + INTERVAL '1 month',
      'Lote inicial generado por migracion 010 (costo estimado, edita para registrar el costo real)'
    );
    v_lots_created := v_lots_created + 1;
  END LOOP;

  -- Refrescar stock_available para todos los productos (los triggers
  -- ya dispararon en cada INSERT, pero lo hacemos explicito para
  -- productos con stock = 0 que no recibieron lote).
  PERFORM recompute_all_stock_available();

  -- Asercion de invariante: para productos con stock > 0, el total
  -- de quantity_remaining debe ser igual a products.stock.
  SELECT COALESCE(SUM(p.stock), 0) - COALESCE(SUM(l.quantity_remaining), 0)
    INTO v_total_diff
  FROM products p
  LEFT JOIN product_lots l ON l.product_id = p.id AND l.active = TRUE
  WHERE p.active = TRUE AND p.stock > 0;

  IF v_total_diff <> 0 THEN
    RAISE EXCEPTION 'Backfill invariant violation: products.stock - lots.quantity_remaining = % (debe ser 0). Rolling back.', v_total_diff;
  END IF;

  RAISE NOTICE 'Migracion 010 completada: % lotes iniciales creados', v_lots_created;
END $$;
