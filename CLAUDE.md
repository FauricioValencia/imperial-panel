# CLAUDE.md - Imperial Apps

## Proyecto
Sistema de gestion de entregas/domicilios con panel admin y app para mensajeros (PWA).

## Stack
- **Framework**: Next.js 15 (App Router, Server Components, Server Actions)
- **Lenguaje**: TypeScript estricto (no `any`, no `as` innecesarios)
- **DB**: PostgreSQL via Supabase
- **Auth**: Supabase Auth con @supabase/ssr
- **UI**: shadcn/ui + Tailwind CSS 4
- **Logging**: Winston + @google-cloud/logging-winston
- **Validacion**: Zod en todas las Server Actions
- **PDF**: @react-pdf/renderer
- **PWA**: Service Worker + manifest.ts

## Estructura del proyecto
```
src/app/(admin)/    → Panel administrativo (requiere rol admin)
src/app/(mensajero)/ → App mensajeros PWA (requiere rol mensajero)
src/app/(auth)/     → Login/auth pages
src/app/api/        → Route Handlers (PDF, webhooks)
src/actions/        → Server Actions (logica de negocio)
src/components/ui/  → shadcn/ui base components
src/components/admin/ → Componentes panel admin
src/components/mensajero/ → Componentes app mensajero
src/lib/            → Utilidades (supabase, logger, pdf, validations)
src/types/          → TypeScript type definitions
supabase/migrations/ → SQL migrations
```

## Reglas de codigo

### General
- Escribir en espanol: nombres de variables de negocio, comentarios, commits.
- Nombres de archivos y carpetas en kebab-case.
- Un componente por archivo.
- Exportar componentes como named exports, no default exports (excepto pages de Next.js).
- Maximo 300 lineas por archivo. Si crece, dividir.

### TypeScript
- Strict mode habilitado.
- No usar `any`. Definir tipos en `src/types/`.
- Interfaces para objetos de dominio, types para unions y utilidades.
- Zod schemas como fuente de verdad para validacion y tipos:
  ```ts
  const pagoSchema = z.object({ ... });
  type Pago = z.infer<typeof pagoSchema>;
  ```

### Server Actions (src/actions/)
- Toda Server Action debe:
  1. Validar input con Zod.
  2. Verificar autenticacion y rol.
  3. Ejecutar logica de negocio.
  4. Registrar log de la operacion.
  5. Retornar `{ success: boolean, data?: T, error?: string }`.
- Nunca exponer IDs internos al cliente sin necesidad.
- Usar funciones RPC de Supabase para operaciones de stock (concurrencia).

### Supabase
- Dos clientes: `lib/supabase/client.ts` (browser) y `lib/supabase/server.ts` (server).
- Siempre usar `supabase.auth.getUser()` para verificar auth (no confiar solo en session).
- RLS habilitado en TODAS las tablas.
- Migrations en `supabase/migrations/` con nombres descriptivos.

### Componentes React
- Server Components por defecto. Solo usar 'use client' cuando sea estrictamente necesario.
- Hooks personalizados en `src/hooks/`.
- No duplicar estado que ya existe en el servidor.
- Formularios con Server Actions, no con fetch manual a APIs.

### Logging
- Log obligatorio en: pagos, cambios de stock, cambios de estado de pedido, auth.
- Niveles: error (fallos), warn (situaciones inusuales), info (operaciones de negocio).
- Incluir siempre: usuario_id, accion, datos relevantes.
- En desarrollo: console. En produccion: Google Cloud Logging.

## UX / Diseno

### Paleta de colores
```
Primario:     #1E3A5F  (Azul oscuro - confianza, profesionalismo)
Secundario:   #3B82F6  (Azul medio - acciones, enlaces)
Acento:       #10B981  (Verde esmeralda - confirmaciones, exito, entregas completadas)
Alerta:       #F59E0B  (Ambar - advertencias, stock bajo)
Error:        #EF4444  (Rojo - errores, saldos pendientes altos)
Fondo:        #F8FAFC  (Gris muy claro)
Superficie:   #FFFFFF  (Blanco - tarjetas, modales)
Texto:        #1E293B  (Gris oscuro)
Texto sec:    #64748B  (Gris medio)
```

### Principios UX
- **Panel Admin**: Densidad de informacion alta, tablas con filtros, acciones en bulk.
  - Sidebar fijo a la izquierda.
  - Breadcrumbs para navegacion.
  - Tablas con paginacion server-side.
  - Dashboards con datos reales, no decorativos.

- **App Mensajero**: Minimalista, optimizada para una mano, botones grandes.
  - Bottom navigation (4 tabs max).
  - Flujo de 3 pasos max para cualquier operacion.
  - Feedback tactil en acciones (estados de carga claros).
  - Colores de estado evidentes: verde=entregado, amarillo=en camino, rojo=problema.
  - Funciona offline (IndexedDB + sync).

### Accesibilidad
- Contraste WCAG AA minimo.
- Labels en todos los inputs de formulario.
- Focus visible en todos los elementos interactivos.
- Tamano minimo de target tactil: 44x44px en app mensajero.

## Base de datos - Reglas

### Referencia de esquema
- **`docs/DATABASE.md`**: Documentacion manual con diagrama ERD (Mermaid), diccionario de datos y flujos de negocio.
- **`docs/DB_SNAPSHOT.md`**: Generado automaticamente desde la DB real. Ejecutar `npm run db:snapshot` para regenerar.
- **`supabase/migrations/`**: Migraciones SQL versionadas. Toda modificacion de esquema va aqui.

### Flujo para cambios de esquema
1. Crear nueva migracion en `supabase/migrations/` con nombre descriptivo (ej: `002_agregar_campo_x.sql`).
2. Ejecutar la migracion en Supabase (SQL Editor o CLI).
3. Ejecutar `npm run db:snapshot` para capturar el estado real de la DB (tablas, policies, functions, triggers, indices).
4. Actualizar `docs/DATABASE.md` con los cambios conceptuales (diagrama, flujos, reglas).
5. Siempre consultar `docs/DB_SNAPSHOT.md` antes de escribir queries o actions para verificar la estructura actual.

### Nunca hacer
- DELETE en tablas de clientes, productos o usuarios. Usar soft delete (campo `activo`).
- Modificar `productos.stock` directamente con UPDATE. Siempre usar funciones RPC (`descontar_stock`, `reingresar_stock`).
- Queries sin indice en tablas grandes.
- Editar `docs/DB_SNAPSHOT.md` manualmente. Siempre regenerar con `npm run db:snapshot`.

### Siempre hacer
- Auditoría via tabla `audit_log` para operaciones financieras (triggers automaticos en pagos, pedidos, movimientos, productos).
- Transacciones para operaciones que modifican multiples tablas.
- Indices en foreign keys y campos de filtro frecuente.
- Consultar `docs/DB_SNAPSHOT.md` para verificar policies, functions y estructura real antes de desarrollar.

## Testing
- Vitest para unit tests de funciones y Server Actions.
- Playwright para E2E de flujos criticos:
  - Login admin y mensajero.
  - Crear pedido, asignar, entregar.
  - Registrar pago completo y abono.
  - Generar PDF de cobro.
- Tests antes de merge a main.

## Git
- Rama `main` protegida.
- Feature branches: `feat/nombre-feature`.
- Fix branches: `fix/descripcion-fix`.
- Commits en espanol, formato: `tipo: descripcion breve`
  - Ejemplo: `feat: agregar registro de pagos parciales`
- No commitear .env, credenciales, ni archivos de build.
