# DB Snapshot - Imperial Apps

> Generado automaticamente el 2026-05-04 13:56:33
> **NO editar manualmente.** Ejecutar `./scripts/db-snapshot.sh` para regenerar.

---

## Tablas y Columnas

### `audit_log`
| Columna | Tipo | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| table_name | text | NO |  |
| record_id | uuid | NO |  |
| action | text | NO |  |
| old_data | jsonb | YES |  |
| new_data | jsonb | YES |  |
| user_id | uuid | YES |  |
| created_at | timestamp with time zone | YES | now() |
| admin_id | uuid | YES |  |

### `business_config`
| Columna | Tipo | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| company_name | text | NO |  |
| tax_id | text | YES |  |
| phone | text | YES |  |
| address | text | YES |  |
| payment_terms | text | YES |  |
| logo_url | text | YES |  |
| updated_at | timestamp with time zone | YES | now() |
| admin_id | uuid | NO |  |

### `cash_closings`
| Columna | Tipo | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| courier_id | uuid | NO |  |
| date | date | NO |  |
| reported_total | numeric(12,2) | NO |  |
| system_total | numeric(12,2) | NO |  |
| difference | numeric(12,2) | YES |  |
| status | text | YES | 'pending'::text |
| notes | text | YES |  |
| created_at | timestamp with time zone | YES | now() |
| admin_id | uuid | NO |  |

### `customer_charges`
| Columna | Tipo | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| customer_id | uuid | NO |  |
| admin_id | uuid | NO |  |
| amount | numeric(12,2) | NO |  |
| charge_type | text | NO |  |
| reason | text | NO |  |
| due_date | date | YES |  |
| cancelled_at | timestamp with time zone | YES |  |
| cancelled_by | uuid | YES |  |
| cancel_reason | text | YES |  |
| created_by | uuid | NO |  |
| created_at | timestamp with time zone | NO | now() |

### `customers`
| Columna | Tipo | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| name | text | NO |  |
| phone | text | YES |  |
| address | text | YES |  |
| pending_balance | numeric(12,2) | YES | 0 |
| active | boolean | YES | true |
| created_at | timestamp with time zone | YES | now() |
| admin_id | uuid | NO |  |
| reference_code | text | YES |  |
| preferred_courier_id | uuid | YES |  |
| commercial_id | uuid | YES |  |

### `inventory_movements`
| Columna | Tipo | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| product_id | uuid | NO |  |
| type | text | NO |  |
| quantity | integer | NO |  |
| order_reference | uuid | YES |  |
| notes | text | YES |  |
| created_at | timestamp with time zone | YES | now() |
| admin_id | uuid | NO |  |
| reason | text | YES |  |
| sample_customer_id | uuid | YES |  |
| lot_id | uuid | YES |  |
| unit_cost_snapshot | numeric(14,2) | YES |  |
| order_item_id | uuid | YES |  |

### `order_items`
| Columna | Tipo | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| order_id | uuid | NO |  |
| product_id | uuid | NO |  |
| quantity | integer | NO |  |
| unit_price | numeric(12,2) | NO |  |
| returned | boolean | YES | false |
| returned_quantity | integer | YES | 0 |
| admin_id | uuid | NO |  |

### `orders`
| Columna | Tipo | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| customer_id | uuid | NO |  |
| courier_id | uuid | YES |  |
| status | text | NO | 'pending'::text |
| total | numeric(12,2) | NO | 0 |
| notes | text | YES |  |
| assigned_at | timestamp with time zone | YES |  |
| delivered_at | timestamp with time zone | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |
| admin_id | uuid | NO |  |

### `outbound_lot_allocations`
| Columna | Tipo | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| order_item_id | uuid | NO |  |
| lot_id | uuid | NO |  |
| quantity | integer | NO |  |
| unit_cost_snapshot | numeric(14,2) | NO |  |
| admin_id | uuid | NO |  |
| created_at | timestamp with time zone | NO | now() |

### `payments`
| Columna | Tipo | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| order_id | uuid | NO |  |
| customer_id | uuid | NO |  |
| amount | numeric(12,2) | NO |  |
| type | text | NO |  |
| payment_method | text | YES | 'cash'::text |
| registered_by | uuid | NO |  |
| created_at | timestamp with time zone | YES | now() |
| admin_id | uuid | NO |  |

### `product_lots`
| Columna | Tipo | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| product_id | uuid | NO |  |
| admin_id | uuid | NO |  |
| lot_number | text | NO |  |
| unit_cost | numeric(14,2) | NO |  |
| is_estimated_cost | boolean | NO | false |
| quantity_received | integer | NO |  |
| quantity_remaining | integer | NO |  |
| received_at | timestamp with time zone | NO | now() |
| expires_at | timestamp with time zone | YES | (now() + '1 mon'::interval) |
| supplier | text | YES |  |
| notes | text | YES |  |
| active | boolean | NO | true |
| created_at | timestamp with time zone | NO | now() |
| suggested_price | numeric(14,2) | YES |  |

### `products`
| Columna | Tipo | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| name | text | NO |  |
| description | text | YES |  |
| price | numeric(12,2) | NO |  |
| stock | integer | NO | 0 |
| min_stock | integer | YES | 5 |
| active | boolean | YES | true |
| created_at | timestamp with time zone | YES | now() |
| admin_id | uuid | NO |  |
| codigo | text | YES |  |
| stock_available | integer | NO | 0 |

### `users`
| Columna | Tipo | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO |  |
| email | text | NO |  |
| name | text | NO |  |
| role | text | NO |  |
| active | boolean | YES | true |
| created_at | timestamp with time zone | YES | now() |
| admin_id | uuid | YES |  |
| zone_id | uuid | YES |  |

### `zones`
| Columna | Tipo | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| name | text | NO |  |
| description | text | YES |  |
| admin_id | uuid | NO |  |
| active | boolean | NO | true |
| created_at | timestamp with time zone | NO | now() |

---

## Vistas

### `current_inventory_valuation`
```sql
 SELECT pl.product_id,
    p.name AS product_name,
    p.codigo AS product_code,
    pl.admin_id,
    count(*) AS active_lots_count,
    sum(pl.quantity_remaining) AS total_units_available,
    sum(pl.quantity_remaining::numeric * pl.unit_cost) AS total_inventory_value,
        CASE
            WHEN sum(pl.quantity_remaining) > 0 THEN round(sum(pl.quantity_remaining::numeric * pl.unit_cost) / sum(pl.quantity_remaining)::numeric, 2)
            ELSE NULL::numeric
        END AS weighted_avg_cost,
    min(pl.unit_cost) AS min_lot_cost,
    max(pl.unit_cost) AS max_lot_cost
   FROM product_lots pl
     JOIN products p ON p.id = pl.product_id
  WHERE pl.active = true AND pl.quantity_remaining > 0 AND (pl.expires_at IS NULL OR pl.expires_at > now())
  GROUP BY pl.product_id, p.name, p.codigo, pl.admin_id;
```

### `customer_ledger`
```sql
 SELECT p.id,
    p.customer_id,
    p.admin_id,
    'payment'::text AS entry_type,
    p.payment_method AS subtype,
    - p.amount AS amount_signed,
    p.amount,
    p.order_id,
    NULL::text AS reason,
    NULL::timestamp with time zone AS cancelled_at,
    p.registered_by AS actor_id,
    p.created_at
   FROM payments p
UNION ALL
 SELECT c.id,
    c.customer_id,
    c.admin_id,
    'charge'::text AS entry_type,
    c.charge_type AS subtype,
    c.amount AS amount_signed,
    c.amount,
    NULL::uuid AS order_id,
    c.reason,
    c.cancelled_at,
    c.created_by AS actor_id,
    c.created_at
   FROM customer_charges c;
```

### `lot_profitability_view`
```sql
 SELECT a.id AS allocation_id,
    a.lot_id,
    pl.lot_number,
    pl.product_id,
    p.name AS product_name,
    p.codigo AS product_code,
    a.order_item_id,
    oi.order_id,
    o.status AS order_status,
    o.delivered_at,
    a.admin_id,
    a.quantity AS quantity_sold,
    a.unit_cost_snapshot,
    oi.unit_price,
    oi.unit_price - a.unit_cost_snapshot AS unit_margin,
    a.quantity::numeric * a.unit_cost_snapshot AS total_cost,
    a.quantity::numeric * oi.unit_price AS total_revenue,
    a.quantity::numeric * (oi.unit_price - a.unit_cost_snapshot) AS total_margin,
        CASE
            WHEN a.unit_cost_snapshot > 0::numeric THEN round((oi.unit_price - a.unit_cost_snapshot) / a.unit_cost_snapshot * 100::numeric, 2)
            ELSE NULL::numeric
        END AS margin_percent,
    a.created_at AS allocated_at
   FROM outbound_lot_allocations a
     JOIN product_lots pl ON pl.id = a.lot_id
     JOIN products p ON p.id = pl.product_id
     JOIN order_items oi ON oi.id = a.order_item_id
     JOIN orders o ON o.id = oi.order_id
  WHERE o.status = ANY (ARRAY['delivered'::text, 'partial'::text]);
```

