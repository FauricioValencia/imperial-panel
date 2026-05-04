-- Precio de referencia (lista o acuerdo con cliente) al crear la linea.
-- unit_price sigue siendo el precio cobrado; permite auditar overrides sin depender solo de logs.

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS reference_unit_price NUMERIC(12,2);

COMMENT ON COLUMN order_items.reference_unit_price IS
  'Precio resuelto (catalogo o customer_prices activo) en el momento de crear la linea. NULL en filas anteriores a esta migracion.';
