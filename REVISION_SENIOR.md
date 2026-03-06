# Revision Senior - Plan de Desarrollo Imperial Apps

> **Revisor**: Arquitecto Senior (70 anos de experiencia en sistemas)
> **Fecha**: 2026-03-06

---

## Veredicto General

El plan es **solido y bien estructurado**. Cubre los requerimientos del negocio correctamente. Sin embargo, tras decadas viendo proyectos fallar por las mismas razones, identifico los siguientes ajustes criticos:

---

## Ajustes Obligatorios

### 1. FALTA: Tabla de auditoría (audit_log)

**Problema**: No hay trazabilidad de quien cambio que y cuando. En sistemas financieros (cartera, pagos), esto no es opcional. He visto empresas perder demandas por no tener logs de auditoría en base de datos.

**Solucion**: Agregar tabla `audit_log` con trigger en PostgreSQL.

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla TEXT NOT NULL,
  registro_id UUID NOT NULL,
  accion TEXT NOT NULL CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE')),
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  usuario_id UUID REFERENCES usuarios(id),
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Google Cloud Logging es para monitoreo operacional. La auditoría de datos va en la base de datos. **Son complementarios, no sustitutos.**

---

### 2. FALTA: Concurrencia y race conditions en inventario

**Problema**: Si dos mensajeros confirman entregas simultaneamente del mismo producto, el stock puede quedar inconsistente. He visto esto romper inventarios enteros.

**Solucion**: Usar transacciones con `SELECT FOR UPDATE` en las operaciones de stock via funciones RPC de Supabase.

```sql
CREATE OR REPLACE FUNCTION descontar_stock(
  p_producto_id UUID,
  p_cantidad INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  stock_actual INTEGER;
BEGIN
  SELECT stock INTO stock_actual
  FROM productos
  WHERE id = p_producto_id
  FOR UPDATE;  -- Bloquea la fila

  IF stock_actual < p_cantidad THEN
    RETURN FALSE;
  END IF;

  UPDATE productos SET stock = stock - p_cantidad WHERE id = p_producto_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

---

### 3. AJUSTE: El flujo de inventario tiene un hueco

**Problema**: El plan dice que el stock "se reserva" al asignar mensajero, pero no hay tabla ni campo para stock reservado. Esto crea una zona gris donde el stock ya salio pero no se desconto.

**Solucion**: Agregar campo `stock_reservado` a productos, o simplemente descontar al asignar y reingresar si hay devolucion. Recomiendo lo segundo por simplicidad:

```
1. Admin crea pedido         → estado: 'pendiente' (stock no se toca)
2. Admin asigna mensajero    → estado: 'asignado' (stock SE DESCUENTA aqui)
3. Mensajero confirma        → estado: 'entregado' (no hay cambio de stock)
4. Si devolucion             → estado: 'devuelto', stock SE REINGRESA
```

**Razon**: Es mas simple, hay un solo punto de descuento, y las devoluciones son la excepcion, no la regla.

---

### 4. AJUSTE: Agregar campo `fecha_entrega` al pedido

**Problema**: El plan no distingue entre fecha de creacion y fecha de entrega real. Para reportes de cartera, necesitas saber cuando se entrego, no cuando se creo.

```sql
ALTER TABLE pedidos ADD COLUMN fecha_entrega TIMESTAMPTZ;
ALTER TABLE pedidos ADD COLUMN fecha_asignacion TIMESTAMPTZ;
```

---

### 5. FALTA: Cierre de caja del mensajero

**Problema**: No hay forma de que el admin valide que el dinero que el mensajero recaudo coincida con lo reportado. En 40 anos de sistemas de despacho, SIEMPRE se necesita un cierre de caja.

**Solucion**: Agregar tabla `cierres_caja`:

```sql
CREATE TABLE cierres_caja (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mensajero_id UUID REFERENCES usuarios(id),
  fecha DATE NOT NULL,
  total_reportado NUMERIC(12,2) NOT NULL,  -- Lo que dice el mensajero
  total_sistema NUMERIC(12,2) NOT NULL,    -- Lo que dice el sistema
  diferencia NUMERIC(12,2) GENERATED ALWAYS AS (total_reportado - total_sistema) STORED,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'con_diferencia')),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 6. AJUSTE: Offline-first no es "basico" para mensajeros

