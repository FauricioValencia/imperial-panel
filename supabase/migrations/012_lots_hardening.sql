-- =============================================
-- MIGRACION 012: Endurecimiento de inventario por lotes
-- =============================================
-- Cierra brechas detectadas tras auditoria post 009-011:
--   1. RESTRICTIVE policies que bloquean DELETE en product_lots,
--      outbound_lot_allocations e inventory_movements (un admin
--      distraido podia romper allocations con un DELETE directo).
--   2. RPC close_lot: cierre manual de lote con bloqueo si hay
--      ordenes activas, override force=TRUE con razon obligatoria.
--   3. RPC update_lot_metadata: edicion controlada de metadatos
--      (supplier, notes, expires_at, lot_number). NO permite tocar
--      unit_cost, quantity_received ni quantity_remaining.
--   4. Vista product_lots_courier: filtrar agotados/inactivos para
--      no exponer al courier lotes que no son seleccionables.
-- =============================================

-- =============================================
-- 1. RESTRICTIVE POLICIES: bloqueo total de DELETE
-- Las policies PERMISSIVE existentes se OR-ean entre si, asi que un
-- "FOR DELETE USING (FALSE)" permisivo no sirve. Una policy
-- RESTRICTIVE se AND-ea con todo lo demas: si esta bloquea, nadie
-- borra (ni siquiera el admin via cliente directo). Las RPCs
-- SECURITY DEFINER siguen pudiendo borrar (corren como owner).
-- =============================================
CREATE POLICY "block_delete_product_lots" ON product_lots
  AS RESTRICTIVE
  FOR DELETE TO authenticated
  USING (FALSE);

CREATE POLICY "block_delete_outbound_lot_allocations" ON outbound_lot_allocations
  AS RESTRICTIVE
  FOR DELETE TO authenticated
  USING (FALSE);

CREATE POLICY "block_delete_inventory_movements" ON inventory_movements
  AS RESTRICTIVE
  FOR DELETE TO authenticated
  USING (FALSE);

