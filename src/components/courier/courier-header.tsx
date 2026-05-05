"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Warehouse } from "lucide-react";
import { signOut } from "@/actions/auth";
import type { User } from "@/types";

const titles: Record<string, string> = {
  "/deliveries": "Mis Entregas",
  "/route": "Mi Ruta",
  "/history": "Historial",
  "/profile": "Mi Perfil",
  "/warehouse": "Mi Stock Móvil",
};

export function CourierHeader({ user }: { user: User }) {
  const pathname = usePathname();
  const title = titles[pathname] || "Imperial";
  const showWarehouseShortcut = pathname !== "/warehouse";

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-[#1E3A5F] px-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
          <span className="text-xs font-bold text-white">I</span>
        </div>
        <h1 className="text-base font-semibold text-white">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        {showWarehouseShortcut && (
          <Link
            href="/warehouse"
            className="rounded-md p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Mi stock móvil"
          >
            <Warehouse className="h-4 w-4" />
          </Link>
        )}
        <span className="text-xs text-white/70">{user.name}</span>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
            title="Cerrar sesion"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
