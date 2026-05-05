import { z } from "zod";
import { bogotaTodayYmd } from "@/lib/date";

// ============================================
// Enums
// ============================================

export const USER_ROLE = ["admin", "courier", "super_admin", "commercial"] as const;
export const MANAGEABLE_ROLES = ["admin", "courier", "commercial"] as const;
export const ORDER_STATUS = [
  "pending",
  "assigned",
  "in_transit",
  "delivered",
  "returned",
  "partial",
  "cancelled",
] as const;
export const ORDER_TYPE = ["delivery", "direct"] as const;
export const PAYMENT_TYPE = ["full", "partial"] as const;
export const PAYMENT_METHOD = ["cash", "transfer", "nequi", "daviplata"] as const;
export const MOVEMENT_TYPE = [
  "inbound",
  "outbound",
  "return",
  "adjustment",
  "transfer_out",
  "transfer_in",
] as const;
export const TRANSFER_KIND = ["dispatch", "return", "adjustment"] as const;
export const TRANSFER_STATUS = ["pending", "completed", "cancelled"] as const;
export const PENDING_ADJUSTMENT_STATUS = ["pending", "resolved", "cancelled"] as const;
export const CHARGE_TYPE = [
  "legacy_debt",
  "adjustment",
  "late_fee",
  "service",
  "other",
] as const;
export const CLOSING_STATUS = ["pending", "approved", "with_difference"] as const;
export const AUDIT_ACTION = ["INSERT", "UPDATE", "DELETE"] as const;

// ============================================
// Zod Schemas
// ============================================

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Minimum 6 characters"),
});

export const customerSchema = z.object({
  name: z.string().min(2, "Name required"),
  phone: z.string().optional(),
  address: z.string().optional(),
  reference_code: z.string().min(1).optional(),
  preferred_courier_id: z.string().uuid().optional(),
  commercial_id: z.string().uuid().optional(),
});

// Acepta letras, numeros, guiones y guiones bajos. Hasta 50 chars.
const lotNumberRegex = /^[A-Za-z0-9_-]+$/;

export const productSchema = z.object({
  name: z.string().min(2, "Name required"),
  codigo: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().positive("Price must be positive"),
  stock: z.number().int().min(0, "Stock cannot be negative").max(100000, "Stock inicial demasiado alto"),
  min_stock: z.number().int().min(0).default(5),
  // Optional initial lot data when creating a product with stock > 0
  initial_unit_cost: z.number().min(0, "El costo no puede ser negativo").optional(),
  initial_expires_at: z.string().optional(),
  initial_no_expiration: z.boolean().optional(),
  initial_supplier: z.string().max(100).optional(),
});

export const stockEntryWithLotSchema = z
  .object({
    product_id: z.string().uuid(),
    quantity: z
      .number()
      .int()
      .positive("La cantidad debe ser mayor a cero")
      .max(100000, "Cantidad demasiado alta para un solo lote"),
    unit_cost: z.number().min(0, "El costo no puede ser negativo"),
    suggested_price: z
      .number()
      .min(0, "El precio sugerido no puede ser negativo")
      .optional(),
    lot_number: z
      .string()
      .max(50, "El numero de lote no puede superar 50 caracteres")
      .regex(lotNumberRegex, "Solo letras, numeros, guiones y guiones bajos")
      .optional(),
    expires_at: z.string().optional(),
    no_expiration: z.boolean().optional(),
    supplier: z.string().max(100).optional(),
    notes: z.string().max(500).optional(),
  })
  .refine((d) => d.no_expiration || !!d.expires_at, {
    message: "Indica fecha de vencimiento o marca producto no perecedero",
    path: ["expires_at"],
  })
  .refine(
    (d) => {
      if (d.no_expiration || !d.expires_at) return true;
      // Comparar dia calendario Bogota (string YYYY-MM-DD) para evitar
      // que un lote que vence "hoy" sea rechazado por el desfase UTC.
      return d.expires_at >= bogotaTodayYmd();
    },
    {
      message: "La fecha de vencimiento no puede estar en el pasado",
      path: ["expires_at"],
    }
  );

