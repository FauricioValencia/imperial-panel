-- ============================================
-- Imperial Apps - Migracion Inicial
-- Incluye: tablas, indices, RLS, funciones RPC, audit_log
-- ============================================

-- ============================================
-- TABLAS PRINCIPALES
-- ============================================

CREATE TABLE usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'mensajero')),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  telefono TEXT,
  direccion TEXT,
  saldo_pendiente NUMERIC(12,2) DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio NUMERIC(12,2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  stock_minimo INTEGER DEFAULT 5,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  mensajero_id UUID REFERENCES usuarios(id),
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'asignado', 'en_camino', 'entregado', 'devuelto', 'parcial')),
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notas TEXT,
  fecha_asignacion TIMESTAMPTZ,
  fecha_entrega TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE pedido_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES productos(id),
  cantidad INTEGER NOT NULL,
  precio_unitario NUMERIC(12,2) NOT NULL,
  devuelto BOOLEAN DEFAULT false,
  cantidad_devuelta INTEGER DEFAULT 0
);

CREATE TABLE pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  monto NUMERIC(12,2) NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('completo', 'abono')),
  metodo_pago TEXT DEFAULT 'efectivo'
    CHECK (metodo_pago IN ('efectivo', 'transferencia', 'nequi', 'daviplata')),
  registrado_por UUID NOT NULL REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE movimientos_inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES productos(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida', 'devolucion', 'ajuste')),
  cantidad INTEGER NOT NULL,
  referencia_pedido UUID REFERENCES pedidos(id),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE cierres_caja (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mensajero_id UUID NOT NULL REFERENCES usuarios(id),
  fecha DATE NOT NULL,
  total_reportado NUMERIC(12,2) NOT NULL,
  total_sistema NUMERIC(12,2) NOT NULL,
  diferencia NUMERIC(12,2) GENERATED ALWAYS AS (total_reportado - total_sistema) STORED,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'con_diferencia')),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE configuracion_negocio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_empresa TEXT NOT NULL,
  nit TEXT,
  telefono TEXT,
  direccion TEXT,
  condiciones_pago TEXT,
  logo_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla TEXT NOT NULL,
  registro_id UUID NOT NULL,
  accion TEXT NOT NULL CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE')),
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  usuario_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDICES
-- ============================================