-- =============================================
-- 2. RPC close_lot
-- Cierre logico de lote (active = FALSE). Bloquea si hay ordenes
-- activas (pending/assigned/in_transit) que dependan del lote.
-- Permite override con p_force = TRUE y p_reason obligatorio:
-- caso real es lote contaminado descubierto que requiere para de
-- ventas inmediato pese a ordenes en curso.
--
-- El stock fisico (products.stock) NO se ajusta: las unidades del
-- lote siguen existiendo, solo dejan de ser asignables por FIFO.
-- products.stock_available SI se recalcula via trigger.
-- =============================================
CREATE OR REPLACE FUNCTION close_lot(
  p_lot_id   UUID,
  p_admin_id UUID,
  p_force    BOOLEAN DEFAULT FALSE,
  p_reason   TEXT    DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_lot_admin    UUID;
  v_lot_active   BOOLEAN;
  v_active_count INTEGER;
  v_audit_note   TEXT;
BEGIN
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'admin_id es requerido';
  END IF;

  SELECT admin_id, active INTO v_lot_admin, v_lot_active
  FROM product_lots WHERE id = p_lot_id FOR UPDATE;

  IF v_lot_admin IS NULL THEN
    RAISE EXCEPTION 'Lote no encontrado';
  END IF;
  IF v_lot_admin IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'Lote no pertenece al admin';
  END IF;
  IF NOT v_lot_active THEN
    RAISE EXCEPTION 'El lote ya esta cerrado';
  END IF;

  -- Contar allocations en ordenes activas (no entregadas, no devueltas)
  SELECT COUNT(*) INTO v_active_count
  FROM outbound_lot_allocations a
  JOIN order_items oi ON oi.id = a.order_item_id
  JOIN orders o ON o.id = oi.order_id
  WHERE a.lot_id = p_lot_id
    AND o.status IN ('pending', 'assigned', 'in_transit');

  IF v_active_count > 0 THEN
    IF NOT p_force THEN
      RAISE EXCEPTION 'No se puede cerrar el lote: hay % asignaciones en pedidos activos. Use force=TRUE con razon para forzar.', v_active_count;
    END IF;
    IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
      RAISE EXCEPTION 'force=TRUE requiere indicar la razon del cierre';
    END IF;
  END IF;

  -- Construir nota de auditoria que se anexa a notes del lote
  IF p_force AND v_active_count > 0 THEN
    v_audit_note := format(
      '[CIERRE FORZADO %s] %s afectaba %s pedido(s) activo(s).',
      to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
      p_reason,
      v_active_count
    );
  ELSIF p_reason IS NOT NULL AND length(trim(p_reason)) > 0 THEN
    v_audit_note := format(
      '[CIERRE %s] %s',
      to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
      p_reason
    );
  ELSE
    v_audit_note := format('[CIERRE %s]', to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS'));
  END IF;

  UPDATE product_lots
  SET active = FALSE,
      notes = CASE
        WHEN notes IS NULL OR length(trim(notes)) = 0 THEN v_audit_note
        ELSE notes || E'\n' || v_audit_note
      END
  WHERE id = p_lot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. RPC update_lot_metadata
-- Edicion segura de metadatos. Bloquea cambios sobre campos que
-- afectan invariantes (unit_cost rompe COGS historico,
-- quantity_received/remaining rompe stock).
--
-- Si expires_at cambia, recalcula products.stock_available para
-- ese producto inmediatamente (un lote que pasaba de vencido a
-- vigente o viceversa cambia el agregado).
--
-- Pasar NULL en cualquier parametro = no cambiar ese campo.
-- Para borrar supplier/notes pasar string vacio.
-- =============================================
CREATE OR REPLACE FUNCTION update_lot_metadata(
  p_lot_id      UUID,
  p_admin_id    UUID,
  p_supplier    TEXT        DEFAULT NULL,
  p_notes       TEXT        DEFAULT NULL,
  p_expires_at  TIMESTAMPTZ DEFAULT NULL,
  p_lot_number  TEXT        DEFAULT NULL,
  p_clear_expiration BOOLEAN DEFAULT FALSE
) RETURNS VOID AS $$
DECLARE
  v_lot_admin       UUID;
  v_product_id      UUID;
  v_received_at     TIMESTAMPTZ;
  v_old_expires_at  TIMESTAMPTZ;
  v_new_expires_at  TIMESTAMPTZ;
  v_new_lot_number  TEXT;
BEGIN
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'admin_id es requerido';
  END IF;

  SELECT admin_id, product_id, received_at, expires_at
    INTO v_lot_admin, v_product_id, v_received_at, v_old_expires_at
  FROM product_lots WHERE id = p_lot_id FOR UPDATE;

  IF v_lot_admin IS NULL THEN
    RAISE EXCEPTION 'Lote no encontrado';
  END IF;
  IF v_lot_admin IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'Lote no pertenece al admin';
  END IF;

  -- Resolver nuevo expires_at:
  --   p_clear_expiration TRUE  -> NULL (sin vencimiento)
  --   p_expires_at NOT NULL    -> nuevo valor
  --   ambos NULL/FALSE         -> sin cambio
  IF p_clear_expiration THEN
    v_new_expires_at := NULL;
  ELSIF p_expires_at IS NOT NULL THEN
    IF p_expires_at < v_received_at THEN
      RAISE EXCEPTION 'La fecha de vencimiento no puede ser anterior a la fecha de recepcion';
    END IF;
    v_new_expires_at := p_expires_at;
  ELSE
    v_new_expires_at := v_old_expires_at;
  END IF;

  -- Resolver nuevo lot_number (validacion de unicidad la cubre el
  -- UNIQUE INDEX product_lots_lot_number_admin_idx)
  IF p_lot_number IS NOT NULL AND length(trim(p_lot_number)) > 0 THEN
    v_new_lot_number := trim(p_lot_number);
  ELSE
    v_new_lot_number := NULL; -- senal de "no cambiar"
  END IF;

  UPDATE product_lots
  SET supplier   = CASE WHEN p_supplier IS NULL THEN supplier
                        WHEN length(trim(p_supplier)) = 0 THEN NULL
                        ELSE p_supplier END,
      notes      = CASE WHEN p_notes IS NULL THEN notes
                        WHEN length(trim(p_notes)) = 0 THEN NULL
                        ELSE p_notes END,
      expires_at = v_new_expires_at,
      lot_number = COALESCE(v_new_lot_number, lot_number)
  WHERE id = p_lot_id;

  -- Recalcular stock_available si cambio expires_at: un lote que
  -- cruzo el umbral de vigencia altera la suma vigente del producto.
  IF v_new_expires_at IS DISTINCT FROM v_old_expires_at THEN
    UPDATE products p
    SET stock_available = COALESCE((
      SELECT SUM(pl.quantity_remaining)
      FROM product_lots pl
      WHERE pl.product_id = v_product_id
        AND pl.quantity_remaining > 0
        AND pl.active = TRUE
        AND (pl.expires_at IS NULL OR pl.expires_at > NOW())
    ), 0)
    WHERE p.id = v_product_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 4. VISTA product_lots_courier (recreada)
-- Excluye lotes agotados (quantity_remaining = 0) e inactivos
-- (active = FALSE). El courier no necesita ver lotes que no son
-- seleccionables, y no debemos exponer cierres que tengan razones
-- internas en notes.
-- =============================================
DROP VIEW IF EXISTS product_lots_courier;

CREATE VIEW product_lots_courier AS
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
WHERE admin_id = get_admin_id()
  AND active = TRUE
  AND quantity_remaining > 0;

GRANT SELECT ON product_lots_courier TO authenticated;