### `monthly_cogs_by_product`
```sql
 SELECT pl.admin_id,
    pl.product_id,
    p.name AS product_name,
    p.codigo AS product_code,
    date_trunc('month'::text, o.delivered_at)::date AS month,
    sum(a.quantity) AS units_sold,
    sum(a.quantity::numeric * a.unit_cost_snapshot) AS total_cogs,
    sum(a.quantity::numeric * oi.unit_price) AS total_revenue,
    sum(a.quantity::numeric * (oi.unit_price - a.unit_cost_snapshot)) AS total_margin,
        CASE
            WHEN sum(a.quantity::numeric * oi.unit_price) > 0::numeric THEN round(sum(a.quantity::numeric * (oi.unit_price - a.unit_cost_snapshot)) / sum(a.quantity::numeric * oi.unit_price) * 100::numeric, 2)
            ELSE NULL::numeric
        END AS margin_percent,
    count(DISTINCT a.order_item_id) AS items_count,
    count(DISTINCT oi.order_id) AS orders_count
   FROM outbound_lot_allocations a
     JOIN product_lots pl ON pl.id = a.lot_id
     JOIN products p ON p.id = pl.product_id
     JOIN order_items oi ON oi.id = a.order_item_id
     JOIN orders o ON o.id = oi.order_id
  WHERE (o.status = ANY (ARRAY['delivered'::text, 'partial'::text])) AND o.delivered_at IS NOT NULL
  GROUP BY pl.admin_id, pl.product_id, p.name, p.codigo, (date_trunc('month'::text, o.delivered_at));
```

### `outbound_lot_allocations_courier`
```sql
 SELECT id,
    order_item_id,
    lot_id,
    quantity,
    admin_id,
    created_at
   FROM outbound_lot_allocations
  WHERE admin_id = get_admin_id();
```

### `product_lots_courier`
```sql
 SELECT id,
    product_id,
    admin_id,
    lot_number,
    quantity_received,
    quantity_remaining,
    received_at,
    expires_at,
    active,
    created_at
   FROM product_lots
  WHERE admin_id = get_admin_id() AND active = true AND quantity_remaining > 0;
```

---

## Constraints

| Tabla | Constraint | Tipo | Detalle |
|-------|-----------|------|---------|
| audit_log | 2200_17649_1_not_null | CHECK |  |
| audit_log | 2200_17649_2_not_null | CHECK |  |
| audit_log | 2200_17649_3_not_null | CHECK |  |
| audit_log | 2200_17649_4_not_null | CHECK |  |
| audit_log | audit_log_action_check | CHECK | CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text]))) |
| audit_log | audit_log_pkey | PRIMARY KEY | id |
| business_config | 2200_17640_1_not_null | CHECK |  |
| business_config | 2200_17640_2_not_null | CHECK |  |
| business_config | 2200_17640_9_not_null | CHECK |  |
| business_config | business_config_admin_id_fkey | FOREIGN KEY |  |
| business_config | configuracion_negocio_pkey | PRIMARY KEY | id |
| cash_closings | 2200_17623_10_not_null | CHECK |  |
| cash_closings | 2200_17623_1_not_null | CHECK |  |
| cash_closings | 2200_17623_2_not_null | CHECK |  |
| cash_closings | 2200_17623_3_not_null | CHECK |  |
| cash_closings | 2200_17623_4_not_null | CHECK |  |
| cash_closings | 2200_17623_5_not_null | CHECK |  |
| cash_closings | cash_closings_status_check | CHECK | CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'with_difference'::text]))) |
| cash_closings | cash_closings_admin_id_fkey | FOREIGN KEY |  |
| cash_closings | cierres_caja_mensajero_id_fkey | FOREIGN KEY | courier_id -> users(id) |
| cash_closings | cierres_caja_pkey | PRIMARY KEY | id |
| customer_charges | 2200_41854_11_not_null | CHECK |  |
| customer_charges | 2200_41854_12_not_null | CHECK |  |
| customer_charges | 2200_41854_1_not_null | CHECK |  |
| customer_charges | 2200_41854_2_not_null | CHECK |  |
| customer_charges | 2200_41854_3_not_null | CHECK |  |
| customer_charges | 2200_41854_4_not_null | CHECK |  |
| customer_charges | 2200_41854_5_not_null | CHECK |  |
| customer_charges | 2200_41854_6_not_null | CHECK |  |
| customer_charges | customer_charges_amount_check | CHECK | CHECK (((amount > (0)::numeric) AND (amount <= (50000000)::numeric))) |
| customer_charges | customer_charges_charge_type_check | CHECK | CHECK ((charge_type = ANY (ARRAY['legacy_debt'::text, 'adjustment'::text, 'late_fee'::text, 'service'::text, 'other'::text]))) |
| customer_charges | customer_charges_reason_check | CHECK | CHECK (((length(TRIM(BOTH FROM reason)) >= 5) AND (length(TRIM(BOTH FROM reason)) <= 500))) |
| customer_charges | customer_charges_admin_id_fkey | FOREIGN KEY |  |
| customer_charges | customer_charges_cancelled_by_fkey | FOREIGN KEY |  |
| customer_charges | customer_charges_created_by_fkey | FOREIGN KEY |  |
| customer_charges | customer_charges_customer_id_fkey | FOREIGN KEY | customer_id -> customers(id) |
| customer_charges | customer_charges_pkey | PRIMARY KEY | id |
| customers | 2200_17512_1_not_null | CHECK |  |
| customers | 2200_17512_2_not_null | CHECK |  |
| customers | 2200_17512_8_not_null | CHECK |  |
| customers | customers_admin_id_fkey | FOREIGN KEY |  |
| customers | customers_commercial_id_fkey | FOREIGN KEY | commercial_id -> users(id) |
| customers | customers_preferred_courier_id_fkey | FOREIGN KEY | preferred_courier_id -> users(id) |
| customers | clientes_pkey | PRIMARY KEY | id |
| inventory_movements | 2200_17603_1_not_null | CHECK |  |
| inventory_movements | 2200_17603_2_not_null | CHECK |  |
| inventory_movements | 2200_17603_3_not_null | CHECK |  |
| inventory_movements | 2200_17603_4_not_null | CHECK |  |
| inventory_movements | 2200_17603_8_not_null | CHECK |  |
| inventory_movements | chk_muestra_requiere_cliente | CHECK | CHECK (((reason <> 'muestra'::text) OR (sample_customer_id IS NOT NULL))) |
| inventory_movements | chk_muestra_requiere_cliente | CHECK | CHECK (((reason <> 'muestra'::text) OR (sample_customer_id IS NOT NULL))) |
| inventory_movements | inventory_movements_type_check | CHECK | CHECK ((type = ANY (ARRAY['inbound'::text, 'outbound'::text, 'return'::text, 'adjustment'::text]))) |
| inventory_movements | inventory_movements_admin_id_fkey | FOREIGN KEY |  |
| inventory_movements | inventory_movements_lot_id_fkey | FOREIGN KEY | lot_id -> product_lots(id) |
| inventory_movements | inventory_movements_order_item_id_fkey | FOREIGN KEY | order_item_id -> order_items(id) |
| inventory_movements | inventory_movements_sample_customer_id_fkey | FOREIGN KEY | sample_customer_id -> customers(id) |
| inventory_movements | movimientos_inventario_producto_id_fkey | FOREIGN KEY | product_id -> products(id) |
| inventory_movements | movimientos_inventario_referencia_pedido_fkey | FOREIGN KEY | order_reference -> orders(id) |
| inventory_movements | movimientos_inventario_pkey | PRIMARY KEY | id |
| order_items | 2200_17558_1_not_null | CHECK |  |
| order_items | 2200_17558_2_not_null | CHECK |  |
| order_items | 2200_17558_3_not_null | CHECK |  |
| order_items | 2200_17558_4_not_null | CHECK |  |
| order_items | 2200_17558_5_not_null | CHECK |  |
| order_items | 2200_17558_8_not_null | CHECK |  |
| order_items | order_items_admin_id_fkey | FOREIGN KEY |  |
| order_items | pedido_items_pedido_id_fkey | FOREIGN KEY | order_id -> orders(id) |
| order_items | pedido_items_producto_id_fkey | FOREIGN KEY | product_id -> products(id) |
| order_items | pedido_items_pkey | PRIMARY KEY | id |
| orders | 2200_17535_11_not_null | CHECK |  |
| orders | 2200_17535_1_not_null | CHECK |  |
| orders | 2200_17535_2_not_null | CHECK |  |
| orders | 2200_17535_4_not_null | CHECK |  |
| orders | 2200_17535_5_not_null | CHECK |  |
| orders | orders_status_check | CHECK | CHECK ((status = ANY (ARRAY['pending'::text, 'assigned'::text, 'in_transit'::text, 'delivered'::text, 'returned'::text, 'partial'::text]))) |
| orders | orders_admin_id_fkey | FOREIGN KEY |  |
| orders | pedidos_cliente_id_fkey | FOREIGN KEY | customer_id -> customers(id) |
| orders | pedidos_mensajero_id_fkey | FOREIGN KEY | courier_id -> users(id) |
| orders | pedidos_pkey | PRIMARY KEY | id |
| outbound_lot_allocations | 2200_41735_1_not_null | CHECK |  |
| outbound_lot_allocations | 2200_41735_2_not_null | CHECK |  |
| outbound_lot_allocations | 2200_41735_3_not_null | CHECK |  |
| outbound_lot_allocations | 2200_41735_4_not_null | CHECK |  |
| outbound_lot_allocations | 2200_41735_5_not_null | CHECK |  |
| outbound_lot_allocations | 2200_41735_6_not_null | CHECK |  |
| outbound_lot_allocations | 2200_41735_7_not_null | CHECK |  |
| outbound_lot_allocations | outbound_lot_allocations_quantity_check | CHECK | CHECK ((quantity > 0)) |
| outbound_lot_allocations | outbound_lot_allocations_admin_id_fkey | FOREIGN KEY |  |
| outbound_lot_allocations | outbound_lot_allocations_lot_id_fkey | FOREIGN KEY | lot_id -> product_lots(id) |
| outbound_lot_allocations | outbound_lot_allocations_order_item_id_fkey | FOREIGN KEY | order_item_id -> order_items(id) |
| outbound_lot_allocations | outbound_lot_allocations_pkey | PRIMARY KEY | id |
| payments | 2200_17576_1_not_null | CHECK |  |
| payments | 2200_17576_2_not_null | CHECK |  |
| payments | 2200_17576_3_not_null | CHECK |  |
| payments | 2200_17576_4_not_null | CHECK |  |
| payments | 2200_17576_5_not_null | CHECK |  |
| payments | 2200_17576_7_not_null | CHECK |  |
| payments | 2200_17576_9_not_null | CHECK |  |
| payments | payments_payment_method_check | CHECK | CHECK ((payment_method = ANY (ARRAY['cash'::text, 'transfer'::text, 'nequi'::text, 'daviplata'::text]))) |
| payments | payments_type_check | CHECK | CHECK ((type = ANY (ARRAY['full'::text, 'partial'::text]))) |
| payments | pagos_cliente_id_fkey | FOREIGN KEY | customer_id -> customers(id) |
| payments | pagos_pedido_id_fkey | FOREIGN KEY | order_id -> orders(id) |
| payments | pagos_registrado_por_fkey | FOREIGN KEY | registered_by -> users(id) |
| payments | payments_admin_id_fkey | FOREIGN KEY |  |
| payments | pagos_pkey | PRIMARY KEY | id |
| product_lots | 2200_41700_13_not_null | CHECK |  |
| product_lots | 2200_41700_14_not_null | CHECK |  |
| product_lots | 2200_41700_1_not_null | CHECK |  |
| product_lots | 2200_41700_2_not_null | CHECK |  |
| product_lots | 2200_41700_3_not_null | CHECK |  |
| product_lots | 2200_41700_4_not_null | CHECK |  |
| product_lots | 2200_41700_5_not_null | CHECK |  |
| product_lots | 2200_41700_6_not_null | CHECK |  |
| product_lots | 2200_41700_7_not_null | CHECK |  |
| product_lots | 2200_41700_8_not_null | CHECK |  |
| product_lots | 2200_41700_9_not_null | CHECK |  |
| product_lots | chk_expires_after_received | CHECK | CHECK (((expires_at IS NULL) OR (expires_at >= received_at))) |
| product_lots | chk_expires_after_received | CHECK | CHECK (((expires_at IS NULL) OR (expires_at >= received_at))) |
| product_lots | chk_remaining_le_received | CHECK | CHECK ((quantity_remaining <= quantity_received)) |
| product_lots | chk_remaining_le_received | CHECK | CHECK ((quantity_remaining <= quantity_received)) |
| product_lots | product_lots_quantity_received_check | CHECK | CHECK ((quantity_received > 0)) |
| product_lots | product_lots_quantity_remaining_check | CHECK | CHECK ((quantity_remaining >= 0)) |
| product_lots | product_lots_suggested_price_check | CHECK | CHECK (((suggested_price IS NULL) OR (suggested_price >= (0)::numeric))) |
| product_lots | product_lots_unit_cost_check | CHECK | CHECK ((unit_cost >= (0)::numeric)) |
| product_lots | product_lots_admin_id_fkey | FOREIGN KEY |  |
| product_lots | product_lots_product_id_fkey | FOREIGN KEY | product_id -> products(id) |
| product_lots | product_lots_pkey | PRIMARY KEY | id |
| products | 2200_17523_11_not_null | CHECK |  |
| products | 2200_17523_1_not_null | CHECK |  |
| products | 2200_17523_2_not_null | CHECK |  |
| products | 2200_17523_4_not_null | CHECK |  |
| products | 2200_17523_5_not_null | CHECK |  |
| products | 2200_17523_9_not_null | CHECK |  |
| products | products_admin_id_fkey | FOREIGN KEY |  |
| products | productos_pkey | PRIMARY KEY | id |
| users | 2200_17495_1_not_null | CHECK |  |
| users | 2200_17495_2_not_null | CHECK |  |
| users | 2200_17495_3_not_null | CHECK |  |
| users | 2200_17495_4_not_null | CHECK |  |
| users | users_role_check | CHECK | CHECK ((role = ANY (ARRAY['admin'::text, 'courier'::text, 'super_admin'::text, 'commercial'::text]))) |
| users | users_admin_id_fkey | FOREIGN KEY |  |
| users | users_zone_id_fkey | FOREIGN KEY | zone_id -> zones(id) |
| users | usuarios_id_fkey | FOREIGN KEY |  |
| users | usuarios_pkey | PRIMARY KEY | id |
| users | usuarios_email_key | UNIQUE | email |
| zones | 2200_33517_1_not_null | CHECK |  |
| zones | 2200_33517_2_not_null | CHECK |  |
| zones | 2200_33517_4_not_null | CHECK |  |
| zones | 2200_33517_5_not_null | CHECK |  |
| zones | 2200_33517_6_not_null | CHECK |  |
| zones | zones_admin_id_fkey | FOREIGN KEY |  |
| zones | zones_pkey | PRIMARY KEY | id |