CREATE INDEX idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX idx_pedidos_mensajero ON pedidos(mensajero_id);
CREATE INDEX idx_pedidos_estado ON pedidos(estado);
CREATE INDEX idx_pedidos_created ON pedidos(created_at);
CREATE INDEX idx_pagos_cliente ON pagos(cliente_id);
CREATE INDEX idx_pagos_pedido ON pagos(pedido_id);
CREATE INDEX idx_movimientos_producto ON movimientos_inventario(producto_id);
CREATE INDEX idx_pedido_items_pedido ON pedido_items(pedido_id);
CREATE INDEX idx_cierres_mensajero ON cierres_caja(mensajero_id);
CREATE INDEX idx_cierres_fecha ON cierres_caja(fecha);
CREATE INDEX idx_audit_tabla ON audit_log(tabla, registro_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
CREATE INDEX idx_clientes_activo ON clientes(activo);
CREATE INDEX idx_productos_activo ON productos(activo);

-- ============================================
-- FUNCIONES RPC (Concurrencia segura para stock)
-- ============================================

-- Descontar stock con bloqueo de fila
CREATE OR REPLACE FUNCTION descontar_stock(
  p_producto_id UUID,
  p_cantidad INTEGER,
  p_referencia_pedido UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  stock_actual INTEGER;
BEGIN
  SELECT stock INTO stock_actual
  FROM productos
  WHERE id = p_producto_id
  FOR UPDATE;

  IF stock_actual IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado: %', p_producto_id;
  END IF;

  IF stock_actual < p_cantidad THEN
    RETURN FALSE;
  END IF;

  UPDATE productos SET stock = stock - p_cantidad WHERE id = p_producto_id;

  INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, referencia_pedido, notas)
  VALUES (p_producto_id, 'salida', p_cantidad, p_referencia_pedido, 'Descuento por asignacion de pedido');

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reingresar stock por devolucion
CREATE OR REPLACE FUNCTION reingresar_stock(
  p_producto_id UUID,
  p_cantidad INTEGER,
  p_referencia_pedido UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE productos SET stock = stock + p_cantidad WHERE id = p_producto_id;

  INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, referencia_pedido, notas)
  VALUES (p_producto_id, 'devolucion', p_cantidad, p_referencia_pedido, 'Reingreso por devolucion');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar saldo pendiente del cliente
CREATE OR REPLACE FUNCTION actualizar_saldo_cliente(p_cliente_id UUID)
RETURNS VOID AS $$
DECLARE
  total_pedidos NUMERIC(12,2);
  total_pagos NUMERIC(12,2);
BEGIN
  SELECT COALESCE(SUM(total), 0) INTO total_pedidos
  FROM pedidos
  WHERE cliente_id = p_cliente_id
    AND estado NOT IN ('devuelto');

  SELECT COALESCE(SUM(monto), 0) INTO total_pagos
  FROM pagos
  WHERE cliente_id = p_cliente_id;

  UPDATE clientes
  SET saldo_pendiente = total_pedidos - total_pagos
  WHERE id = p_cliente_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para actualizar updated_at en pedidos
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pedidos_updated_at
  BEFORE UPDATE ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_updated_at();

-- ============================================
-- AUDIT TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION registrar_auditoria()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (tabla, registro_id, accion, datos_nuevos, usuario_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (tabla, registro_id, accion, datos_anteriores, datos_nuevos, usuario_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (tabla, registro_id, accion, datos_anteriores, usuario_id)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit en tablas financieras
CREATE TRIGGER audit_pagos AFTER INSERT OR UPDATE OR DELETE ON pagos
  FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();

CREATE TRIGGER audit_pedidos AFTER INSERT OR UPDATE OR DELETE ON pedidos
  FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();

CREATE TRIGGER audit_movimientos AFTER INSERT OR UPDATE OR DELETE ON movimientos_inventario
  FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();

CREATE TRIGGER audit_productos AFTER UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE cierres_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_negocio ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Funcion helper para obtener rol del usuario actual
CREATE OR REPLACE FUNCTION obtener_rol_usuario()
RETURNS TEXT AS $$
  SELECT rol FROM usuarios WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- USUARIOS: admin ve todo, mensajero solo se ve a si mismo
CREATE POLICY "admin_full_usuarios" ON usuarios
  FOR ALL TO authenticated
  USING (obtener_rol_usuario() = 'admin');

CREATE POLICY "mensajero_ver_propio" ON usuarios
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- CLIENTES: admin acceso total, mensajero solo lectura
CREATE POLICY "admin_full_clientes" ON clientes
  FOR ALL TO authenticated
  USING (obtener_rol_usuario() = 'admin');

CREATE POLICY "mensajero_leer_clientes" ON clientes
  FOR SELECT TO authenticated
  USING (obtener_rol_usuario() = 'mensajero');

-- PRODUCTOS: admin acceso total, mensajero solo lectura
CREATE POLICY "admin_full_productos" ON productos
  FOR ALL TO authenticated
  USING (obtener_rol_usuario() = 'admin');

CREATE POLICY "mensajero_leer_productos" ON productos
  FOR SELECT TO authenticated
  USING (obtener_rol_usuario() = 'mensajero');

-- PEDIDOS: admin ve todo, mensajero solo sus pedidos asignados
CREATE POLICY "admin_full_pedidos" ON pedidos
  FOR ALL TO authenticated
  USING (obtener_rol_usuario() = 'admin');

CREATE POLICY "mensajero_ver_pedidos" ON pedidos
  FOR SELECT TO authenticated
  USING (obtener_rol_usuario() = 'mensajero' AND mensajero_id = auth.uid());

CREATE POLICY "mensajero_actualizar_pedidos" ON pedidos
  FOR UPDATE TO authenticated
  USING (obtener_rol_usuario() = 'mensajero' AND mensajero_id = auth.uid())
  WITH CHECK (obtener_rol_usuario() = 'mensajero' AND mensajero_id = auth.uid());

-- PEDIDO_ITEMS: sigue las reglas del pedido padre
CREATE POLICY "admin_full_pedido_items" ON pedido_items
  FOR ALL TO authenticated
  USING (obtener_rol_usuario() = 'admin');

CREATE POLICY "mensajero_ver_items" ON pedido_items
  FOR SELECT TO authenticated
  USING (
    obtener_rol_usuario() = 'mensajero'
    AND pedido_id IN (SELECT id FROM pedidos WHERE mensajero_id = auth.uid())
  );

-- PAGOS: admin ve todo, mensajero puede insertar y ver los suyos
CREATE POLICY "admin_full_pagos" ON pagos
  FOR ALL TO authenticated
  USING (obtener_rol_usuario() = 'admin');

CREATE POLICY "mensajero_insertar_pagos" ON pagos
  FOR INSERT TO authenticated
  WITH CHECK (obtener_rol_usuario() = 'mensajero' AND registrado_por = auth.uid());

CREATE POLICY "mensajero_ver_pagos" ON pagos
  FOR SELECT TO authenticated
  USING (obtener_rol_usuario() = 'mensajero' AND registrado_por = auth.uid());

-- MOVIMIENTOS: solo admin
CREATE POLICY "admin_full_movimientos" ON movimientos_inventario
  FOR ALL TO authenticated
  USING (obtener_rol_usuario() = 'admin');

CREATE POLICY "mensajero_leer_movimientos" ON movimientos_inventario
  FOR SELECT TO authenticated
  USING (obtener_rol_usuario() = 'mensajero');

-- CIERRES DE CAJA: admin ve todo, mensajero solo los suyos
CREATE POLICY "admin_full_cierres" ON cierres_caja
  FOR ALL TO authenticated
  USING (obtener_rol_usuario() = 'admin');

CREATE POLICY "mensajero_cierres_propios" ON cierres_caja
  FOR SELECT TO authenticated
  USING (obtener_rol_usuario() = 'mensajero' AND mensajero_id = auth.uid());

CREATE POLICY "mensajero_insertar_cierre" ON cierres_caja
  FOR INSERT TO authenticated
  WITH CHECK (obtener_rol_usuario() = 'mensajero' AND mensajero_id = auth.uid());

-- CONFIGURACION: admin puede todo, todos pueden leer
CREATE POLICY "admin_full_config" ON configuracion_negocio
  FOR ALL TO authenticated
  USING (obtener_rol_usuario() = 'admin');

CREATE POLICY "todos_leer_config" ON configuracion_negocio
  FOR SELECT TO authenticated
  USING (true);

-- AUDIT LOG: solo admin puede leer
CREATE POLICY "admin_leer_audit" ON audit_log
  FOR SELECT TO authenticated
  USING (obtener_rol_usuario() = 'admin');

-- ============================================
-- DATOS INICIALES
-- ============================================

INSERT INTO configuracion_negocio (nombre_empresa, condiciones_pago)
VALUES ('Imperial', 'Pago contra entrega o a credito segun acuerdo previo.');
