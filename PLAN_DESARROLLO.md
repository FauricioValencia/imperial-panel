# Plan de Desarrollo - Imperial Apps

## 1. Vision General del Proyecto

Sistema de gestion para empresa de entregas/domicilios compuesto por:

- **Panel Administrativo (Web)**: Gestion de cartera, inventario, reportes y operaciones.
- **App Mensajeros (PWA)**: Validacion de entregas, confirmacion de pagos, devoluciones.
- **Backend API**: Next.js App Router con Server Actions y Route Handlers.
- **Base de Datos**: PostgreSQL via Supabase.
- **Logging**: Google Cloud Logging.

---

## 2. Stack Tecnologico

| Capa | Tecnologia |
|------|-----------|
| Framework | Next.js 15 (App Router) |
| Lenguaje | TypeScript |
| Base de Datos | PostgreSQL (Supabase) |
| Autenticacion | Supabase Auth |
| ORM/Queries | Supabase Client (@supabase/ssr) |
| UI Components | shadcn/ui + Tailwind CSS 4 |
| Estado cliente | Zustand (minimo, solo lo necesario) |
| PDF Generation | @react-pdf/renderer |
| PWA | next-pwa / Serwist (service worker) |
| Logging | @google-cloud/logging-winston |
| Validacion | Zod |
| Testing | Vitest + Playwright |

---

## 3. Arquitectura del Proyecto (Monorepo)

```
apps-imperial/
├── src/
│   ├── app/
│   │   ├── (admin)/              # Panel administrativo
│   │   │   ├── dashboard/
│   │   │   ├── cartera/
│   │   │   ├── inventario/
│   │   │   ├── reportes/
│   │   │   ├── clientes/
│   │   │   ├── domiciliarios/
│   │   │   └── layout.tsx
│   │   ├── (mensajero)/          # App mensajeros (PWA)
│   │   │   ├── entregas/
│   │   │   ├── ruta/
│   │   │   ├── historial/
│   │   │   └── layout.tsx
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   ├── webhooks/
│   │   │   └── pdf/
│   │   ├── manifest.ts
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── admin/                # Componentes panel admin
│   │   └── mensajero/            # Componentes app mensajero
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── middleware.ts
│   │   ├── logger.ts             # Google Cloud Logging
│   │   ├── pdf.ts                # Generacion de PDFs
│   │   ├── validations.ts        # Esquemas Zod
│   │   └── utils.ts
│   ├── actions/                  # Server Actions
│   │   ├── cartera.ts
│   │   ├── inventario.ts
│   │   ├── entregas.ts
│   │   └── reportes.ts
│   ├── types/
│   │   └── index.ts
│   └── middleware.ts             # Auth + refresh tokens
├── public/
│   ├── icons/
│   └── sw.js                     # Service Worker
├── supabase/
│   └── migrations/               # SQL migrations
├── CLAUDE.md
├── PLAN_DESARROLLO.md
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 4. Modelo de Datos (PostgreSQL/Supabase)

### Tablas principales

```sql
-- Roles: admin, mensajero
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  cliente_id UUID REFERENCES clientes(id),
  mensajero_id UUID REFERENCES usuarios(id),
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'asignado', 'en_camino', 'entregado', 'devuelto', 'parcial')),
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE pedido_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id),
  cantidad INTEGER NOT NULL,
  precio_unitario NUMERIC(12,2) NOT NULL,
  devuelto BOOLEAN DEFAULT false,
  cantidad_devuelta INTEGER DEFAULT 0
);