---

## Indices

| Nombre | Tabla | Definicion |
|--------|-------|-----------|
| idx_audit_created | audit_log | `CREATE INDEX idx_audit_created ON public.audit_log USING btree (created_at)` |
| idx_audit_log_admin | audit_log | `CREATE INDEX idx_audit_log_admin ON public.audit_log USING btree (admin_id)` |
| idx_audit_table | audit_log | `CREATE INDEX idx_audit_table ON public.audit_log USING btree (table_name, record_id)` |
| idx_business_config_admin | business_config | `CREATE INDEX idx_business_config_admin ON public.business_config USING btree (admin_id)` |
| idx_business_config_unique_admin | business_config | `CREATE UNIQUE INDEX idx_business_config_unique_admin ON public.business_config USING btree (admin_id)` |
| idx_cash_closings_admin | cash_closings | `CREATE INDEX idx_cash_closings_admin ON public.cash_closings USING btree (admin_id)` |
| idx_cash_closings_courier | cash_closings | `CREATE INDEX idx_cash_closings_courier ON public.cash_closings USING btree (courier_id)` |
| idx_cash_closings_date | cash_closings | `CREATE INDEX idx_cash_closings_date ON public.cash_closings USING btree (date)` |
| idx_customer_charges_admin | customer_charges | `CREATE INDEX idx_customer_charges_admin ON public.customer_charges USING btree (admin_id, created_at DESC)` |
| idx_customer_charges_customer | customer_charges | `CREATE INDEX idx_customer_charges_customer ON public.customer_charges USING btree (customer_id, created_at DESC) WHERE (cancelled_at IS NULL)` |
| customers_commercial_idx | customers | `CREATE INDEX customers_commercial_idx ON public.customers USING btree (commercial_id)` |
| customers_preferred_courier_idx | customers | `CREATE INDEX customers_preferred_courier_idx ON public.customers USING btree (preferred_courier_id)` |
| customers_reference_code_admin_idx | customers | `CREATE UNIQUE INDEX customers_reference_code_admin_idx ON public.customers USING btree (admin_id, lower(reference_code)) WHERE (reference_code IS NOT NULL)` |
| idx_customers_active | customers | `CREATE INDEX idx_customers_active ON public.customers USING btree (active)` |
| idx_customers_admin | customers | `CREATE INDEX idx_customers_admin ON public.customers USING btree (admin_id)` |
| idx_inventory_movements_admin | inventory_movements | `CREATE INDEX idx_inventory_movements_admin ON public.inventory_movements USING btree (admin_id)` |
| idx_inventory_movements_product | inventory_movements | `CREATE INDEX idx_inventory_movements_product ON public.inventory_movements USING btree (product_id)` |
| inventory_movements_lot_idx | inventory_movements | `CREATE INDEX inventory_movements_lot_idx ON public.inventory_movements USING btree (lot_id) WHERE (lot_id IS NOT NULL)` |
| inventory_movements_order_item_idx | inventory_movements | `CREATE INDEX inventory_movements_order_item_idx ON public.inventory_movements USING btree (order_item_id) WHERE (order_item_id IS NOT NULL)` |
| inventory_movements_reason_idx | inventory_movements | `CREATE INDEX inventory_movements_reason_idx ON public.inventory_movements USING btree (reason) WHERE (reason IS NOT NULL)` |
| idx_order_items_admin | order_items | `CREATE INDEX idx_order_items_admin ON public.order_items USING btree (admin_id)` |
| idx_order_items_order | order_items | `CREATE INDEX idx_order_items_order ON public.order_items USING btree (order_id)` |
| idx_orders_admin | orders | `CREATE INDEX idx_orders_admin ON public.orders USING btree (admin_id)` |
| idx_orders_courier | orders | `CREATE INDEX idx_orders_courier ON public.orders USING btree (courier_id)` |
| idx_orders_created | orders | `CREATE INDEX idx_orders_created ON public.orders USING btree (created_at)` |
| idx_orders_customer | orders | `CREATE INDEX idx_orders_customer ON public.orders USING btree (customer_id)` |
| idx_orders_status | orders | `CREATE INDEX idx_orders_status ON public.orders USING btree (status)` |
| orders_courier_delivered_idx | orders | `CREATE INDEX orders_courier_delivered_idx ON public.orders USING btree (courier_id, delivered_at) WHERE ((delivered_at IS NOT NULL) AND (status = ANY (ARRAY['delivered'::text, 'partial'::text])))` |
| orders_delivered_at_idx | orders | `CREATE INDEX orders_delivered_at_idx ON public.orders USING btree (delivered_at) WHERE (delivered_at IS NOT NULL)` |
| outbound_lot_allocations_admin_idx | outbound_lot_allocations | `CREATE INDEX outbound_lot_allocations_admin_idx ON public.outbound_lot_allocations USING btree (admin_id)` |
| outbound_lot_allocations_lot_idx | outbound_lot_allocations | `CREATE INDEX outbound_lot_allocations_lot_idx ON public.outbound_lot_allocations USING btree (lot_id)` |
| outbound_lot_allocations_order_item_idx | outbound_lot_allocations | `CREATE INDEX outbound_lot_allocations_order_item_idx ON public.outbound_lot_allocations USING btree (order_item_id)` |
| idx_payments_admin | payments | `CREATE INDEX idx_payments_admin ON public.payments USING btree (admin_id)` |
| idx_payments_customer | payments | `CREATE INDEX idx_payments_customer ON public.payments USING btree (customer_id)` |
| idx_payments_order | payments | `CREATE INDEX idx_payments_order ON public.payments USING btree (order_id)` |
| product_lots_admin_idx | product_lots | `CREATE INDEX product_lots_admin_idx ON public.product_lots USING btree (admin_id)` |
| product_lots_expires_idx | product_lots | `CREATE INDEX product_lots_expires_idx ON public.product_lots USING btree (admin_id, expires_at) WHERE ((quantity_remaining > 0) AND (active = true))` |
| product_lots_fifo_idx | product_lots | `CREATE INDEX product_lots_fifo_idx ON public.product_lots USING btree (product_id, received_at, id) WHERE (quantity_remaining > 0)` |
| product_lots_lot_number_admin_idx | product_lots | `CREATE UNIQUE INDEX product_lots_lot_number_admin_idx ON public.product_lots USING btree (admin_id, lot_number)` |
| idx_products_active | products | `CREATE INDEX idx_products_active ON public.products USING btree (active)` |
| idx_products_admin | products | `CREATE INDEX idx_products_admin ON public.products USING btree (admin_id)` |
| products_codigo_admin_idx | products | `CREATE UNIQUE INDEX products_codigo_admin_idx ON public.products USING btree (admin_id, lower(codigo)) WHERE (codigo IS NOT NULL)` |
| products_stock_available_idx | products | `CREATE INDEX products_stock_available_idx ON public.products USING btree (stock_available)` |
| idx_users_admin | users | `CREATE INDEX idx_users_admin ON public.users USING btree (admin_id)` |
| idx_users_role | users | `CREATE INDEX idx_users_role ON public.users USING btree (role)` |
| users_zone_id_idx | users | `CREATE INDEX users_zone_id_idx ON public.users USING btree (zone_id)` |
| usuarios_email_key | users | `CREATE UNIQUE INDEX usuarios_email_key ON public.users USING btree (email)` |
| zones_admin_id_idx | zones | `CREATE INDEX zones_admin_id_idx ON public.zones USING btree (admin_id)` |
| zones_name_admin_idx | zones | `CREATE UNIQUE INDEX zones_name_admin_idx ON public.zones USING btree (admin_id, lower(name))` |

