-- Venta directa (mostrador): distingue pedidos que no pasan por courier.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'delivery';

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_order_type_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_order_type_check
  CHECK (order_type = ANY (ARRAY['delivery'::text, 'direct'::text]));

COMMENT ON COLUMN public.orders.order_type IS
  'delivery: flujo domicilio; direct: venta en mostrador, stock central al registrar';
