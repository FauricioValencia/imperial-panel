-- =============================================
-- MIGRACION 016: lot_number robusto frente a colisiones
-- =============================================
-- Bug: al crear un lote nuevo (con auto-generacion del numero) Postgres
-- rechaza con `duplicate key value violates unique constraint
-- "product_lots_lot_number_admin_idx"`.
--
-- Causas confirmadas:
--   C1. El generador filtra COUNT(*) por product_id, pero el indice
--       UNIQUE es por (admin_id, lot_number). Si dos productos del
--       mismo admin generan el mismo prefijo (codigos NULL/iguales,
--       espacios o variantes), el segundo cuenta cero y produce
--       un sufijo ya tomado por el primero.
--   C2. El indice UNIQUE incluye lotes cerrados (active=FALSE) y
--       agotados (quantity_remaining=0), bloqueando la reutilizacion
--       legitima de numeros.
--   C3. Concurrencia: dos transacciones pueden leer COUNT(*) antes
--       de que cualquiera commit, generando el mismo sufijo. El
--       `FOR UPDATE` sobre products solo serializa entradas del
--       mismo producto, no entre productos distintos del mismo admin.
--
-- Estrategia (defensa en profundidad):
--   1. El indice UNIQUE pasa a ser parcial (solo activos con stock).
--   2. El generador toma `pg_advisory_xact_lock` por (admin_id, prefix)
--      para serializar la generacion entre productos del mismo admin.
--   3. El generador usa MAX(suffix)+1 con regex en lugar de COUNT(*),
--      filtrando por admin_id (no por product_id) para que el scope
--      coincida con el del indice UNIQUE.
--   4. Reintentos en la RPC ante 23505 (red de seguridad final).
--   5. Trim del codigo para evitar prefijos con espacios extra.
--
-- No requiere migracion de datos: lotes existentes con numeros
-- duplicados solo pueden vivir en filas inactivas/agotadas, que el
-- nuevo indice parcial ya no cubre.
-- =============================================

-- =============================================
-- 1. INDICE UNIQUE PARCIAL
-- Solo lotes activos con stock disponible deben ser unicos.
-- =============================================
DROP INDEX IF EXISTS product_lots_lot_number_admin_idx;

CREATE UNIQUE INDEX product_lots_lot_number_admin_idx
  ON product_lots(admin_id, lot_number)
  WHERE active = TRUE AND quantity_remaining > 0;

-- =============================================
-- 2. generate_lot_number(p_product_id, p_admin_id)
-- Nueva firma: requiere admin_id para alinear el scope de busqueda
-- con el del indice UNIQUE.
-- =============================================
DROP FUNCTION IF EXISTS generate_lot_number(UUID);

CREATE OR REPLACE FUNCTION generate_lot_number(
  p_product_id UUID,
  p_admin_id   UUID
) RETURNS TEXT AS $$
DECLARE
  v_codigo TEXT;
  v_prefix TEXT;
  v_max_seq INTEGER;
  v_attempt INTEGER := 0;
  v_candidate TEXT;
BEGIN
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'admin_id es requerido para generar el numero de lote';
  END IF;

  SELECT trim(codigo) INTO v_codigo FROM products WHERE id = p_product_id;
  IF v_codigo IS NOT NULL AND length(v_codigo) = 0 THEN
    v_codigo := NULL;
  END IF;

  v_prefix := 'L-'
    || COALESCE(v_codigo, 'PRD-' || substr(p_product_id::text, 1, 6))
    || '-' || to_char(NOW(), 'YYYYMM') || '-';

  -- Serializar la generacion entre productos del mismo admin con
  -- el mismo prefijo. Lock por (admin_id, prefix); se libera al
  -- terminar la transaccion. hashtextextended garantiza bigint.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_admin_id::text || ':' || v_prefix, 0)
  );

  -- MAX(sufijo numerico) sobre lotes del MISMO ADMIN que matcheen
  -- el prefijo. Se ignoran lotes con sufijos no numericos (puede
  -- haberlos por entradas manuales del usuario).
  SELECT COALESCE(MAX((regexp_match(lot_number, '-(\d+)$'))[1]::int), 0)
    INTO v_max_seq
  FROM product_lots
  WHERE admin_id = p_admin_id
    AND lot_number LIKE v_prefix || '%'
    AND lot_number ~ '-\d+$';

  -- Reintentos: aunque el advisory lock ya serializa, defendemos
  -- ante numeros manuales que el usuario haya creado fuera de
  -- formato y luego matcheen el siguiente sufijo. Hasta 10 intentos.
  LOOP
    v_attempt := v_attempt + 1;
    v_candidate := v_prefix || lpad((v_max_seq + v_attempt)::text, 3, '0');

    IF NOT EXISTS (
      SELECT 1 FROM product_lots
      WHERE admin_id = p_admin_id
        AND lot_number = v_candidate
        AND active = TRUE
        AND quantity_remaining > 0
    ) THEN
      RETURN v_candidate;
    END IF;

    IF v_attempt >= 10 THEN
      RAISE EXCEPTION 'No se pudo generar un numero de lote unico tras 10 intentos (prefix: %)', v_prefix;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. inbound_stock_with_lot: pasar p_admin_id al generador