---

## Policies (RLS)

| Tabla | Policy | Permisiva | Comando | Roles | USING | WITH CHECK |
|-------|--------|-----------|---------|-------|-------|-----------|
| public.audit_log | admin_read_audit | PERMISSIVE | SELECT | {authenticated} | `((get_user_role() = 'admin'::text) AND (admin_id = auth.uid()))` | `—` |
| public.audit_log | super_admin_read_audit | PERMISSIVE | SELECT | {authenticated} | `(get_user_role() = 'super_admin'::text)` | `—` |
| public.business_config | admin_full_business_config | PERMISSIVE | ALL | {authenticated} | `((get_user_role() = 'admin'::text) AND (admin_id = auth.uid()))` | `—` |
| public.business_config | courier_read_business_config | PERMISSIVE | SELECT | {authenticated} | `((get_user_role() = 'courier'::text) AND (admin_id = get_admin_id()))` | `—` |
| public.business_config | super_admin_full_business_config | PERMISSIVE | ALL | {authenticated} | `(get_user_role() = 'super_admin'::text)` | `—` |
| public.cash_closings | admin_full_cash_closings | PERMISSIVE | ALL | {authenticated} | `((get_user_role() = 'admin'::text) AND (admin_id = auth.uid()))` | `—` |
| public.cash_closings | courier_insert_closing | PERMISSIVE | INSERT | {authenticated} | `—` | `((get_user_role() = 'courier'::text) AND (admin_id = get_admin_id()) AND (courier_id = auth.uid()))` |
| public.cash_closings | courier_view_own_closings | PERMISSIVE | SELECT | {authenticated} | `((get_user_role() = 'courier'::text) AND (admin_id = get_admin_id()) AND (courier_id = auth.uid()))` | `—` |
| public.cash_closings | super_admin_full_cash_closings | PERMISSIVE | ALL | {authenticated} | `(get_user_role() = 'super_admin'::text)` | `—` |
| public.customer_charges | admin_full_customer_charges | PERMISSIVE | ALL | {authenticated} | `((get_user_role() = 'admin'::text) AND (admin_id = auth.uid()))` | `((get_user_role() = 'admin'::text) AND (admin_id = auth.uid()) AND (created_by = auth.uid()))` |
| public.customer_charges | super_admin_full_customer_charges | PERMISSIVE | ALL | {authenticated} | `(get_user_role() = 'super_admin'::text)` | `—` |
| public.customers | admin_full_customers | PERMISSIVE | ALL | {authenticated} | `((get_user_role() = 'admin'::text) AND (admin_id = auth.uid()))` | `—` |
| public.customers | commercial_read_customers | PERMISSIVE | SELECT | {authenticated} | `((get_user_role() = 'commercial'::text) AND (admin_id = get_admin_id()) AND (commercial_id = auth.uid()))` | `—` |
| public.customers | commercial_update_own_customers | PERMISSIVE | UPDATE | {authenticated} | `((get_user_role() = 'commercial'::text) AND (admin_id = get_admin_id()) AND (commercial_id = auth.uid()))` | `((get_user_role() = 'commercial'::text) AND (admin_id = get_admin_id()) AND (commercial_id = auth.uid()))` |
| public.customers | courier_read_customers | PERMISSIVE | SELECT | {authenticated} | `((get_user_role() = 'courier'::text) AND (admin_id = get_admin_id()))` | `—` |
| public.customers | super_admin_full_customers | PERMISSIVE | ALL | {authenticated} | `(get_user_role() = 'super_admin'::text)` | `—` |
| public.inventory_movements | admin_full_inventory_movements | PERMISSIVE | ALL | {authenticated} | `((get_user_role() = 'admin'::text) AND (admin_id = auth.uid()))` | `—` |
| public.inventory_movements | block_delete_inventory_movements | RESTRICTIVE | DELETE | {authenticated} | `false` | `—` |
| public.inventory_movements | courier_read_inventory_movements | PERMISSIVE | SELECT | {authenticated} | `((get_user_role() = 'courier'::text) AND (admin_id = get_admin_id()))` | `—` |
| public.inventory_movements | super_admin_full_inventory_movements | PERMISSIVE | ALL | {authenticated} | `(get_user_role() = 'super_admin'::text)` | `—` |
| public.order_items | admin_full_order_items | PERMISSIVE | ALL | {authenticated} | `((get_user_role() = 'admin'::text) AND (admin_id = auth.uid()))` | `—` |
| public.order_items | courier_view_order_items | PERMISSIVE | SELECT | {authenticated} | `((get_user_role() = 'courier'::text) AND (admin_id = get_admin_id()) AND (order_id IN ( SELECT orders.id` | `` |
|    FROM orders |  |  |  |  | `` | `` |
|   WHERE (orders.courier_id = auth.uid())))) | — |  |  |  | `` | `` |
| public.order_items | super_admin_full_order_items | PERMISSIVE | ALL | {authenticated} | `(get_user_role() = 'super_admin'::text)` | `—` |
| public.orders | admin_full_orders | PERMISSIVE | ALL | {authenticated} | `((get_user_role() = 'admin'::text) AND (admin_id = auth.uid()))` | `—` |
| public.orders | commercial_read_orders | PERMISSIVE | SELECT | {authenticated} | `((get_user_role() = 'commercial'::text) AND (admin_id = get_admin_id()) AND (customer_id IN ( SELECT customers.id` | `` |
|    FROM customers |  |  |  |  | `` | `` |
|   WHERE (customers.commercial_id = auth.uid())))) | — |  |  |  | `` | `` |
| public.orders | courier_update_orders | PERMISSIVE | UPDATE | {authenticated} | `((get_user_role() = 'courier'::text) AND (admin_id = get_admin_id()) AND (courier_id = auth.uid()))` | `((get_user_role() = 'courier'::text) AND (admin_id = get_admin_id()) AND (courier_id = auth.uid()))` |
| public.orders | courier_view_orders | PERMISSIVE | SELECT | {authenticated} | `((get_user_role() = 'courier'::text) AND (admin_id = get_admin_id()) AND (courier_id = auth.uid()))` | `—` |
| public.orders | super_admin_full_orders | PERMISSIVE | ALL | {authenticated} | `(get_user_role() = 'super_admin'::text)` | `—` |
| public.outbound_lot_allocations | admin_full_allocations | PERMISSIVE | ALL | {authenticated} | `((get_user_role() = 'admin'::text) AND (admin_id = auth.uid()))` | `—` |
| public.outbound_lot_allocations | block_courier_select_allocations | RESTRICTIVE | SELECT | {authenticated} | `(get_user_role() <> 'courier'::text)` | `—` |
| public.outbound_lot_allocations | block_delete_outbound_lot_allocations | RESTRICTIVE | DELETE | {authenticated} | `false` | `—` |
| public.outbound_lot_allocations | courier_read_allocations | PERMISSIVE | SELECT | {authenticated} | `((get_user_role() = 'courier'::text) AND (admin_id = get_admin_id()))` | `—` |
| public.outbound_lot_allocations | super_admin_full_allocations | PERMISSIVE | ALL | {authenticated} | `(get_user_role() = 'super_admin'::text)` | `—` |
| public.payments | admin_full_payments | PERMISSIVE | ALL | {authenticated} | `((get_user_role() = 'admin'::text) AND (admin_id = auth.uid()))` | `—` |
| public.payments | courier_insert_payments | PERMISSIVE | INSERT | {authenticated} | `—` | `((get_user_role() = 'courier'::text) AND (admin_id = get_admin_id()) AND (registered_by = auth.uid()))` |
| public.payments | courier_view_payments | PERMISSIVE | SELECT | {authenticated} | `((get_user_role() = 'courier'::text) AND (admin_id = get_admin_id()) AND (registered_by = auth.uid()))` | `—` |
| public.payments | super_admin_full_payments | PERMISSIVE | ALL | {authenticated} | `(get_user_role() = 'super_admin'::text)` | `—` |
| public.product_lots | admin_full_product_lots | PERMISSIVE | ALL | {authenticated} | `((get_user_role() = 'admin'::text) AND (admin_id = auth.uid()))` | `—` |
| public.product_lots | block_delete_product_lots | RESTRICTIVE | DELETE | {authenticated} | `false` | `—` |
| public.product_lots | courier_read_product_lots | PERMISSIVE | SELECT | {authenticated} | `((get_user_role() = 'courier'::text) AND (admin_id = get_admin_id()))` | `—` |
| public.product_lots | super_admin_full_product_lots | PERMISSIVE | ALL | {authenticated} | `(get_user_role() = 'super_admin'::text)` | `—` |
| public.products | admin_full_products | PERMISSIVE | ALL | {authenticated} | `((get_user_role() = 'admin'::text) AND (admin_id = auth.uid()))` | `—` |
| public.products | courier_read_products | PERMISSIVE | SELECT | {authenticated} | `((get_user_role() = 'courier'::text) AND (admin_id = get_admin_id()))` | `—` |
| public.products | super_admin_full_products | PERMISSIVE | ALL | {authenticated} | `(get_user_role() = 'super_admin'::text)` | `—` |
| public.users | admin_manage_users | PERMISSIVE | UPDATE | {authenticated} | `((get_user_role() = 'admin'::text) AND (admin_id = auth.uid()) AND (role = 'courier'::text))` | `((get_user_role() = 'admin'::text) AND (admin_id = auth.uid()) AND (role = 'courier'::text))` |
| public.users | admin_view_users | PERMISSIVE | SELECT | {authenticated} | `((get_user_role() = 'admin'::text) AND ((id = auth.uid()) OR (admin_id = auth.uid())))` | `—` |
| public.users | super_admin_full_users | PERMISSIVE | ALL | {authenticated} | `(get_user_role() = 'super_admin'::text)` | `—` |
| public.users | user_view_own | PERMISSIVE | SELECT | {authenticated} | `(id = auth.uid())` | `—` |
| public.zones | admin_zones_all | PERMISSIVE | ALL | {authenticated} | `(admin_id = auth.uid())` | `(admin_id = auth.uid())` |
| public.zones | courier_zones_read | PERMISSIVE | SELECT | {authenticated} | `(admin_id = get_admin_id())` | `—` |
| public.zones | super_admin_zones_all | PERMISSIVE | ALL | {authenticated} | `(EXISTS ( SELECT 1` | `` |
|    FROM users |  |  |  |  | `` | `` |
|   WHERE ((users.id = auth.uid()) AND (users.role = 'super_admin'::text)))) | true |  |  |  | `` | `` |

