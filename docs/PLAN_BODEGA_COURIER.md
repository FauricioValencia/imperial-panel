# Plan: Bodega del Domiciliario

> Consolidado por equipo de 5 agentes (datos, UX, logica, edge cases, validador senior).
> Fecha: 2026-05-04

## Concepto

Cada courier tiene su propia bodega personal. El admin transfiere stock central -> bodega del courier.
Al confirmar entrega, el descuento sale de la bodega del courier (no del central).
Al cierre de turno, el courier devuelve sobrantes o declara carryover para el siguiente dia.

## Decisiones clave

1. **Granularidad por LOTE** en `courier_inventory` (preserva COGS y FEFO).
2. **Validar stock al ASIGNAR** la orden, no al entregar. La bodega fisica del courier ES la reserva (no se usa tabla `stock_reservations`).
3. **NO cambiar la semantica de `products.stock`**. Sigue siendo "central fisico". Crear vista `inventory_global` para visiones agregadas.
4. **Devolucion del cliente** queda en bodega del courier, con `inventory_movements type='return'` explicito (movement gemelo al outbound, mismo `lot_id`).
5. **Cierre de turno unificado**: una sola pantalla y action que cierra caja + procesa devolucion/carryover de bodega.
6. **Idempotency en `confirmDelivery`** via tabla `delivery_attempts` con UNIQUE (order_id, attempt_key).
7. **Offline robusto = Fase 2**. En MVP las mutaciones requieren conexion (banner si offline).
8. **"Bodega" como drawer/pantalla accesible desde Entregas en MVP** (no agregar 5a tab al bottom nav).

## Visibilidad

| Quien | Ve |
|-------|-----|
| Admin | Todas las bodegas de sus couriers, transferencias hacia/desde, ajustes pendientes, vista global |
| Courier | Solo su propia bodega (RLS), sus transferencias, su historial |
| Super admin | Todo |

## Esquema DB nuevo

- `courier_inventory(id, courier_id, admin_id, product_id, lot_id, quantity_remaining, received_at, updated_at)` UNIQUE (courier_id, lot_id).
- `stock_transfers(id, admin_id, courier_id, kind, status, notes, created_by, created_at, completed_at, cancelled_at, cancel_reason)`. `kind IN ('dispatch','return','adjustment')`.
- `stock_transfer_lines(id, transfer_id, product_id, lot_id, quantity, unit_cost_snapshot, admin_id)`.
- `pending_inventory_adjustments(id, courier_id, admin_id, order_item_id, product_id, quantity, reason, status, created_at, resolved_at, resolved_by, resolution_note)`.
- `delivery_attempts(id, order_id, attempt_key, courier_id, created_at)` UNIQUE (order_id, attempt_key).
- `inventory_movements`: agregar columna `courier_id UUID NULL`. Ampliar enum `type` con `'transfer_out'`, `'transfer_in'`.
- `cash_closings`: UNIQUE `(courier_id, date)`.

## RPCs nuevas

- `transfer_to_courier(p_admin_id, p_courier_id, p_lines jsonb, p_notes)` -> uuid (transfer_id). Atomica, FOR UPDATE en product_lots, FIFO.
- `return_from_courier(p_admin_id, p_courier_id, p_lines jsonb, p_kind text, p_notes)` -> uuid. Devuelve al lote original (no FIFO).
- `deduct_courier_stock(p_courier_id, p_admin_id, p_product_id, p_quantity, p_order_item_id, p_order_reference, p_notes)` -> TABLE(lot_id, allocated_qty, unit_cost). FIFO sobre courier_inventory. Rechaza con stock insuficiente.
- `return_courier_stock_by_item(p_order_item_id, p_quantity, p_admin_id)` -> void. Rollback espejo.
- `validate_courier_has_stock(p_courier_id, p_items jsonb)` -> jsonb (productos faltantes). Para uso en assignCourier.

## Vistas

- `inventory_global(product_id, admin_id, warehouse_qty, courier_qty, total_qty)`.
- `courier_inventory_summary(courier_id, admin_id, product_id, product_name, total_units, lots_count, earliest_expiry)`.
- `inventory_reconciliation` (drift por producto: total_received - total_sold - in_warehouse - in_couriers).

## Flujos de Server Action

### Admin
- `transferStockToCourier(courier_id, lines)` -> verifyAdmin, RPC transfer_to_courier.
- `returnStockFromCourier(courier_id, lines, reason)` -> verifyAdmin, RPC return_from_courier.
- `listCourierInventory(courier_id?)` -> admin lista uno o todos.
- `listPendingAdjustments()` y `resolvePendingAdjustment(id, note)`.

### Courier
- `getMyInventory()` -> agrupado por producto, expone lote solo si vence pronto.
- `closeDailyShift({reported_total, returns, carryovers, notes})` -> transaccion: cash_closings + return_from_courier en una sola operacion via RPC.

### Modificadas
- `createOrder`: ahora valida contra stock GLOBAL (vista `inventory_global`).
- `assignCourier`: valida que el courier tenga stock en su bodega (`validate_courier_has_stock`). Si no, error.
- `confirmDelivery`: acepta `attempt_key` opcional, registra en `delivery_attempts` (UNIQUE = idempotency), y llama `deduct_courier_stock`. Devolucion del cliente registra movement explicito tipo 'return' al lote del courier.

## RLS

- `courier_inventory`: super_admin all; admin filter `admin_id`; courier filter `courier_id = auth.uid() AND admin_id = get_admin_id()`. Bloqueo DELETE.
- `stock_transfers`/`stock_transfer_lines`: admin all en su tenant; courier read-only de las suyas. Bloqueo DELETE.
- `pending_inventory_adjustments`: admin full; courier read-only.
- `delivery_attempts`: courier insert/select propias; admin read en tenant.

## UI

### Admin
- `/inventory` -> nueva tab "Bodegas couriers". Lista de couriers con resumen.
- Drawer/dialogo "Transferir stock" con multi-producto, valida stock central, ejecuta transferencia.
- Banner en dashboard si hay `pending_inventory_adjustments`.

### Courier
- Boton "Mi Bodega" en header de Entregas -> pantalla full con lista agregada por producto.
- Pantalla "Recibir transferencia" si hay alguna pendiente (en MVP, recepcion automatica al transferir; status='completed' directo).
- Pantalla "Cerrar turno" unificada (caja + bodega): tres opciones por producto remanente (devolver / carryover / faltante).
- En "Confirmar entrega": cantidad clamped a stock disponible. Hard-error si no tiene stock.

## Riesgos cubiertos en MVP

- R1 createOrder valida contra stock global (no rompe).
- R2 No requiere backfill destructivo; courier_inventory arranca vacia.
- R3 RLS courier-scoped probada.
- R4 Idempotency en confirmDelivery via delivery_attempts.
- R5 Vista de reconciliacion + alerta manual (cron Fase 2).
- R6 Trigger BEFORE UPDATE bloquea desactivacion de courier con stock.
- R9 UNIQUE (courier_id, date) en cash_closings.

## Fuera de scope MVP

- Background sync offline robusto (Fase 2).
- Solicitar stock por parte del courier (Fase 2).
- Reasignacion automatica con reclaim_stock (admin debe pedir devolucion + transferir).
- Notificaciones push (Fase 2).
- Vista materializada de reconciliacion + cron de alerta (Fase 2).