export const closeBatchSchema = z
  .object({
    lot_id: z.string().uuid(),
    force: z.boolean().optional(),
    reason: z.string().max(500).optional(),
  })
  .refine((d) => !d.force || (d.reason !== undefined && d.reason.trim().length > 0), {
    message: "Indica la razon del cierre forzado",
    path: ["reason"],
  });

export const updateBatchSchema = z
  .object({
    lot_id: z.string().uuid(),
    supplier: z.string().max(100).optional(),
    notes: z.string().max(500).optional(),
    expires_at: z.string().optional(),
    clear_expiration: z.boolean().optional(),
    lot_number: z
      .string()
      .max(50)
      .regex(lotNumberRegex, "Solo letras, numeros, guiones y guiones bajos")
      .optional(),
    suggested_price: z
      .number()
      .min(0, "El precio sugerido no puede ser negativo")
      .optional(),
    clear_suggested_price: z.boolean().optional(),
    quantity_received: z
      .number()
      .int()
      .positive("La cantidad recibida debe ser mayor a cero")
      .max(100000, "Cantidad demasiado alta para un solo lote")
      .optional(),
    correction_reason: z
      .string()
      .trim()
      .min(5, "Indica una razon de al menos 5 caracteres")
      .max(500)
      .optional(),
  })
  .refine(
    (d) =>
      d.quantity_received === undefined ||
      (d.correction_reason !== undefined && d.correction_reason.trim().length >= 5),
    {
      message: "Indica una razon de al menos 5 caracteres para la correccion de cantidad",
      path: ["correction_reason"],
    }
  );

export const lotShrinkageSchema = z
  .object({
    lot_id: z.string().uuid(),
    quantity: z
      .number()
      .int()
      .positive("La cantidad debe ser mayor a cero")
      .max(100000, "Cantidad demasiado alta"),
    reason: z.enum(["merma", "muestra"]),
    customer_id: z.string().uuid().optional(),
    notes: z.string().max(500).optional(),
  })
  .refine((d) => d.reason !== "muestra" || !!d.customer_id, {
    message: "Se requiere cliente para salidas tipo muestra",
    path: ["customer_id"],
  });

export const LOT_LIST_STATUS = [
  "all",
  "active",
  "expiring",
  "expired",
  "depleted",
] as const;
export const LOT_SORT_FIELDS = [
  "received_at",
  "expires_at",
  "quantity_remaining",
  "unit_cost",
] as const;
export const LOT_SORT_DIRECTIONS = ["asc", "desc"] as const;

export const listLotsFiltersSchema = z.object({
  product_id: z.string().uuid().optional(),
  status: z.enum(LOT_LIST_STATUS).default("active"),
  search: z.string().trim().max(100).optional(),
  supplier: z.string().trim().max(100).optional(),
  sort_field: z.enum(LOT_SORT_FIELDS).default("received_at"),
  sort_dir: z.enum(LOT_SORT_DIRECTIONS).default("desc"),
  page: z.number().int().min(1).default(1),
  page_size: z.number().int().min(1).max(100).default(25),
});

export const orderItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive("Quantity must be positive"),
  unit_price: z
    .number()
    .positive("El precio unitario debe ser mayor a cero")
    .max(50_000_000, "Precio unitario demasiado alto"),
});

export const createOrderSchema = z.object({
  customer_id: z.string().uuid(),
  items: z.array(orderItemSchema).min(1, "Must have at least one item"),
  notes: z.string().optional(),
  // Override del check de margen: si true, permite vender por debajo del
  // costo proyectado FIFO. Se loguea con auditoria.
  allow_loss: z.boolean().optional(),
  /** Si true, permite unit_price distinto al precio de lista o acuerdo cliente. */
  allow_price_override: z.boolean().optional(),
});

/** Venta en mostrador: stock central, sin courier. Sin payment_method = a crédito. */
export const createDirectSaleSchema = z.object({
  customer_id: z.string().uuid(),
  items: z.array(orderItemSchema).min(1, "Debe haber al menos un producto"),
  notes: z.string().optional(),
  allow_loss: z.boolean().optional(),
  payment_method: z.enum(PAYMENT_METHOD).optional(),
  allow_price_override: z.boolean().optional(),
});