---

## Funciones

### `close_lot(p_lot_id uuid, p_admin_id uuid, p_force boolean DEFAULT false, p_reason text DEFAULT NULL::text)`
- **Retorna**: void
- **Seguridad**: SECURITY DEFINER

```sql
CREATE OR REPLACE FUNCTION public.close_lot(p_lot_id uuid, p_admin_id uuid, p_force boolean DEFAULT false, p_reason text DEFAULT NULL::text)
```

### ` RETURNS void()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` LANGUAGE plpgsql()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` SECURITY DEFINER()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `AS $function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `DECLARE()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_lot_admin    UUID;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_lot_active   BOOLEAN;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_active_count INTEGER;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_audit_note   TEXT;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `BEGIN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF p_admin_id IS NULL THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'admin_id es requerido';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  SELECT admin_id, active INTO v_lot_admin, v_lot_active()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  FROM product_lots WHERE id = p_lot_id FOR UPDATE;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF v_lot_admin IS NULL THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'Lote no encontrado';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF v_lot_admin IS DISTINCT FROM p_admin_id THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'Lote no pertenece al admin';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF NOT v_lot_active THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'El lote ya esta cerrado';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  -- Contar allocations en ordenes activas (no entregadas, no devueltas)()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  SELECT COUNT(*) INTO v_active_count()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  FROM outbound_lot_allocations a()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  JOIN order_items oi ON oi.id = a.order_item_id()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  JOIN orders o ON o.id = oi.order_id()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  WHERE a.lot_id = p_lot_id()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    AND o.status IN ('pending', 'assigned', 'in_transit');()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF v_active_count > 0 THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    IF NOT p_force THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      RAISE EXCEPTION 'No se puede cerrar el lote: hay % asignaciones en pedidos activos. Use force=TRUE con razon para forzar.', v_active_count;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      RAISE EXCEPTION 'force=TRUE requiere indicar la razon del cierre';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  -- Construir nota de auditoria que se anexa a notes del lote()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF p_force AND v_active_count > 0 THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    v_audit_note := format(()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      '[CIERRE FORZADO %s] %s afectaba %s pedido(s) activo(s).',()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS'),()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      p_reason,()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      v_active_count()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    );()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  ELSIF p_reason IS NOT NULL AND length(trim(p_reason)) > 0 THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    v_audit_note := format(()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      '[CIERRE %s] %s',()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS'),()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      p_reason()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    );()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  ELSE()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    v_audit_note := format('[CIERRE %s]', to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS'));()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  UPDATE product_lots()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  SET active = FALSE,()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      notes = CASE()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `        WHEN notes IS NULL OR length(trim(notes)) = 0 THEN v_audit_note()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `        ELSE notes || E'\n' || v_audit_note()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      END()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  WHERE id = p_lot_id;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `END;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `$function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `deduct_stock(p_product_id uuid, p_quantity integer, p_admin_id uuid, p_order_item_id uuid DEFAULT NULL::uuid, p_order_reference uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text)`
- **Retorna**: TABLE(lot_id uuid, allocated_qty integer, unit_cost numeric)
- **Seguridad**: SECURITY DEFINER

```sql
CREATE OR REPLACE FUNCTION public.deduct_stock(p_product_id uuid, p_quantity integer, p_admin_id uuid, p_order_item_id uuid DEFAULT NULL::uuid, p_order_reference uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text)
```

