import { Users, ShieldCheck, Bike, Settings } from "lucide-react";
import Link from "next/link";
import { getUserStats } from "@/actions/users";
import { getBusinessConfig } from "@/actions/business-config";

export default async function SuperAdminDashboard() {
  const [statsResult, configResult] = await Promise.all([
    getUserStats(),
    getBusinessConfig(),
  ]);

  const stats = statsResult.data;
  const config = configResult.data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E293B]">
          Panel Super Administrador
        </h2>
        <p className="text-sm text-[#64748B]">
          Gestion de usuarios y configuracion del sistema
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1E293B]">
                {stats?.admins ?? 0}
              </p>
              <p className="text-sm text-[#64748B]">Administradores</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <Bike className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1E293B]">
                {stats?.couriers ?? 0}
              </p>
              <p className="text-sm text-[#64748B]">Domiciliarios</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1E293B]">
                {stats?.active ?? 0}
              </p>
              <p className="text-sm text-[#64748B]">Usuarios activos</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
              <Users className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1E293B]">
                {stats?.inactive ?? 0}
              </p>
              <p className="text-sm text-[#64748B]">Usuarios inactivos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick access */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin-panel/users"
          className="group rounded-lg border border-slate-200 bg-white p-6 transition-colors hover:border-[#3B82F6]"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#1E3A5F]/10">
              <Users className="h-6 w-6 text-[#1E3A5F]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#1E293B] group-hover:text-[#3B82F6]">
                Gestionar Usuarios
              </h3>
              <p className="text-sm text-[#64748B]">
                Crear, editar y administrar admins y domiciliarios
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin-panel/config"
          className="group rounded-lg border border-slate-200 bg-white p-6 transition-colors hover:border-[#3B82F6]"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#1E3A5F]/10">
              <Settings className="h-6 w-6 text-[#1E3A5F]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#1E293B] group-hover:text-[#3B82F6]">
                Configuracion
              </h3>
              <p className="text-sm text-[#64748B]">
                {config?.company_name ?? "Empresa"} — Datos del negocio y logo
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
