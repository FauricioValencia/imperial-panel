import { redirect } from "next/navigation";
import { BottomNav } from "@/components/mensajero/bottom-nav";
import { MensajeroHeader } from "@/components/mensajero/mensajero-header";
import { obtenerUsuarioActual } from "@/actions/auth";

export default async function MensajeroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await obtenerUsuarioActual();

  if (!usuario) {
    redirect("/login");
  }

  if (usuario.rol !== "mensajero") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <MensajeroHeader usuario={usuario} />
      <main className="flex-1 overflow-auto px-4 pb-20 pt-4">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