### ` RETURNS TABLE(lot_id uuid, allocated_qty integer, unit_cost numeric)()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` LANGUAGE plpgsql()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` SECURITY DEFINER()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `AS $function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `DECLARE()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_product_admin UUID;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_remaining INTEGER := p_quantity;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_lot RECORD;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_consume INTEGER;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `BEGIN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF p_admin_id IS NULL THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'admin_id es requerido';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF p_quantity <= 0 THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'La cantidad debe ser mayor a cero';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  -- Lock product para serializar outbounds concurrentes()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  SELECT admin_id INTO v_product_admin()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  FROM products WHERE id = p_product_id FOR UPDATE;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF v_product_admin IS NULL THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'Producto no encontrado';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF v_product_admin IS DISTINCT FROM p_admin_id THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'Producto no pertenece al admin';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  -- FIFO: lote mas viejo primero, omitiendo vencidos y agotados()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  FOR v_lot IN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    SELECT pl.id, pl.quantity_remaining, pl.unit_cost AS uc()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    FROM product_lots pl()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    WHERE pl.product_id = p_product_id()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      AND pl.quantity_remaining > 0()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      AND pl.active = TRUE()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      AND (pl.expires_at IS NULL OR pl.expires_at > NOW())()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    ORDER BY pl.received_at ASC, pl.id ASC()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  LOOP()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    EXIT WHEN v_remaining = 0;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    v_consume := LEAST(v_remaining, v_lot.quantity_remaining);()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    -- SECURITY DEFINER puede UPDATE pese al REVOKE de columna porque()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    -- la funcion corre con privilegios del owner (postgres).()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    UPDATE product_lots()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    SET quantity_remaining = quantity_remaining - v_consume()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    WHERE id = v_lot.id;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    -- Audit movement()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    INSERT INTO inventory_movements (()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      product_id, type, quantity, lot_id, unit_cost_snapshot,()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      order_reference, order_item_id, admin_id, notes()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    ) VALUES (()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      p_product_id, 'outbound', v_consume, v_lot.id, v_lot.uc,()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      p_order_reference, p_order_item_id, p_admin_id, p_notes()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    );()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    -- Allocation (truth source para devoluciones); solo cuando hay order_item()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    IF p_order_item_id IS NOT NULL THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      INSERT INTO outbound_lot_allocations (()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `        order_item_id, lot_id, quantity, unit_cost_snapshot, admin_id()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      ) VALUES (()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `        p_order_item_id, v_lot.id, v_consume, v_lot.uc, p_admin_id()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      );()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    -- Return row to caller()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    lot_id := v_lot.id;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    allocated_qty := v_consume;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    unit_cost := v_lot.uc;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RETURN NEXT;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    v_remaining := v_remaining - v_consume;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END LOOP;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF v_remaining > 0 THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'Stock vigente insuficiente: faltan % unidades (puede haber stock vencido bloqueado)', v_remaining;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  -- products.stock = total fisico()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  UPDATE products SET stock = stock - p_quantity WHERE id = p_product_id;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  RETURN;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `END;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `$function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `enforce_customer_charge_tenant()`
- **Retorna**: trigger
- **Seguridad**: SECURITY DEFINER

```sql
CREATE OR REPLACE FUNCTION public.enforce_customer_charge_tenant()
```

### ` RETURNS trigger()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` LANGUAGE plpgsql()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` SECURITY DEFINER()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `AS $function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `DECLARE()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_customer_admin UUID;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_customer_active BOOLEAN;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `BEGIN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  SELECT admin_id, active()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    INTO v_customer_admin, v_customer_active()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  FROM customers()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  WHERE id = NEW.customer_id;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF v_customer_admin IS NULL THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'Customer not found: %', NEW.customer_id;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF NOT v_customer_active THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'Cannot add charge to inactive customer';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  -- Force admin_id from the customer record (ignore client value).()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  NEW.admin_id := v_customer_admin;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  RETURN NEW;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `END;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `$function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `generate_lot_number(p_product_id uuid)`
- **Retorna**: text
- **Seguridad**: SECURITY DEFINER

```sql
CREATE OR REPLACE FUNCTION public.generate_lot_number(p_product_id uuid)
```

### ` RETURNS text()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` LANGUAGE plpgsql()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` SECURITY DEFINER()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `AS $function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `DECLARE()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_codigo TEXT;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_prefix TEXT;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_seq INTEGER;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `BEGIN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  SELECT codigo INTO v_codigo FROM products WHERE id = p_product_id;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_prefix := 'L-'()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    || COALESCE(v_codigo, 'PRD-' || substr(p_product_id::text, 1, 6))()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    || '-' || to_char(NOW(), 'YYYYMM') || '-';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  SELECT COUNT(*) + 1 INTO v_seq()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  FROM product_lots()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  WHERE product_id = p_product_id()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    AND lot_number LIKE v_prefix || '%';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  RETURN v_prefix || lpad(v_seq::text, 3, '0');()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `END;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `$function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `get_admin_id()`
- **Retorna**: uuid
- **Seguridad**: SECURITY DEFINER

```sql
CREATE OR REPLACE FUNCTION public.get_admin_id()
```

### ` RETURNS uuid()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` LANGUAGE sql()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` STABLE SECURITY DEFINER()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `AS $function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  SELECT admin_id FROM users WHERE id = auth.uid();()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `$function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `get_user_role()`
- **Retorna**: text
- **Seguridad**: SECURITY DEFINER

```sql
CREATE OR REPLACE FUNCTION public.get_user_role()
```

### ` RETURNS text()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` LANGUAGE sql()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` STABLE SECURITY DEFINER()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `AS $function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  SELECT role FROM users WHERE id = auth.uid();()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `$function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `inbound_stock(p_product_id uuid, p_quantity integer, p_notes text DEFAULT 'Manual stock entry'::text)`
- **Retorna**: void
- **Seguridad**: SECURITY DEFINER

```sql
CREATE OR REPLACE FUNCTION public.inbound_stock(p_product_id uuid, p_quantity integer, p_notes text DEFAULT 'Manual stock entry'::text)
```

### ` RETURNS void()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` LANGUAGE plpgsql()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` SECURITY DEFINER()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `AS $function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `DECLARE()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_admin_id UUID;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_price NUMERIC;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `BEGIN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  SELECT admin_id, price INTO v_admin_id, v_price()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  FROM products WHERE id = p_product_id;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF v_admin_id IS NULL THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'Producto no encontrado';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  PERFORM inbound_stock_with_lot(()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    p_product_id := p_product_id,()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    p_quantity   := p_quantity,()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    p_unit_cost  := v_price,()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    p_admin_id   := v_admin_id,()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    p_notes      := p_notes()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  );()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `END;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `$function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `inbound_stock_with_lot(p_product_id uuid, p_quantity integer, p_unit_cost numeric, p_admin_id uuid, p_lot_number text DEFAULT NULL::text, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_no_expiration boolean DEFAULT false, p_supplier text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)`
- **Retorna**: uuid
- **Seguridad**: SECURITY DEFINER

```sql
CREATE OR REPLACE FUNCTION public.inbound_stock_with_lot(p_product_id uuid, p_quantity integer, p_unit_cost numeric, p_admin_id uuid, p_lot_number text DEFAULT NULL::text, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_no_expiration boolean DEFAULT false, p_supplier text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
```

### ` RETURNS uuid()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` LANGUAGE plpgsql()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` SECURITY DEFINER()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `AS $function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `DECLARE()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_product_admin UUID;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_lot_id UUID;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_lot_number TEXT;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_expires_at TIMESTAMPTZ;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `BEGIN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF p_admin_id IS NULL THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'admin_id es requerido';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF p_quantity <= 0 THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'La cantidad debe ser mayor a cero';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF p_unit_cost IS NULL OR p_unit_cost < 0 THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'El costo unitario debe ser cero o positivo';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  -- Lock para serializar inbounds del mismo producto y la generacion()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  -- de numero de lote secuencial.()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  SELECT admin_id INTO v_product_admin()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  FROM products()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  WHERE id = p_product_id()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  FOR UPDATE;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF v_product_admin IS NULL THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'Producto no encontrado';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF v_product_admin IS DISTINCT FROM p_admin_id THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'Producto no pertenece al admin';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF p_lot_number IS NULL OR length(trim(p_lot_number)) = 0 THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    v_lot_number := generate_lot_number(p_product_id);()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  ELSE()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    v_lot_number := trim(p_lot_number);()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF p_no_expiration THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    v_expires_at := NULL;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  ELSE()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    v_expires_at := COALESCE(p_expires_at, NOW() + INTERVAL '1 month');()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  INSERT INTO product_lots (()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    product_id, admin_id, lot_number, unit_cost, is_estimated_cost,()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    quantity_received, quantity_remaining, expires_at, supplier, notes()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  ) VALUES (()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    p_product_id, p_admin_id, v_lot_number, p_unit_cost, FALSE,()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    p_quantity, p_quantity, v_expires_at, p_supplier, p_notes()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  ) RETURNING id INTO v_lot_id;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  INSERT INTO inventory_movements (()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    product_id, type, quantity, lot_id, unit_cost_snapshot, admin_id, notes()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  ) VALUES (()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    p_product_id, 'inbound', p_quantity, v_lot_id, p_unit_cost, p_admin_id,()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    COALESCE(p_notes, 'Entrada de stock')()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  );()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  -- Mantener products.stock como total fisico (incluye vencidos potenciales)()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  UPDATE products SET stock = stock + p_quantity WHERE id = p_product_id;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  RETURN v_lot_id;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `END;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `$function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `log_audit()`
- **Retorna**: trigger
- **Seguridad**: SECURITY DEFINER

```sql
CREATE OR REPLACE FUNCTION public.log_audit()
```

### ` RETURNS trigger()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` LANGUAGE plpgsql()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` SECURITY DEFINER()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `AS $function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `BEGIN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF TG_OP = 'INSERT' THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    INSERT INTO audit_log (table_name, record_id, action, new_data, user_id, admin_id)()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), auth.uid(),()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      CASE WHEN NEW.admin_id IS NOT NULL THEN NEW.admin_id ELSE NULL END);()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RETURN NEW;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  ELSIF TG_OP = 'UPDATE' THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, user_id, admin_id)()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid(),()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      CASE WHEN NEW.admin_id IS NOT NULL THEN NEW.admin_id ELSE NULL END);()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RETURN NEW;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  ELSIF TG_OP = 'DELETE' THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    INSERT INTO audit_log (table_name, record_id, action, old_data, user_id, admin_id)()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), auth.uid(),()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      CASE WHEN OLD.admin_id IS NOT NULL THEN OLD.admin_id ELSE NULL END);()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RETURN OLD;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  RETURN NULL;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `END;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `$function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `recompute_all_stock_available()`
- **Retorna**: integer
- **Seguridad**: SECURITY DEFINER

