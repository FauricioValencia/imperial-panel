import { z } from "zod";

// ============================================
// Enums
// ============================================

export const USER_ROLE = ["admin", "courier", "super_admin"] as const;
export const MANAGEABLE_ROLES = ["admin", "courier"] as const;
export const ORDER_STATUS = [
  "pending",
  "assigned",
  "in_transit",
  "delivered",
  "returned",
  "partial",
] as const;
export const PAYMENT_TYPE = ["full", "partial"] as const;
export const PAYMENT_METHOD = ["cash", "transfer", "nequi", "daviplata"] as const;
export const MOVEMENT_TYPE = ["inbound", "outbound", "return", "adjustment"] as const;
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
});

export const productSchema = z.object({
  name: z.string().min(2, "Name required"),
  codigo: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().positive("Price must be positive"),
  stock: z.number().int().min(0, "Stock cannot be negative"),
  min_stock: z.number().int().min(0).default(5),
});

export const orderItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive("Quantity must be positive"),
  unit_price: z.number().positive(),
});

export const createOrderSchema = z.object({
  customer_id: z.string().uuid(),
  items: z.array(orderItemSchema).min(1, "Must have at least one item"),
  notes: z.string().optional(),
});

export const assignCourierSchema = z.object({
  order_id: z.string().uuid(),
  courier_id: z.string().uuid(),
});

export const registerPaymentSchema = z.object({
  order_id: z.string().uuid(),
  amount: z.number().positive("Amount must be positive"),
  type: z.enum(PAYMENT_TYPE),
  payment_method: z.enum(PAYMENT_METHOD).default("cash"),
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
});

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
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type AssignCourierInput = z.infer<typeof assignCourierSchema>;
export type RegisterPaymentInput = z.infer<typeof registerPaymentSchema>;
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

// ============================================
// Database types
// ============================================

export type UserRole = (typeof USER_ROLE)[number];
export type OrderStatus = (typeof ORDER_STATUS)[number];
export type PaymentType = (typeof PAYMENT_TYPE)[number];
export type PaymentMethod = (typeof PAYMENT_METHOD)[number];
export type MovementType = (typeof MOVEMENT_TYPE)[number];

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
  created_at: string;
  preferred_courier?: User;
}

export interface Product {
  id: string;
  name: string;
  codigo: string | null;
  description: string | null;
  price: number;
  stock: number;
  min_stock: number;
  admin_id: string;
  active: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  customer_id: string;
  courier_id: string | null;
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

export interface InventoryMovement {
  id: string;
  product_id: string;
  type: MovementType;
  quantity: number;
  order_reference: string | null;
  reason: string | null;
  sample_customer_id: string | null;
  notes: string | null;
  admin_id: string;
  created_at: string;
  sample_customer?: Customer;
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
// Standard Server Action response
// ============================================

export interface ActionResponse<T = null> {
  success: boolean;
  data?: T;
  error?: string;
}