export const upsertCustomerPriceSchema = z.object({
  customer_id: z.string().uuid(),
  product_id: z.string().uuid(),
  custom_price: z
    .number()
    .positive("El precio debe ser mayor a cero")
    .max(50_000_000, "Precio demasiado alto"),
  notes: z.string().max(500).optional(),
});

export const assignCourierSchema = z.object({
  order_id: z.string().uuid(),
  courier_id: z.string().uuid(),
});

export const cancelOrderSchema = z.object({
  order_id: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export const registerPaymentSchema = z.object({
  order_id: z.string().uuid(),
  amount: z.number().positive("Amount must be positive"),
  type: z.enum(PAYMENT_TYPE),
  payment_method: z.enum(PAYMENT_METHOD).default("cash"),
});

export const addManualChargeSchema = z.object({
  customer_id: z.string().uuid(),
  amount: z
    .number()
    .positive("El monto debe ser mayor a cero")
    .max(50_000_000, "El monto no puede superar $50.000.000")
    .multipleOf(0.01, "Maximo dos decimales"),
  charge_type: z.enum(CHARGE_TYPE),
  reason: z
    .string()
    .trim()
    .min(5, "Indica un motivo de al menos 5 caracteres")
    .max(500, "El motivo no puede superar 500 caracteres"),
  due_date: z.string().optional(),
});

export const cancelManualChargeSchema = z.object({
  charge_id: z.string().uuid(),
  cancel_reason: z
    .string()
    .trim()
    .min(5, "Indica un motivo de al menos 5 caracteres")
    .max(500),
});

export const confirmDeliverySchema = z.object({
  order_id: z.string().uuid(),
  returned_items: z
    .array(
      z.object({
        order_item_id: z.string().uuid(),
        returned_quantity: z.number().int().positive(),
      })
    )
    .optional(),
  swaps: z
    .array(
      z.object({
        order_item_id: z.string().uuid(),
        swapped_product_id: z.string().uuid(),
        swapped_quantity: z.number().int().positive(),
        source: z.enum(["central", "courier_kit"]),
        notes: z.string().max(500).optional(),
      })
    )
    .optional(),
});

export interface ConfirmDeliverySwapInput {
  order_item_id: string;
  swapped_product_id: string;
  swapped_quantity: number;
  source: "central" | "courier_kit";
  notes?: string;
}

export const courierSchema = z.object({
  name: z.string().min(2, "Nombre requerido"),
  email: z.string().email("Email invalido"),
  password: z.string().min(6, "Minimo 6 caracteres"),
  zone_id: z.string().uuid().optional(),
});

export const updateCourierSchema = z.object({
  name: z.string().min(2, "Nombre requerido"),
  email: z.string().email("Email invalido"),
  zone_id: z.string().uuid().optional(),
});

export const cashClosingSchema = z.object({
  reported_total: z.number().min(0),
  notes: z.string().optional(),
});

export const createUserSchema = z.object({
  name: z.string().min(2, "Nombre requerido"),
  email: z.string().email("Email invalido"),
  password: z.string().min(6, "Minimo 6 caracteres"),
  role: z.enum(MANAGEABLE_ROLES, { message: "Rol invalido" }),
});

export const updateUserSchema = z.object({
  name: z.string().min(2, "Nombre requerido"),
  email: z.string().email("Email invalido"),
});

export const zoneSchema = z.object({
  name: z.string().min(2, "Nombre requerido").max(100),
  description: z.string().optional(),
});

export const registerOutboundSchema = z
  .object({
    product_id: z.string().uuid(),
    quantity: z.number().int().positive("Cantidad debe ser mayor a cero"),
    reason: z.enum(["merma", "muestra"]),
    customer_id: z.string().uuid().optional(),
    notes: z.string().optional(),
  })
  .refine((d) => d.reason !== "muestra" || !!d.customer_id, {
    message: "Se requiere cliente para salidas tipo muestra",
    path: ["customer_id"],
  });

export const reportFiltersSchema = z.object({
  courier_id: z.string().uuid().optional(),
  product_id: z.string().uuid().optional(),
  year: z.number().int(),
  month: z.number().int().min(1).max(12).optional(),
});

// ============================================
// Bodega del domiciliario (courier warehouse)
// ============================================

export const transferLineSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive("Cantidad debe ser mayor a cero"),
});

