import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowLeft } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import type { Customer, Order } from "@/types";

const STATUS_LABEL: Record<Order["status"], string> = {
  pending: "Pendiente",
  assigned: "Asignado",
  in_transit: "En camino",
  delivered: "Entregado",
  returned: "Devuelto",
  partial: "Parcial",
};

const STATUS_CLASS: Record<Order["status"], string> = {
  pending: "bg-slate-100 text-slate-700",
  assigned: "bg-blue-100 text-blue-700",
  in_transit: "bg-amber-100 text-amber-700",
  delivered: "bg-emerald-100 text-emerald-700",
  returned: "bg-red-100 text-red-700",
  partial: "bg-orange-100 text-orange-700",
};

async function updateContact(formData: FormData): Promise<void> {
  "use server";

  const id = String(formData.get("id") ?? "");
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const addressRaw = String(formData.get("address") ?? "").trim();

  if (!id) return;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("customers")
    .update({
      phone: phoneRaw.length > 0 ? phoneRaw : null,
      address: addressRaw.length > 0 ? addressRaw : null,
    })
    .eq("id", id)
    .eq("commercial_id", user.id);

  revalidatePath(`/my-customers/${id}`);
  revalidatePath("/my-customers");
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .eq("commercial_id", user.id)
    .maybeSingle();

  if (!customer) {
    notFound();
  }

  const c = customer as Customer;

  const { data: ordersData } = await supabase
    .from("orders")
    .select("id, status, total, created_at")
    .eq("customer_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  const orders = (ordersData ?? []) as Pick<
    Order,
    "id" | "status" | "total" | "created_at"
  >[];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/my-customers"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#3B82F6]"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </Link>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{c.name}</h1>
            {c.reference_code && (
              <p className="mt-1 text-xs text-slate-500">
                Codigo: {c.reference_code}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs uppercase text-slate-500">
              Saldo pendiente
            </p>
            <p
              className={`text-lg font-bold ${
                c.pending_balance > 0
                  ? "text-[#EF4444]"
                  : "text-[#10B981]"
              }`}
            >
              {formatCurrency(c.pending_balance)}
            </p>
          </div>
        </div>

        <form action={updateContact} className="mt-6 space-y-4">
          <input type="hidden" name="id" value={c.id} />
          <div>
            <label
              htmlFor="phone"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              Telefono
            </label>
            <input
              id="phone"
              name="phone"
              type="text"
              defaultValue={c.phone ?? ""}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
              placeholder="Telefono de contacto"
            />
          </div>
          <div>
            <label
              htmlFor="address"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              Direccion
            </label>
            <input
              id="address"
              name="address"
              type="text"
              defaultValue={c.address ?? ""}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
              placeholder="Direccion del cliente"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-[#1E3A5F] px-4 py-2 text-sm font-medium text-white hover:bg-[#3B82F6]"
          >
            Guardar cambios
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-800">
            Pedidos ({orders.length})
          </h2>
        </div>
        {orders.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            Este cliente aun no tiene pedidos.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Fecha</th>
                  <th className="px-6 py-3 font-medium">Estado</th>
                  <th className="px-6 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-6 py-3 text-slate-600">
                      {new Date(o.created_at).toLocaleDateString("es-CO", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[o.status]}`}
                      >
                        {STATUS_LABEL[o.status]}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-slate-800">
                      {formatCurrency(o.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