```sql
CREATE OR REPLACE FUNCTION public.recompute_all_stock_available()
```

### ` RETURNS integer()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` LANGUAGE plpgsql()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` SECURITY DEFINER()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `AS $function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `DECLARE()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  rows_updated INTEGER;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `BEGIN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  UPDATE products p()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  SET stock_available = COALESCE((()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    SELECT SUM(pl.quantity_remaining)()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    FROM product_lots pl()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    WHERE pl.product_id = p.id()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      AND pl.quantity_remaining > 0()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      AND pl.active = TRUE()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      AND (pl.expires_at IS NULL OR pl.expires_at > NOW())()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  ), 0);()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  GET DIAGNOSTICS rows_updated = ROW_COUNT;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  RETURN rows_updated;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `END;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `$function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `refresh_product_stock_available()`
- **Retorna**: trigger
- **Seguridad**: SECURITY DEFINER

```sql
CREATE OR REPLACE FUNCTION public.refresh_product_stock_available()
```

### ` RETURNS trigger()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` LANGUAGE plpgsql()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` SECURITY DEFINER()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `AS $function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `DECLARE()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_product_id UUID;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `BEGIN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_product_id := COALESCE(NEW.product_id, OLD.product_id);()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  UPDATE products()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  SET stock_available = COALESCE((()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    SELECT SUM(quantity_remaining)()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    FROM product_lots()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    WHERE product_id = v_product_id()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      AND quantity_remaining > 0()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      AND active = TRUE()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      AND (expires_at IS NULL OR expires_at > NOW())()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  ), 0)()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  WHERE id = v_product_id;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  RETURN NULL;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `END;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `$function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `register_outbound(p_product_id uuid, p_quantity integer, p_reason text, p_customer_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text, p_admin_id uuid DEFAULT NULL::uuid)`
- **Retorna**: void
- **Seguridad**: SECURITY DEFINER

```sql
CREATE OR REPLACE FUNCTION public.register_outbound(p_product_id uuid, p_quantity integer, p_reason text, p_customer_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text, p_admin_id uuid DEFAULT NULL::uuid)
```

### ` RETURNS void()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` LANGUAGE plpgsql()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` SECURITY DEFINER()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `AS $function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `DECLARE()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_product_admin UUID;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_customer_admin UUID;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_remaining INTEGER := p_quantity;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_lot RECORD;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_consume INTEGER;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `BEGIN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF p_admin_id IS NULL THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'admin_id es requerido';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF p_reason NOT IN ('merma', 'muestra') THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'Razon invalida: %. Valores permitidos: merma, muestra', p_reason;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF p_reason = 'muestra' AND p_customer_id IS NULL THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'Se requiere cliente para salidas tipo muestra';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF p_quantity <= 0 THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'La cantidad debe ser mayor a cero';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  SELECT admin_id INTO v_product_admin()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  FROM products WHERE id = p_product_id FOR UPDATE;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF v_product_admin IS NULL THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'Producto no encontrado';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF v_product_admin IS DISTINCT FROM p_admin_id THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'Producto no pertenece al admin';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF p_customer_id IS NOT NULL THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    SELECT admin_id INTO v_customer_admin FROM customers WHERE id = p_customer_id;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    IF v_customer_admin IS NULL THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      RAISE EXCEPTION 'Cliente no encontrado';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    IF v_customer_admin IS DISTINCT FROM p_admin_id THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      RAISE EXCEPTION 'Cliente no pertenece al admin';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  FOR v_lot IN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    SELECT pl.id, pl.quantity_remaining, pl.unit_cost AS uc()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    FROM product_lots pl()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    WHERE pl.product_id = p_product_id()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      AND pl.quantity_remaining > 0()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      AND pl.active = TRUE()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      AND (pl.expires_at IS NULL OR pl.expires_at > NOW())()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    ORDER BY pl.received_at ASC, pl.id ASC()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  LOOP()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    EXIT WHEN v_remaining = 0;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    v_consume := LEAST(v_remaining, v_lot.quantity_remaining);()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    UPDATE product_lots()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    SET quantity_remaining = quantity_remaining - v_consume()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    WHERE id = v_lot.id;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    INSERT INTO inventory_movements (()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      product_id, type, quantity, lot_id, unit_cost_snapshot,()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      reason, sample_customer_id, notes, admin_id()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    ) VALUES (()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      p_product_id, 'outbound', v_consume, v_lot.id, v_lot.uc,()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      p_reason, p_customer_id, p_notes, p_admin_id()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    );()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    v_remaining := v_remaining - v_consume;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END LOOP;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF v_remaining > 0 THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'Stock vigente insuficiente: faltan % unidades (puede haber stock vencido bloqueado)', v_remaining;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  UPDATE products SET stock = stock - p_quantity WHERE id = p_product_id;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `END;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `$function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `return_stock(p_product_id uuid, p_quantity integer, p_order_reference uuid DEFAULT NULL::uuid)`
- **Retorna**: void
- **Seguridad**: SECURITY DEFINER

```sql
CREATE OR REPLACE FUNCTION public.return_stock(p_product_id uuid, p_quantity integer, p_order_reference uuid DEFAULT NULL::uuid)
```

### ` RETURNS void()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` LANGUAGE plpgsql()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` SECURITY DEFINER()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `AS $function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `DECLARE()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_admin_id UUID;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_target_lot UUID;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_unit_cost NUMERIC;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_price NUMERIC;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `BEGIN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF p_quantity <= 0 THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'La cantidad debe ser mayor a cero';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  SELECT admin_id, price INTO v_admin_id, v_price()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  FROM products WHERE id = p_product_id FOR UPDATE;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF v_admin_id IS NULL THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'Producto no encontrado';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  -- Buscar lote vigente mas reciente()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  SELECT id, unit_cost INTO v_target_lot, v_unit_cost()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  FROM product_lots()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  WHERE product_id = p_product_id()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    AND active = TRUE()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    AND (expires_at IS NULL OR expires_at > NOW())()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  ORDER BY received_at DESC, id DESC()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  LIMIT 1;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF v_target_lot IS NULL THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    -- No hay lote vigente: crear uno de devolucion()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    INSERT INTO product_lots (()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      product_id, admin_id, lot_number, unit_cost, is_estimated_cost,()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      quantity_received, quantity_remaining, notes()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    ) VALUES (()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      p_product_id, v_admin_id,()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      generate_lot_number(p_product_id),()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      v_price, TRUE,()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      p_quantity, p_quantity,()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      'Lote de devolucion (sin allocation original)'()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    ) RETURNING id, unit_cost INTO v_target_lot, v_unit_cost;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  ELSE()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    UPDATE product_lots()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    SET quantity_remaining = quantity_remaining + p_quantity()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    WHERE id = v_target_lot;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  INSERT INTO inventory_movements (()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    product_id, type, quantity, lot_id, unit_cost_snapshot,()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    order_reference, admin_id, notes()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  ) VALUES (()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    p_product_id, 'return', p_quantity, v_target_lot, v_unit_cost,()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    p_order_reference, v_admin_id, 'Devolucion (legacy: lote mas reciente)'()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  );()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  UPDATE products SET stock = stock + p_quantity WHERE id = p_product_id;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `END;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `$function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `return_stock_by_item(p_order_item_id uuid, p_quantity integer, p_admin_id uuid)`
- **Retorna**: void
- **Seguridad**: SECURITY DEFINER

```sql
CREATE OR REPLACE FUNCTION public.return_stock_by_item(p_order_item_id uuid, p_quantity integer, p_admin_id uuid)
```

