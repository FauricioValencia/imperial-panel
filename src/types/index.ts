import { z } from "zod";

// ============================================
// Enums
// ============================================

export const ROL_USUARIO = ["admin", "mensajero"] as const;
export const ESTADO_PEDIDO = [
  "pendiente",
  "asignado",
  "en_camino",
  "entregado",
  "devuelto",
  "parcial",
] as const;
export const TIPO_PAGO = ["completo", "abono"] as const;
export const METODO_PAGO = ["efectivo", "transferencia", "nequi", "daviplata"] as const;
export const TIPO_MOVIMIENTO = ["entrada", "salida", "devolucion", "ajuste"] as const;
export const ESTADO_CIERRE = ["pendiente", "aprobado", "con_diferencia"] as const;
export const ACCION_AUDIT = ["INSERT", "UPDATE", "DELETE"] as const;

// ============================================
// Schemas Zod
// ============================================

export const loginSchema = z.object({
  email: z.string().email("Email invalido"),
  password: z.string().min(6, "Minimo 6 caracteres"),
});

export const clienteSchema = z.object({
  nombre: z.string().min(2, "Nombre requerido"),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
});

export const productoSchema = z.object({
  nombre: z.string().min(2, "Nombre requerido"),
  descripcion: z.string().optional(),
  precio: z.number().positive("Precio debe ser positivo"),
  stock: z.number().int().min(0, "Stock no puede ser negativo"),
  stock_minimo: z.number().int().min(0).default(5),
});

export const pedidoItemSchema = z.object({
  producto_id: z.string().uuid(),
  cantidad: z.number().int().positive("Cantidad debe ser positiva"),
  precio_unitario: z.number().positive(),
});

export const crearPedidoSchema = z.object({
  cliente_id: z.string().uuid(),
  items: z.array(pedidoItemSchema).min(1, "Debe tener al menos un item"),
  notas: z.string().optional(),
});

export const asignarMensajeroSchema = z.object({
  pedido_id: z.string().uuid(),
  mensajero_id: z.string().uuid(),
});

export const registrarPagoSchema = z.object({
  pedido_id: z.string().uuid(),
  monto: z.number().positive("Monto debe ser positivo"),
  tipo: z.enum(TIPO_PAGO),
  metodo_pago: z.enum(METODO_PAGO).default("efectivo"),
});

export const confirmarEntregaSchema = z.object({
  pedido_id: z.string().uuid(),
  items_devueltos: z
    .array(
      z.object({
        pedido_item_id: z.string().uuid(),
        cantidad_devuelta: z.number().int().positive(),
      })
    )
    .optional(),
});

export const cierreCajaSchema = z.object({
  total_reportado: z.number().min(0),
  notas: z.string().optional(),
});

export const configuracionNegocioSchema = z.object({
  nombre_empresa: z.string().min(2),
  nit: z.string().optional(),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  condiciones_pago: z.string().optional(),
  logo_url: z.string().url().optional(),
});

// ============================================
// Types inferidos de Zod
// ============================================

export type LoginInput = z.infer<typeof loginSchema>;
export type ClienteInput = z.infer<typeof clienteSchema>;
export type ProductoInput = z.infer<typeof productoSchema>;
export type CrearPedidoInput = z.infer<typeof crearPedidoSchema>;
export type AsignarMensajeroInput = z.infer<typeof asignarMensajeroSchema>;
export type RegistrarPagoInput = z.infer<typeof registrarPagoSchema>;
export type ConfirmarEntregaInput = z.infer<typeof confirmarEntregaSchema>;
export type CierreCajaInput = z.infer<typeof cierreCajaSchema>;
export type ConfiguracionNegocioInput = z.infer<typeof configuracionNegocioSchema>;

// ============================================
// Types de base de datos
// ============================================

export type RolUsuario = (typeof ROL_USUARIO)[number];
export type EstadoPedido = (typeof ESTADO_PEDIDO)[number];
export type TipoPago = (typeof TIPO_PAGO)[number];
export type MetodoPago = (typeof METODO_PAGO)[number];
export type TipoMovimiento = (typeof TIPO_MOVIMIENTO)[number];

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: RolUsuario;
  activo: boolean;
  created_at: string;
}

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
  saldo_pendiente: number;
  activo: boolean;
  created_at: string;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  stock: number;
  stock_minimo: number;
  activo: boolean;
  created_at: string;
}

export interface Pedido {
  id: string;
  cliente_id: string;
  mensajero_id: string | null;
  estado: EstadoPedido;
  total: number;
  notas: string | null;
  fecha_asignacion: string | null;
  fecha_entrega: string | null;
  created_at: string;
  updated_at: string;
  // Relaciones
  cliente?: Cliente;
  mensajero?: Usuario;
  items?: PedidoItem[];
  pagos?: Pago[];
}

export interface PedidoItem {
  id: string;
  pedido_id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  devuelto: boolean;
  cantidad_devuelta: number;
  // Relaciones
  producto?: Producto;
}

export interface Pago {
  id: string;
  pedido_id: string;
  cliente_id: string;
  monto: number;
  tipo: TipoPago;
  metodo_pago: string;
  registrado_por: string;
  created_at: string;
}

export interface MovimientoInventario {
  id: string;
  producto_id: string;
  tipo: TipoMovimiento;
  cantidad: number;
  referencia_pedido: string | null;
  notas: string | null;
  created_at: string;
}

export interface CierreCaja {
  id: string;
  mensajero_id: string;
  fecha: string;
  total_reportado: number;
  total_sistema: number;
  diferencia: number;
  estado: string;
  notas: string | null;
  created_at: string;
}

export interface ConfiguracionNegocio {
  id: string;
  nombre_empresa: string;
  nit: string | null;
  telefono: string | null;
  direccion: string | null;
  condiciones_pago: string | null;
  logo_url: string | null;
  updated_at: string;
}

// ============================================
// Respuesta estandar de Server Actions
// ============================================

export interface ActionResponse<T = null> {
  success: boolean;
  data?: T;
  error?: string;
}
