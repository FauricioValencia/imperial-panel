-- =============================================
-- MIGRACIÓN 008: register_outbound exige admin_id NOT NULL
-- =============================================
--
-- Cierra el backdoor de la migración 007: las validaciones de ownership
-- estaban envueltas en `IF p_admin_id IS NOT NULL THEN ...`, lo que permitía
-- saltarse la verificación cross-tenant si el caller omitía el parámetro
-- (la firma tiene DEFAULT NULL por compatibilidad).
--
-- Ahora la RPC rechaza explícitamente cualquier invocación sin admin_id.
-- La firma se preserva, así que las llamadas existentes siguen funcionando.
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
  -- admin_id es obligatorio: sin él no podemos validar ownership multi-tenant
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'admin_id es requerido';
  END IF;

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
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;

  -- Defensa en profundidad: el producto debe pertenecer al admin invocante
  IF v_product_admin IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'Producto no pertenece al admin';
  END IF;

  -- Defensa en profundidad: el cliente (si se envía) debe pertenecer al admin
  IF p_customer_id IS NOT NULL THEN
    SELECT admin_id INTO v_customer_admin
    FROM customers
    WHERE id = p_customer_id;

    IF v_customer_admin IS NULL THEN
      RAISE EXCEPTION 'Cliente no encontrado';
    END IF;

    IF v_customer_admin IS DISTINCT FROM p_admin_id THEN
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