CREATE TABLE pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES pedidos(id),
  cliente_id UUID REFERENCES clientes(id),
  monto NUMERIC(12,2) NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('completo', 'abono')),
  metodo_pago TEXT DEFAULT 'efectivo',
  registrado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE movimientos_inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID REFERENCES productos(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida', 'devolucion', 'ajuste')),
  cantidad INTEGER NOT NULL,
  referencia_pedido UUID REFERENCES pedidos(id),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Row Level Security (RLS)

- Admins: acceso total.
- Mensajeros: solo ven sus pedidos asignados, pueden registrar entregas y pagos.

---

## 5. Modulos Funcionales

### 5.1 Cartera / Cuentas por Cobrar

**Panel Admin:**
- Vista de todos los clientes con saldos pendientes.
- Filtros por cliente, rango de fechas, estado de pago.
- Historial de pagos por cliente.
- Registro manual de pagos (completo o abono).
- Actualizacion automatica del saldo pendiente en `clientes.saldo_pendiente`.

**App Mensajero:**
- Al completar entrega, formulario para registrar pago:
  - Pago completo (monto total del pedido).
  - Abono parcial (monto libre).
- Confirmacion visual del pago registrado.

**Logica de negocio (Server Actions):**
```
registrarPago(pedido_id, monto, tipo) =>
  1. Insertar en tabla pagos
  2. Calcular total pagado vs total pedido
  3. Actualizar saldo_pendiente del cliente
  4. Si pago completo, marcar pedido como pagado
  5. Log de la operacion
```

### 5.2 Inventario

**Panel Admin:**
- Vista de productos con stock actual, stock minimo, alertas.
- Registro de entradas de inventario.
- Historial de movimientos por producto.

**Flujo de entrega con inventario:**
```
1. Admin crea pedido         → estado: 'pendiente'
2. Admin asigna mensajero    → estado: 'asignado', stock se reserva
3. Mensajero sale a entregar → estado: 'en_camino'
4. Mensajero confirma        → estado: 'entregado', stock se descuenta
5. Si devolucion             → estado: 'devuelto'/'parcial', stock se reingresa
```

**Devoluciones:**
- Mensajero puede marcar items individuales como devueltos.
- El stock se reingresa automaticamente.
- Se registra movimiento de tipo 'devolucion'.

### 5.3 Reportes

**Ticket de cobro (PDF):**
- Generado via API route (`/api/pdf/ticket/[clienteId]`).
- Contenido:
  - Datos del cliente.
  - Listado de pedidos pendientes con detalle.
  - Total adeudado.
  - Fecha de generacion.
- Descargable o compartible via WhatsApp.

**Dashboard basico:**
- Ventas del dia/semana/mes.
- Entregas completadas vs pendientes.
- Top clientes con saldo pendiente.
- Productos con stock bajo.

---

## 6. PWA (Progressive Web App)

### Configuracion
- `manifest.ts` con nombre, iconos, colores, display standalone.
- Service Worker para cache de assets estaticos.
- Soporte offline basico para mensajeros (ver ruta asignada sin conexion).
- Push notifications (fase futura).

### Experiencia movil mensajeros
- Interfaz optimizada para una mano (botones grandes, acciones claras).
- Flujo de 3 pasos maximo: Ver pedido → Confirmar entrega → Registrar pago.
- GPS para registro de ubicacion de entrega (fase futura).

---

## 7. Sistema de Logging (Google Cloud Logging)

### Implementacion
- Winston como logger base.
- Transport `@google-cloud/logging-winston` para produccion.
- Console transport para desarrollo local.

### Que se loguea
- Operaciones criticas: pagos, cambios de inventario, cambios de estado.
- Errores de API y Server Actions.
- Accesos de autenticacion (login/logout).
- Cambios de datos sensibles (saldos, stock).

### Formato
```json
{
  "severity": "INFO",
  "message": "pago_registrado",
  "data": {
    "pedido_id": "...",
    "monto": 50000,
    "tipo": "abono",
    "registrado_por": "mensajero_uuid"
  },
  "timestamp": "2026-03-06T..."
}
```

---

## 8. Fases de Desarrollo

### Fase 1 - Fundacion (Semana 1-2)
- [ ] Setup Next.js 15 + TypeScript + Tailwind + shadcn/ui
- [ ] Configurar Supabase (proyecto, tablas, RLS)
- [ ] Autenticacion (login, roles, middleware)
- [ ] Layout admin y layout mensajero
- [ ] Sistema de logging basico

### Fase 2 - Inventario (Semana 3)
- [ ] CRUD de productos
- [ ] Movimientos de inventario
- [ ] Alertas de stock bajo

### Fase 3 - Pedidos y Entregas (Semana 4-5)
- [ ] Creacion y asignacion de pedidos
- [ ] Flujo mensajero: ver pedidos, confirmar entrega
- [ ] Devoluciones parciales/totales
- [ ] Descuento automatico de inventario

### Fase 4 - Cartera (Semana 5-6)
- [ ] Registro de pagos (completo/abono)
- [ ] Actualizacion automatica de saldos
- [ ] Vista de cartera por cliente
- [ ] Historial de pagos

### Fase 5 - Reportes y PDF (Semana 7)
- [ ] Generacion de ticket de cobro PDF
- [ ] Dashboard basico con metricas
- [ ] Compartir PDF via enlace/WhatsApp

### Fase 6 - PWA y Polish (Semana 8)
- [ ] Configurar manifest y service worker
- [ ] Optimizar UX movil para mensajeros
- [ ] Testing E2E
- [ ] Deploy a produccion

---

## 9. Consideraciones de Seguridad

- **RLS en Supabase**: cada tabla tiene politicas por rol.
- **Validacion server-side**: toda entrada se valida con Zod en Server Actions.
- **Middleware de auth**: protege todas las rutas, redirige segun rol.
- **No exponer claves**: variables de entorno solo en server, nunca en cliente.
- **CSRF**: Next.js Server Actions manejan esto nativamente.
- **Rate limiting**: en endpoints publicos (login).
