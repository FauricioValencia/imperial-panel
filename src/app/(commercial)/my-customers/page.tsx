import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import type { Customer } from "@/types";

export default async function MyCustomersPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .eq("commercial_id", user.id)
    .eq("active", true)
    .order("name");

  const list: Customer[] = customers ?? [];

  if (list.length === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          Mis Clientes
        </h2>
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Aun no tienes clientes asignados.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h2 className="mb-4 text-lg font-semibold text-slate-800">
        Mis Clientes ({list.length})
      </h2>

      {/* Mobile: cards */}
      <ul className="space-y-2 md:hidden">
        {list.map((c) => (
          <li key={c.id}>
            <Link
              href={`/my-customers/${c.id}`}
              className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-[#3B82F6]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {c.name}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {c.phone ?? "Sin telefono"}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {c.address ?? "Sin direccion"}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-xs font-semibold ${
                    c.pending_balance > 0
                      ? "text-[#EF4444]"
                      : "text-[#10B981]"
                  }`}
                >
                  {formatCurrency(c.pending_balance)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Telefono</th>
              <th className="px-4 py-3 font-medium">Direccion</th>
              <th className="px-4 py-3 text-right font-medium">
                Saldo pendiente
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/my-customers/${c.id}`}
                    className="font-medium text-[#1E3A5F] hover:text-[#3B82F6]"
                  >
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {c.phone ?? "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {c.address ?? "—"}
                </td>
                <td
                  className={`px-4 py-3 text-right font-semibold ${
                    c.pending_balance > 0
                      ? "text-[#EF4444]"
                      : "text-[#10B981]"
                  }`}
                >
                  {formatCurrency(c.pending_balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