### ` RETURNS void()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` LANGUAGE plpgsql()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` SECURITY DEFINER()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `AS $function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `DECLARE()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_remaining INTEGER := p_quantity;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_alloc RECORD;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_revert INTEGER;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_product_id UUID;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_item_admin UUID;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_total_returned INTEGER := 0;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_order_id UUID;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `BEGIN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF p_admin_id IS NULL THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'admin_id es requerido';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF p_quantity <= 0 THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'La cantidad debe ser mayor a cero';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  SELECT product_id, admin_id, order_id()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    INTO v_product_id, v_item_admin, v_order_id()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  FROM order_items WHERE id = p_order_item_id;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF v_product_id IS NULL THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'Order item no encontrado';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF v_item_admin IS DISTINCT FROM p_admin_id THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'Order item no pertenece al admin';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  -- Lock product()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  PERFORM 1 FROM products WHERE id = v_product_id FOR UPDATE;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  -- LIFO sobre allocations()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  FOR v_alloc IN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    SELECT id, lot_id, quantity, unit_cost_snapshot()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    FROM outbound_lot_allocations()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    WHERE order_item_id = p_order_item_id()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    ORDER BY created_at DESC, id DESC()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  LOOP()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    EXIT WHEN v_remaining = 0;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    v_revert := LEAST(v_remaining, v_alloc.quantity);()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    UPDATE product_lots()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    SET quantity_remaining = quantity_remaining + v_revert()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    WHERE id = v_alloc.lot_id;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    IF v_revert >= v_alloc.quantity THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      DELETE FROM outbound_lot_allocations WHERE id = v_alloc.id;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    ELSE()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      UPDATE outbound_lot_allocations()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      SET quantity = quantity - v_revert()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      WHERE id = v_alloc.id;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    INSERT INTO inventory_movements (()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      product_id, type, quantity, lot_id, unit_cost_snapshot,()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      order_reference, order_item_id, admin_id, notes()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    ) VALUES (()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      v_product_id, 'return', v_revert, v_alloc.lot_id, v_alloc.unit_cost_snapshot,()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      v_order_id, p_order_item_id, p_admin_id,()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      'Devolucion al lote original via allocation'()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    );()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    v_remaining := v_remaining - v_revert;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    v_total_returned := v_total_returned + v_revert;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END LOOP;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF v_remaining > 0 THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'Asignaciones insuficientes para devolver: faltan % unidades', v_remaining;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  UPDATE products SET stock = stock + v_total_returned WHERE id = v_product_id;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `END;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `$function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `rls_auto_enable()`
- **Retorna**: event_trigger
- **Seguridad**: SECURITY DEFINER

```sql
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
```

### ` RETURNS event_trigger()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` LANGUAGE plpgsql()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` SECURITY DEFINER()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` SET search_path TO 'pg_catalog'()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `AS $function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `DECLARE()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  cmd record;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `BEGIN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  FOR cmd IN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    SELECT *()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    FROM pg_event_trigger_ddl_commands()()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      AND object_type IN ('table','partitioned table')()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  LOOP()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      BEGIN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      EXCEPTION()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `        WHEN OTHERS THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      END;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `     ELSE()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `     END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END LOOP;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `END;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `$function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `update_customer_balance(p_customer_id uuid)`
- **Retorna**: void
- **Seguridad**: SECURITY DEFINER

```sql
CREATE OR REPLACE FUNCTION public.update_customer_balance(p_customer_id uuid)
```

### ` RETURNS void()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` LANGUAGE plpgsql()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` SECURITY DEFINER()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `AS $function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `DECLARE()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  total_orders NUMERIC(12, 2);()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  total_payments NUMERIC(12, 2);()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  total_charges NUMERIC(12, 2);()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_admin_id UUID;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `BEGIN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  -- Lock the customer row to serialize balance updates.()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  SELECT admin_id INTO v_admin_id()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  FROM customers()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  WHERE id = p_customer_id()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  FOR UPDATE;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF v_admin_id IS NULL THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'Customer not found: %', p_customer_id;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  SELECT COALESCE(SUM(total), 0) INTO total_orders()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  FROM orders()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  WHERE customer_id = p_customer_id()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    AND admin_id = v_admin_id()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    AND status NOT IN ('returned');()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  SELECT COALESCE(SUM(amount), 0) INTO total_payments()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  FROM payments()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  WHERE customer_id = p_customer_id()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    AND admin_id = v_admin_id;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  SELECT COALESCE(SUM(amount), 0) INTO total_charges()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  FROM customer_charges()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  WHERE customer_id = p_customer_id()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    AND admin_id = v_admin_id()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    AND cancelled_at IS NULL;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  UPDATE customers()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  SET pending_balance = total_orders + total_charges - total_payments()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  WHERE id = p_customer_id;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `END;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `$function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `update_lot_metadata(p_lot_id uuid, p_admin_id uuid, p_supplier text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_lot_number text DEFAULT NULL::text, p_clear_expiration boolean DEFAULT false)`
- **Retorna**: void
- **Seguridad**: SECURITY DEFINER

```sql
CREATE OR REPLACE FUNCTION public.update_lot_metadata(p_lot_id uuid, p_admin_id uuid, p_supplier text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_lot_number text DEFAULT NULL::text, p_clear_expiration boolean DEFAULT false)
```

### ` RETURNS void()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` LANGUAGE plpgsql()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` SECURITY DEFINER()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `AS $function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `DECLARE()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_lot_admin       UUID;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_product_id      UUID;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_received_at     TIMESTAMPTZ;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_old_expires_at  TIMESTAMPTZ;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_new_expires_at  TIMESTAMPTZ;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  v_new_lot_number  TEXT;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `BEGIN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF p_admin_id IS NULL THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'admin_id es requerido';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  SELECT admin_id, product_id, received_at, expires_at()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    INTO v_lot_admin, v_product_id, v_received_at, v_old_expires_at()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  FROM product_lots WHERE id = p_lot_id FOR UPDATE;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF v_lot_admin IS NULL THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'Lote no encontrado';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF v_lot_admin IS DISTINCT FROM p_admin_id THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    RAISE EXCEPTION 'Lote no pertenece al admin';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  -- Resolver nuevo expires_at:()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  --   p_clear_expiration TRUE  -> NULL (sin vencimiento)()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  --   p_expires_at NOT NULL    -> nuevo valor()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  --   ambos NULL/FALSE         -> sin cambio()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF p_clear_expiration THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    v_new_expires_at := NULL;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  ELSIF p_expires_at IS NOT NULL THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    IF p_expires_at < v_received_at THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      RAISE EXCEPTION 'La fecha de vencimiento no puede ser anterior a la fecha de recepcion';()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    v_new_expires_at := p_expires_at;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  ELSE()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    v_new_expires_at := v_old_expires_at;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  -- Resolver nuevo lot_number (validacion de unicidad la cubre el()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  -- UNIQUE INDEX product_lots_lot_number_admin_idx)()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF p_lot_number IS NOT NULL AND length(trim(p_lot_number)) > 0 THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    v_new_lot_number := trim(p_lot_number);()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  ELSE()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    v_new_lot_number := NULL; -- senal de "no cambiar"()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  UPDATE product_lots()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  SET supplier   = CASE WHEN p_supplier IS NULL THEN supplier()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `                        WHEN length(trim(p_supplier)) = 0 THEN NULL()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `                        ELSE p_supplier END,()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      notes      = CASE WHEN p_notes IS NULL THEN notes()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `                        WHEN length(trim(p_notes)) = 0 THEN NULL()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `                        ELSE p_notes END,()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      expires_at = v_new_expires_at,()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      lot_number = COALESCE(v_new_lot_number, lot_number)()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  WHERE id = p_lot_id;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  -- Recalcular stock_available si cambio expires_at: un lote que()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  -- cruzo el umbral de vigencia altera la suma vigente del producto.()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  IF v_new_expires_at IS DISTINCT FROM v_old_expires_at THEN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    UPDATE products p()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    SET stock_available = COALESCE((()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      SELECT SUM(pl.quantity_remaining)()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      FROM product_lots pl()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `      WHERE pl.product_id = v_product_id()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `        AND pl.quantity_remaining > 0()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `        AND pl.active = TRUE()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `        AND (pl.expires_at IS NULL OR pl.expires_at > NOW())()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    ), 0)()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `    WHERE p.id = v_product_id;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  END IF;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `END;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `$function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `update_updated_at()`
- **Retorna**: trigger
- **Seguridad**: SECURITY INVOKER

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at()
```

### ` RETURNS trigger()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### ` LANGUAGE plpgsql()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `AS $function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `BEGIN()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  NEW.updated_at = now();()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `  RETURN NEW;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `END;()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

### `$function$()`
- **Retorna**: 
- **Seguridad**: 

```sql

```

---

## Triggers

| Trigger | Tabla | Evento | Funcion |
|---------|-------|--------|---------|
| audit_customer_charges | customer_charges | DELETE, INSERT, UPDATE | `EXECUTE FUNCTION log_audit()` |
| trg_enforce_customer_charge_tenant | customer_charges | INSERT | `EXECUTE FUNCTION enforce_customer_charge_tenant()` |
| audit_inventory_movements | inventory_movements | DELETE, INSERT, UPDATE | `EXECUTE FUNCTION log_audit()` |
| audit_orders | orders | DELETE, INSERT, UPDATE | `EXECUTE FUNCTION log_audit()` |
| trigger_orders_updated_at | orders | UPDATE | `EXECUTE FUNCTION update_updated_at()` |
| audit_outbound_lot_allocations | outbound_lot_allocations | DELETE, INSERT, UPDATE | `EXECUTE FUNCTION log_audit()` |
| audit_payments | payments | DELETE, INSERT, UPDATE | `EXECUTE FUNCTION log_audit()` |
| audit_product_lots | product_lots | DELETE, INSERT, UPDATE | `EXECUTE FUNCTION log_audit()` |
| trigger_refresh_stock_available | product_lots | DELETE, INSERT, UPDATE | `EXECUTE FUNCTION refresh_product_stock_available()` |
| audit_products | products | UPDATE | `EXECUTE FUNCTION log_audit()` |

---

## Estado RLS

| Tabla | RLS Habilitado |
|-------|----------------|
| audit_log | SI |
| business_config | SI |
| cash_closings | SI |
| customer_charges | SI |
| customers | SI |
| inventory_movements | SI |
| order_items | SI |
| orders | SI |
| outbound_lot_allocations | SI |
| payments | SI |
| product_lots | SI |
| products | SI |
| users | SI |
| zones | SI |
