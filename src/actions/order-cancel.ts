"use server";

import { revalidatePath } from "next/cache";
import { verifyAdmin } from "@/lib/auth-helpers";
import { cancelOrderSchema, type ActionResponse, type CancelOrderInput } from "@/types";
import { logOperacion, logError } from "@/lib/logger";

export async function cancelOrder(input: CancelOrderInput): Promise<ActionResponse> {
  const ctx = await verifyAdmin();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const parsed = cancelOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { order_id, reason } = parsed.data;

  const { error } = await ctx.supabase.rpc("admin_cancel_order", {
    p_order_id: order_id,
    p_admin_id: ctx.user.id,
    p_reason: reason?.trim() ? reason.trim() : null,
  });

  if (error) {
    logError("cancel_order", error, { order_id });
    return {
      success: false,
      error: error.message || "No se pudo cancelar el pedido",
    };
  }

  logOperacion("order_cancelled_by_admin", { order_id, reason: reason?.trim() }, ctx.user.id);

  revalidatePath("/orders");
  revalidatePath(`/orders/${order_id}`);
  return { success: true };
}
