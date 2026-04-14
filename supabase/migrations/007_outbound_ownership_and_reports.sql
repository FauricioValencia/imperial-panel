-- =============================================
-- MIGRACIÓN 008: Endurecer register_outbound con validación de ownership
--                (defensa en profundidad multi-tenant)
-- =============================================
--
-- CAMBIO: La RPC register_outbound ahora valida dentro del servidor de base
-- de datos que tanto el producto como el cliente (cuando aplique) pertenezcan
-- al admin_id que invoca la operación. Antes esto sólo se validaba en la
-- server action; ahora se valida también en la RPC como defensa en profundidad,
-- por si en el futuro la RPC se expone desde otro contexto.
--
-- Se preserva la MISMA firma de la función y toda la lógica existente (lock
-- de fila, validaciones de stock, razón, cliente requerido para muestras,
-- descuento de stock y registro del movimiento).
-- =============================================

CREATE OR REPLACE FUNCTION register_outbound(
  p_product_id       UUID,
  p_quantity         INTEGER,
  p_reason           TEXT,
  p_customer_id      UUID    DEFAULT NULL,
  p_notes            TEXT    DEFAULT NULL,
  p_admin_id         UUID    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_stock      INTEGER;
  v_product_admin      UUID;
  v_customer_admin     UUID;
BEGIN
  -- Validar reason
  IF p_reason NOT IN ('merma', 'muestra') THEN
    RAISE EXCEPTION 'Razón inválida: %. Valores permitidos: merma, muestra', p_reason;
  END IF;

  -- Muestra requiere cliente
  IF p_reason = 'muestra' AND p_customer_id IS NULL THEN
    RAISE EXCEPTION 'Se requiere cliente para salidas tipo muestra';
  END IF;

  -- Lock de fila del producto para evitar race conditions
  SELECT stock, admin_id
    INTO v_current_stock, v_product_admin
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  IF v_current_stock IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado: %', p_product_id;
  END IF;

  -- Defensa en profundidad: el producto debe pertenecer al admin invocante
  IF p_admin_id IS NOT NULL AND v_product_admin IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'Producto no pertenece al admin';
  END IF;

  -- Defensa en profundidad: el cliente (si se envía) debe pertenecer al admin
  IF p_customer_id IS NOT NULL THEN
    SELECT admin_id INTO v_customer_admin
    FROM customers
    WHERE id = p_customer_id;

    IF v_customer_admin IS NULL THEN
      RAISE EXCEPTION 'Cliente no encontrado: %', p_customer_id;
    END IF;

    IF p_admin_id IS NOT NULL AND v_customer_admin IS DISTINCT FROM p_admin_id THEN
      RAISE EXCEPTION 'Cliente no pertenece al admin';
    END IF;
  END IF;

  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a cero';
  END IF;

  IF v_current_stock < p_quantity THEN
    RAISE EXCEPTION 'Stock insuficiente: disponible %, solicitado %',
      v_current_stock, p_quantity;
  END IF;

  -- Descontar stock
  UPDATE products
  SET stock = stock - p_quantity
  WHERE id = p_product_id;

  -- Registrar movimiento con razón y cliente (si aplica)
  INSERT INTO inventory_movements
    (product_id, type, quantity, reason, sample_customer_id, notes, admin_id)
  VALUES
    (p_product_id, 'outbound', p_quantity, p_reason, p_customer_id, p_notes, p_admin_id);
END;
$$;
