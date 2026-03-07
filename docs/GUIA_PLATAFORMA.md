# Imperial - Guia de la Plataforma

## Que es Imperial?

Imperial es un sistema de gestion para empresas de entregas/domicilios. Permite al administrador gestionar pedidos, inventario, clientes y cartera, mientras que los mensajeros reciben y confirman entregas desde su celular.

Consta de dos interfaces:
- **Panel Administrativo** (web desktop): gestion completa del negocio.
- **App Mensajeros** (PWA movil): confirmar entregas, registrar pagos, ver ruta.

---

## Roles y Acceso

| Rol | Acceso | URL inicial |
|-----|--------|-------------|
| Admin | Panel completo: dashboard, pedidos, clientes, inventario, cartera, reportes | `/dashboard` |
| Mensajero | Solo sus entregas asignadas, ruta, historial y perfil | `/deliveries` |

Ambos roles ingresan por `/login` con email y contrasena. El sistema redirige automaticamente segun el rol.

---

## Panel Administrativo

### Dashboard (`/dashboard`)
Vista general con metricas en tiempo real:
- **Pedidos hoy**: cantidad de pedidos creados en el dia.
- **Cartera pendiente**: suma de saldos de todos los clientes.
- **Entregas hoy**: pedidos entregados/parciales del dia.
- **Stock bajo**: productos por debajo de su minimo.
- **Ultimos pedidos**: los 5 mas recientes con estado y monto.
- **Top deudores**: los 5 clientes con mayor saldo pendiente.

Cada tarjeta es clickeable y lleva a su seccion respectiva.

### Clientes (`/customers`)
- Tabla con busqueda por nombre/telefono.
- Crear, editar y desactivar clientes (soft delete).
- Campos: nombre, telefono, direccion.
- El saldo pendiente se calcula automaticamente a partir de pedidos y pagos.

### Inventario (`/inventory`)
- Lista de productos con stock actual, stock minimo y alerta visual si esta bajo.
- Crear, editar y desactivar productos.
- **Registrar entrada**: agrega stock al producto (se registra como movimiento de inventario).
- **Historial de movimientos**: entrada, salida, devolucion por producto.

El stock se maneja con funciones atomicas en PostgreSQL para evitar problemas de concurrencia:
- `deduct_stock()` al asignar mensajero a un pedido.
- `return_stock()` cuando hay devoluciones.
- `inbound_stock()` para entradas manuales de inventario.

### Pedidos (`/orders`)
- Tabla de todos los pedidos con filtro por estado.
- **Crear pedido** (`/orders/new`): seleccionar cliente, agregar productos con cantidad, notas opcionales.
- **Detalle de pedido** (`/orders/[id]`): informacion completa, items, estado, acciones disponibles.

#### Flujo de un pedido:
```
1. Admin crea pedido           → estado: pending
2. Admin asigna mensajero      → estado: assigned (stock se descuenta)
3. Mensajero marca "en camino" → estado: in_transit
4. Mensajero confirma entrega  → estado: delivered
5. Si hay devolucion           → estado: returned o partial (stock se reingresa)
```

**Al asignar mensajero**: el stock se descuenta inmediatamente. Si no hay stock suficiente, la asignacion falla y se hace rollback de cualquier deduccion parcial.

**Al confirmar con devolucion**: el mensajero indica cantidad devuelta por producto. El stock se reingresa automaticamente.

### Cartera / Billing (`/billing`)
- Tabla de todos los clientes con su saldo pendiente.
- Filtros: todos, con saldo, al dia.
- Tarjetas resumen: total por cobrar, clientes con saldo, clientes al dia.

**Detalle del cliente** (`/billing/[id]`):
- Tarjetas: total facturado, total pagado, saldo pendiente, numero de pedidos.
- Tabla de pedidos con columnas: total, pagado, pendiente. Boton "Pagar" por cada pedido con saldo.
- Historial de pagos con tipo (completo/abono), metodo y monto.
- **Descargar PDF**: genera ticket de cobro con detalle de deuda.
- **Enviar por WhatsApp**: abre WhatsApp con mensaje pre-llenado y enlace al PDF.

**Registrar pago**: dialog con opciones:
- Tipo: completo o abono parcial.
- Metodo: efectivo, transferencia, Nequi, Daviplata.
- Monto: se autocalcula en pago completo, o se ingresa manualmente en abono.

El saldo del cliente se recalcula automaticamente con `update_customer_balance()`.

### Domiciliarios (`/couriers`)
Lista de mensajeros registrados en el sistema. *(En desarrollo: asignacion y gestion avanzada)*

### Reportes (`/reports`)
*(En desarrollo: reportes avanzados de ventas y rendimiento)*

---

## App Mensajeros (PWA)

La app esta optimizada para uso con una mano en celular. Se puede instalar como app nativa desde el navegador.

### Mis Entregas (`/deliveries`)
Lista de pedidos asignados al mensajero, agrupados por estado:
- **En camino** (amarillo): pedidos que ya salio a entregar.
- **Asignados** (azul): pedidos pendientes de salir.

Cada tarjeta muestra:
- Nombre del cliente, direccion, telefono (clickeable para llamar).
- Lista de productos con cantidades.
- Total del pedido.

**Acciones**:
- **"En camino"**: marca el pedido como en transito.
- **"Entregado"**: confirma la entrega. Abre dialog de pago.
- **"Devolucion"**: abre formulario para indicar cantidades devueltas por producto.

### Pago al entregar
Despues de confirmar entrega, se abre un dialog con 3 opciones:
1. **Pago completo**: registra pago total en efectivo.
2. **Abono parcial**: ingresa monto del abono.
3. **Sin pago**: el cliente pagara despues.

### Mi Ruta (`/route`)
Vista de ruta del dia con todas las entregas pendientes, numeradas en orden.
- Boton "Llamar" para contactar al cliente.
- Boton "Navegar" que abre Google Maps con la direccion.

### Historial (`/history`)
Entregas completadas con estado (entregado, devuelto, parcial), detalle de items y devoluciones.

### Mi Perfil (`/profile`)
Nombre, email y boton de cerrar sesion.

---

## Navegacion

### Panel Admin (sidebar izquierdo)
- Dashboard
- Pedidos
- Clientes
- Inventario
- Cartera
- Domiciliarios
- Reportes

### App Mensajero (bottom navigation)
- Entregas
- Ruta
- Historial
- Perfil

---

## Seguridad

- **Autenticacion**: Supabase Auth con email/contrasena.
- **Autorizacion**: Row Level Security (RLS) en todas las tablas. Los mensajeros solo ven sus pedidos asignados.
- **Validacion**: toda entrada se valida con Zod en el servidor.
- **Auditoria**: triggers automaticos registran cambios en pagos, pedidos, inventario y productos.
- **Stock**: funciones atomicas con `FOR UPDATE` para evitar race conditions.

---

## Tecnologias

| Componente | Tecnologia |
|-----------|-----------|
| Framework | Next.js 16 (App Router, Server Components) |
| Base de datos | PostgreSQL via Supabase |
| Auth | Supabase Auth con RLS |
| UI | shadcn/ui + Tailwind CSS 4 |
| PDF | @react-pdf/renderer |
| PWA | Service Worker manual + Web App Manifest |
| Testing | Vitest (unit) + Playwright (E2E) |
| Logging | Winston + Google Cloud Logging |
