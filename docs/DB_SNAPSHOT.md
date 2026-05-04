# DB Snapshot - Imperial Apps

> Generado automaticamente el 2026-05-04 15:44:44
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