export const transferToCourierSchema = z.object({
  courier_id: z.string().uuid(),
  lines: z.array(transferLineSchema).min(1, "Debe transferir al menos un producto"),
  notes: z.string().max(500).optional(),
});

export const returnLineSchema = z.object({
  lot_id: z.string().uuid(),
  product_id: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export const returnFromCourierSchema = z.object({
  courier_id: z.string().uuid(),
  lines: z.array(returnLineSchema).min(1, "Debe devolver al menos un producto"),
  notes: z.string().max(500).optional(),
});

export const closeShiftSchema = z.object({
  reported_total: z.number().min(0, "El total reportado no puede ser negativo"),
  returns: z.array(returnLineSchema).default([]),
  carryovers: z
    .array(
      z.object({
        lot_id: z.string().uuid(),
        product_id: z.string().uuid(),
        quantity: z.number().int().min(0),
      })
    )
    .default([]),
  notes: z.string().max(500).optional(),
});

export const resolveAdjustmentSchema = z.object({
  adjustment_id: z.string().uuid(),
  resolution_note: z
    .string()
    .trim()
    .min(5, "Indica una razon de al menos 5 caracteres")
    .max(500),
});

export const businessConfigSchema = z.object({
  company_name: z.string().min(2),
  tax_id: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  payment_terms: z.string().optional(),
  logo_url: z.string().url().optional(),
});

// ============================================
// Inferred types from Zod
// ============================================

export type LoginInput = z.infer<typeof loginSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type StockEntryWithLotInput = z.infer<typeof stockEntryWithLotSchema>;
export type CloseBatchInput = z.infer<typeof closeBatchSchema>;
export type UpdateBatchInput = z.infer<typeof updateBatchSchema>;
export type LotShrinkageInput = z.infer<typeof lotShrinkageSchema>;
export type ListLotsFilters = z.infer<typeof listLotsFiltersSchema>;
export type LotListStatus = (typeof LOT_LIST_STATUS)[number];
export type LotSortField = (typeof LOT_SORT_FIELDS)[number];
export type LotSortDirection = (typeof LOT_SORT_DIRECTIONS)[number];

export interface ListLotsResult {
  lots: ProductLot[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CreateDirectSaleInput = z.infer<typeof createDirectSaleSchema>;
export type UpsertCustomerPriceInput = z.infer<typeof upsertCustomerPriceSchema>;
export type AssignCourierInput = z.infer<typeof assignCourierSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type RegisterPaymentInput = z.infer<typeof registerPaymentSchema>;
export type AddManualChargeInput = z.infer<typeof addManualChargeSchema>;
export type CancelManualChargeInput = z.infer<typeof cancelManualChargeSchema>;
export type ConfirmDeliveryInput = z.infer<typeof confirmDeliverySchema>;
export type CourierInput = z.infer<typeof courierSchema>;
export type UpdateCourierInput = z.infer<typeof updateCourierSchema>;
export type CashClosingInput = z.infer<typeof cashClosingSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type BusinessConfigInput = z.infer<typeof businessConfigSchema>;
export type ZoneInput = z.infer<typeof zoneSchema>;
export type RegisterOutboundInput = z.infer<typeof registerOutboundSchema>;
export type ReportFilters = z.infer<typeof reportFiltersSchema>;
export type TransferLineInput = z.infer<typeof transferLineSchema>;
export type TransferToCourierInput = z.infer<typeof transferToCourierSchema>;
export type ReturnLineInput = z.infer<typeof returnLineSchema>;
export type ReturnFromCourierInput = z.infer<typeof returnFromCourierSchema>;
export type CloseShiftInput = z.infer<typeof closeShiftSchema>;
export type ResolveAdjustmentInput = z.infer<typeof resolveAdjustmentSchema>;

// ============================================
// Database types
// ============================================

export type UserRole = (typeof USER_ROLE)[number];
export type OrderStatus = (typeof ORDER_STATUS)[number];
export type OrderType = (typeof ORDER_TYPE)[number];
export type PaymentType = (typeof PAYMENT_TYPE)[number];
export type PaymentMethod = (typeof PAYMENT_METHOD)[number];
export type MovementType = (typeof MOVEMENT_TYPE)[number];
export type ChargeType = (typeof CHARGE_TYPE)[number];
export type TransferKind = (typeof TRANSFER_KIND)[number];
export type TransferStatus = (typeof TRANSFER_STATUS)[number];
export type PendingAdjustmentStatus = (typeof PENDING_ADJUSTMENT_STATUS)[number];

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  admin_id: string | null;
  active: boolean;
  zone_id: string | null;
  created_at: string;
  zone?: Zone;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  pending_balance: number;
  admin_id: string;
  active: boolean;
  reference_code: string | null;
  preferred_courier_id: string | null;
  commercial_id: string | null;
  created_at: string;
  preferred_courier?: User;
  commercial?: User;
}

export type Commercial = User & { role: "commercial" };

export interface Product {
  id: string;
  name: string;
  codigo: string | null;
  description: string | null;
  price: number;
  stock: number;
  stock_available: number;
  min_stock: number;
  admin_id: string;
  active: boolean;
  created_at: string;
}

/** Precio acordado cliente + producto (tabla customer_prices). */
export interface CustomerPrice {
  id: string;
  customer_id: string;
  product_id: string;
  admin_id: string;
  custom_price: number;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  product?: Pick<Product, "id" | "name" | "price">;
}

export interface ProductLot {
  id: string;
  product_id: string;
  admin_id: string;
  lot_number: string;
  unit_cost: number;
  is_estimated_cost: boolean;
  suggested_price: number | null;
  quantity_received: number;
  quantity_remaining: number;
  received_at: string;
  expires_at: string | null;
  supplier: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  product?: Product;
}

export interface LotProfitabilityRow {
  allocation_id: string;
  lot_id: string;
  lot_number: string;
  product_id: string;
  product_name: string;
  product_code: string | null;
  order_item_id: string;
  order_id: string;
  order_status: OrderStatus;
  delivered_at: string | null;
  admin_id: string;
  quantity_sold: number;
  unit_cost_snapshot: number;
  unit_price: number;
  unit_margin: number;
  total_cost: number;
  total_revenue: number;
  total_margin: number;
  margin_percent: number | null;
  allocated_at: string;
}

export interface InventoryValuationRow {
  product_id: string;
  product_name: string;
  product_code: string | null;
  admin_id: string;
  active_lots_count: number;
  total_units_available: number;
  total_inventory_value: number;
  weighted_avg_cost: number | null;
  min_lot_cost: number;
  max_lot_cost: number;
}

export interface MonthlyCogsRow {
  admin_id: string;
  product_id: string;
  product_name: string;
  product_code: string | null;
  month: string;
  units_sold: number;
  total_cogs: number;
  total_revenue: number;
  total_margin: number;
  margin_percent: number | null;
  items_count: number;
  orders_count: number;
}

export interface OutboundLotAllocation {
  id: string;
  order_item_id: string;
  lot_id: string;
  quantity: number;
  unit_cost_snapshot: number;
  admin_id: string;
  created_at: string;
}

export interface BatchAllocationTrace {
  allocation_id: string;
  order_id: string;
  order_status: OrderStatus;
  customer_id: string;
  customer_name: string;
  order_item_id: string;
  quantity: number;
  unit_cost_snapshot: number;
  delivered_at: string | null;
  created_at: string;
}

export interface BatchDetail extends ProductLot {
  product: Product;
  allocations: BatchAllocationTrace[];
  movements: InventoryMovement[];
  total_allocated_active: number;
  consumed_quantity: number;
}

export interface Order {
  id: string;
  customer_id: string;
  courier_id: string | null;
  order_type: OrderType;
  status: OrderStatus;
  total: number;
  notes: string | null;
  admin_id: string;
  assigned_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  courier?: User;
  items?: OrderItem[];
  payments?: Payment[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  /** Precio lista o acuerdo al crear la linea; null en datos legacy. */
  reference_unit_price?: number | null;
  returned: boolean;
  returned_quantity: number;
  admin_id: string;
  product?: Product;
}

export interface Payment {
  id: string;
  order_id: string;
  customer_id: string;
  amount: number;
  type: PaymentType;
  payment_method: PaymentMethod;
  registered_by: string;
  admin_id: string;
  created_at: string;
}

export interface CustomerCharge {
  id: string;
  customer_id: string;
  admin_id: string;
  amount: number;
  charge_type: ChargeType;
  reason: string;
  due_date: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  created_by: string;
  created_at: string;
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  type: MovementType;
  quantity: number;
  order_reference: string | null;
  order_item_id: string | null;
  lot_id: string | null;
  unit_cost_snapshot: number | null;
  reason: string | null;
  sample_customer_id: string | null;
  notes: string | null;
  admin_id: string;
  created_at: string;
  sample_customer?: Customer;
  lot?: ProductLot;
}

export interface CashClosing {
  id: string;
  courier_id: string;
  date: string;
  reported_total: number;
  system_total: number;
  difference: number;
  status: (typeof CLOSING_STATUS)[number];
  notes: string | null;
  admin_id: string;
  created_at: string;
}

export interface BusinessConfig {
  id: string;
  company_name: string;
  tax_id: string | null;
  phone: string | null;
  address: string | null;
  payment_terms: string | null;
  logo_url: string | null;
  admin_id: string;
  updated_at: string;
}

export interface Zone {
  id: string;
  name: string;
  description: string | null;
  admin_id: string;
  active: boolean;
  created_at: string;
}

export interface SalesByMonthReport {
  courier_id: string;
  courier_name: string;
  year: number;
  month: number;
  product_id: string | null;
  product_name: string | null;
  product_codigo: string | null;
  total_orders: number;
  total_items: number;
  total_amount: number;
}

// ============================================
// Bodega del domiciliario - DB types
// ============================================

export interface CourierInventoryRow {
  id: string;
  courier_id: string;
  admin_id: string;
  product_id: string;
  lot_id: string;
  quantity_remaining: number;
  received_at: string;
  updated_at: string;
}

export interface CourierInventorySummary {
  courier_id: string;
  admin_id: string;
  product_id: string;
  product_name: string;
  product_code: string | null;
  product_price: number;
  total_units: number;
  lots_count: number;
  earliest_expiry: string | null;
  has_expiring_soon: boolean;
}

export interface InventoryGlobalRow {
  product_id: string;
  admin_id: string;
  name: string;
  codigo: string | null;
  price: number;
  warehouse_total_physical: number;
  warehouse_available: number;
  in_couriers_available: number;
  in_couriers_total: number;
  available_global: number;
}

/** Producto listado para venta directa (solo stock bodega central). */
export interface DirectSaleProductOption {
  id: string;
  name: string;
  codigo: string | null;
  price: number;
  warehouse_available: number;
}

export interface StockTransfer {
  id: string;
  admin_id: string;
  courier_id: string;
  kind: TransferKind;
  status: TransferStatus;
  notes: string | null;
  created_by: string;
  created_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  courier?: User;
  lines?: StockTransferLine[];
}

export interface StockTransferLine {
  id: string;
  transfer_id: string;
  product_id: string;
  lot_id: string;
  quantity: number;
  unit_cost_snapshot: number;
  admin_id: string;
  created_at: string;
  product?: Product;
  lot?: ProductLot;
}

export interface PendingAdjustment {
  id: string;
  courier_id: string;
  admin_id: string;
  order_item_id: string | null;
  product_id: string;
  quantity: number;
  reason: string;
  status: PendingAdjustmentStatus;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  product?: Product;
  courier?: User;
}

export interface CourierStockShortage {
  product_id: string;
  product_name: string;
  required: number;
  available: number;
  shortfall: number;
}

// ============================================
// Standard Server Action response
// ============================================

export interface ActionResponse<T = null> {
  success: boolean;
  data?: T;
  error?: string;
}