**Problema**: El plan dice "soporte offline basico". Un mensajero en zona sin cobertura que no puede confirmar una entrega es un problema grave. He visto esto en sistemas de logística una y otra vez.

**Solucion**: Priorizar la cola offline con sync:
- Almacenar acciones pendientes en IndexedDB.
- Sincronizar automaticamente al recuperar conexion.
- Indicador visual claro de modo offline.
- Esto debe ir en **Fase 3**, no en Fase 6.

---

### 7. AJUSTE: El PDF debe incluir informacion de contacto y condiciones

**Problema**: Un ticket de cobro sin datos de contacto del negocio ni condiciones de pago no sirve en la practica. El cliente lo recibe y no sabe a quien pagar ni como.

**Solucion**: Agregar tabla `configuracion_negocio`:

```sql
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
```

---

### 8. AJUSTE: Fases reordenadas

Las fases originales tienen dependencias mal ordenadas. No puedes probar entregas sin inventario, ni cartera sin pedidos.

**Orden corregido:**

| Fase | Contenido | Duracion |
|------|-----------|----------|
| 1 | Setup, Auth, Layouts, Logging, Config negocio | Semana 1-2 |
| 2 | Clientes + Productos (CRUD) | Semana 3 |
| 3 | Pedidos + Asignacion + Flujo mensajero + Inventario automatico | Semana 4-5 |
| 4 | Cartera + Pagos + Cierre de caja | Semana 6 |
| 5 | Reportes + PDF + Dashboard | Semana 7 |
| 6 | PWA offline, testing E2E, deploy | Semana 8 |

---

### 9. FALTA: Indices en base de datos

**Problema**: Sin indices, las consultas de cartera y reportes seran lentas cuando crezcan los datos.

```sql
CREATE INDEX idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX idx_pedidos_mensajero ON pedidos(mensajero_id);
CREATE INDEX idx_pedidos_estado ON pedidos(estado);
CREATE INDEX idx_pedidos_created ON pedidos(created_at);
CREATE INDEX idx_pagos_cliente ON pagos(cliente_id);
CREATE INDEX idx_pagos_pedido ON pagos(pedido_id);
CREATE INDEX idx_movimientos_producto ON movimientos_inventario(producto_id);
CREATE INDEX idx_pedido_items_pedido ON pedido_items(pedido_id);
```

---

### 10. AJUSTE: Agregar soft delete

**Problema**: `DELETE` en tablas de clientes o productos rompe las referencias historicas. Un producto eliminado que aparece en un pedido antiguo causa errores.

**Solucion**: Ya tienen `activo` en productos y usuarios. Agregar lo mismo a clientes. **Nunca borrar, solo desactivar.** Filtrar por `activo = true` en las vistas.

---

## Resumen de Cambios

| # | Tipo | Cambio |
|---|------|--------|
| 1 | Agregar | Tabla audit_log con triggers |
| 2 | Agregar | Funciones RPC para concurrencia de stock |
| 3 | Ajustar | Descontar stock al asignar, no al entregar |
| 4 | Agregar | Campos fecha_entrega y fecha_asignacion |
| 5 | Agregar | Tabla y flujo de cierre de caja |
| 6 | Mover | Offline-first a fase 3, no fase 6 |
| 7 | Agregar | Tabla configuracion_negocio para PDF |
| 8 | Ajustar | Reordenar fases de desarrollo |
| 9 | Agregar | Indices en tablas principales |
| 10 | Ajustar | Soft delete en clientes |

---

> **Nota final**: El plan original es bueno para un MVP. Con estos 10 ajustes, pasa de ser un prototipo a ser un sistema que aguanta produccion real. La diferencia entre un sistema que funciona en demo y uno que funciona con 50 mensajeros y 500 clientes esta en estos detalles.
