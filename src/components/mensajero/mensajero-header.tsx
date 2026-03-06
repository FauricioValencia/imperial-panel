"use client";

import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cerrarSesion } from "@/actions/auth";
import type { Usuario } from "@/types";

const titulos: Record<string, string> = {
  "/entregas": "Mis Entregas",
  "/ruta": "Mi Ruta",
  "/historial": "Historial",
};

export function MensajeroHeader({ usuario }: { usuario: Usuario }) {
  const pathname = usePathname();
  const titulo = titulos[pathname] || "Imperial";

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-[#1E3A5F] px-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
          <span className="text-xs font-bold text-white">I</span>
        </div>
        <h1 className="text-base font-semibold text-white">{titulo}</h1>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-white/70">{usuario.nombre}</span>
        <form action={cerrarSesion}>
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
