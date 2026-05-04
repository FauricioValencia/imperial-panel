-- =============================================
-- 023: Ajustes de lote con cantidad con signo
-- =============================================
-- Problema: update_lot_metadata guardaba abs(delta) en inventory_movements,
-- perdiendo la direccion del ajuste. La UI no podia distinguir si fue +1 o -1.
-- Solucion: guardar v_delta con signo (positivo = ingreso, negativo = descuento).
-- =============================================

CREATE OR REPLACE FUNCTION update_lot_metadata(
  p_lot_id              UUID,
  p_admin_id            UUID,
  p_supplier            TEXT        DEFAULT NULL,
  p_notes               TEXT        DEFAULT NULL,
  p_expires_at          TIMESTAMPTZ DEFAULT NULL,
  p_lot_number          TEXT        DEFAULT NULL,
  p_clear_expiration    BOOLEAN     DEFAULT FALSE,
  p_suggested_price     NUMERIC     DEFAULT NULL,
  p_clear_suggested_price BOOLEAN   DEFAULT FALSE,
  p_quantity_received   INTEGER     DEFAULT NULL,
  p_correction_reason   TEXT        DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_lot_admin           UUID;
  v_product_id          UUID;
  v_received_at         TIMESTAMPTZ;
  v_old_expires_at      TIMESTAMPTZ;
  v_new_expires_at      TIMESTAMPTZ;
  v_new_lot_number      TEXT;
  v_old_qty_received    INTEGER;
  v_old_qty_remaining   INTEGER;
  v_consumed            INTEGER;
  v_delta               INTEGER;
  v_old_active          BOOLEAN;
  v_unit_cost           NUMERIC;
  v_movement_notes      TEXT;
BEGIN
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'admin_id es requerido';
  END IF;
  IF p_suggested_price IS NOT NULL AND p_suggested_price < 0 THEN
    RAISE EXCEPTION 'El precio sugerido no puede ser negativo';
  END IF;

  SELECT admin_id, product_id, received_at, expires_at, active,
         quantity_received, quantity_remaining, unit_cost
    INTO v_lot_admin, v_product_id, v_received_at, v_old_expires_at, v_old_active,
         v_old_qty_received, v_old_qty_remaining, v_unit_cost
  FROM product_lots WHERE id = p_lot_id FOR UPDATE;

  IF v_lot_admin IS NULL THEN
    RAISE EXCEPTION 'Lote no encontrado';
  END IF;
  IF v_lot_admin IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'Lote no pertenece al admin';
  END IF;

  -- Resolver nuevo expires_at
  IF p_clear_expiration THEN
    v_new_expires_at := NULL;
  ELSIF p_expires_at IS NOT NULL THEN
    v_new_expires_at := p_expires_at;
  ELSE
    v_new_expires_at := v_old_expires_at;
  END IF;

  -- Resolver nuevo lot_number
  IF p_lot_number IS NOT NULL AND length(trim(p_lot_number)) > 0 THEN
    v_new_lot_number := trim(p_lot_number);
  ELSE
    v_new_lot_number := NULL;
  END IF;

  -- Validar y aplicar correccion de quantity_received
  IF p_quantity_received IS NOT NULL THEN
    v_consumed := v_old_qty_received - v_old_qty_remaining;
    IF p_quantity_received < v_consumed THEN
      RAISE EXCEPTION
        'La cantidad recibida (%) no puede ser menor al consumido historico (%)',
        p_quantity_received, v_consumed;
    END IF;

    IF p_correction_reason IS NULL OR length(trim(p_correction_reason)) < 5 THEN
      RAISE EXCEPTION 'Se requiere una razon de correccion de al menos 5 caracteres';
    END IF;

    v_delta := p_quantity_received - v_old_qty_received;

    UPDATE product_lots
    SET quantity_received  = p_quantity_received,
        quantity_remaining = v_old_qty_remaining + v_delta
    WHERE id = p_lot_id;

    UPDATE products
    SET stock = stock + v_delta
    WHERE id = v_product_id;

    -- Registrar movimiento de ajuste con cantidad con signo:
    -- positivo = se agregaron unidades, negativo = se descontaron unidades.
    v_movement_notes := format(
      'Correccion de cantidad recibida (%s%s unidades): %s',
      CASE WHEN v_delta >= 0 THEN '+' ELSE '' END,
      v_delta,
      trim(p_correction_reason)
    );

    INSERT INTO inventory_movements (
      product_id, type, quantity, lot_id, unit_cost_snapshot,
      reason, notes, admin_id
    ) VALUES (
      v_product_id, 'adjustment', v_delta, p_lot_id, v_unit_cost,
      'correccion_captura', v_movement_notes, p_admin_id
    );
  END IF;

  -- Aplicar cambios de metadatos (supplier/notes/expires/lot_number/suggested_price)
  UPDATE product_lots
  SET supplier        = CASE WHEN p_supplier IS NULL THEN supplier
                             WHEN length(trim(p_supplier)) = 0 THEN NULL
                             ELSE p_supplier END,
      notes           = CASE WHEN p_notes IS NULL THEN notes
                             WHEN length(trim(p_notes)) = 0 THEN NULL
                             ELSE p_notes END,
      expires_at      = v_new_expires_at,
      lot_number      = COALESCE(v_new_lot_number, lot_number),
      suggested_price = CASE WHEN p_clear_suggested_price THEN NULL
                             WHEN p_suggested_price IS NULL THEN suggested_price
                             ELSE p_suggested_price END
  WHERE id = p_lot_id;

  -- Recalcular stock_available si: cambio expires_at, o cambio
  -- quantity_received y el lote esta activo y vigente.
  IF v_new_expires_at IS DISTINCT FROM v_old_expires_at
     OR p_quantity_received IS NOT NULL THEN
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