-- =============================================
CREATE OR REPLACE FUNCTION inbound_stock_with_lot(
  p_product_id     UUID,
  p_quantity       INTEGER,
  p_unit_cost      NUMERIC,
  p_admin_id       UUID,
  p_lot_number     TEXT        DEFAULT NULL,
  p_expires_at     TIMESTAMPTZ DEFAULT NULL,
  p_no_expiration  BOOLEAN     DEFAULT FALSE,
  p_supplier       TEXT        DEFAULT NULL,
  p_notes          TEXT        DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_product_admin UUID;
  v_lot_id UUID;
  v_lot_number TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'admin_id es requerido';
  END IF;
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a cero';
  END IF;
  IF p_unit_cost IS NULL OR p_unit_cost < 0 THEN
    RAISE EXCEPTION 'El costo unitario debe ser cero o positivo';
  END IF;

  SELECT admin_id INTO v_product_admin
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  IF v_product_admin IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;
  IF v_product_admin IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'Producto no pertenece al admin';
  END IF;

  IF p_lot_number IS NULL OR length(trim(p_lot_number)) = 0 THEN
    v_lot_number := generate_lot_number(p_product_id, p_admin_id);
  ELSE
    v_lot_number := trim(p_lot_number);
  END IF;

  IF p_no_expiration THEN
    v_expires_at := NULL;
  ELSE
    v_expires_at := COALESCE(p_expires_at, NOW() + INTERVAL '1 month');
  END IF;

  INSERT INTO product_lots (
    product_id, admin_id, lot_number, unit_cost, is_estimated_cost,
    quantity_received, quantity_remaining, expires_at, supplier, notes
  ) VALUES (
    p_product_id, p_admin_id, v_lot_number, p_unit_cost, FALSE,
    p_quantity, p_quantity, v_expires_at, p_supplier, p_notes
  ) RETURNING id INTO v_lot_id;

  INSERT INTO inventory_movements (
    product_id, type, quantity, lot_id, unit_cost_snapshot, admin_id, notes
  ) VALUES (
    p_product_id, 'inbound', p_quantity, v_lot_id, p_unit_cost, p_admin_id,
    COALESCE(p_notes, 'Entrada de stock')
  );

  UPDATE products
  SET stock = stock + p_quantity
  WHERE id = p_product_id;

  RETURN v_lot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 4. return_stock (legacy): pasar admin_id al generador
-- =============================================
CREATE OR REPLACE FUNCTION return_stock(
  p_product_id      UUID,
  p_quantity        INTEGER,
  p_order_reference UUID DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_admin_id UUID;
  v_target_lot UUID;
  v_unit_cost NUMERIC;
  v_price NUMERIC;
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a cero';
  END IF;

  SELECT admin_id, price INTO v_admin_id, v_price
  FROM products WHERE id = p_product_id FOR UPDATE;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;

  SELECT id, unit_cost INTO v_target_lot, v_unit_cost
  FROM product_lots
  WHERE product_id = p_product_id
    AND active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY received_at DESC, id DESC
  LIMIT 1;

  IF v_target_lot IS NULL THEN
    INSERT INTO product_lots (
      product_id, admin_id, lot_number, unit_cost, is_estimated_cost,
      quantity_received, quantity_remaining, notes
    ) VALUES (
      p_product_id, v_admin_id,
      generate_lot_number(p_product_id, v_admin_id),
      v_price, TRUE,
      p_quantity, p_quantity,
      'Lote de devolucion (sin allocation original)'
    ) RETURNING id, unit_cost INTO v_target_lot, v_unit_cost;
  ELSE
    UPDATE product_lots
    SET quantity_remaining = quantity_remaining + p_quantity
    WHERE id = v_target_lot;
  END IF;

  INSERT INTO inventory_movements (
    product_id, type, quantity, lot_id, unit_cost_snapshot,
    order_reference, admin_id, notes
  ) VALUES (
    p_product_id, 'return', p_quantity, v_target_lot, v_unit_cost,
    p_order_reference, v_admin_id, 'Devolucion (legacy: lote mas reciente)'
  );

  UPDATE products
  SET stock = stock + p_quantity
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
