import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { obtenerUsuarioActual } from "@/actions/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await obtenerUsuarioActual();

  if (!usuario) {
    redirect("/login");
  }

  if (usuario.rol !== "admin") {
    redirect("/entregas");
  }

  return (
    <SidebarProvider>
      <AdminSidebar usuario={usuario} />
      <SidebarInset>
        <AdminHeader />
        <main className="flex-1 overflow-auto bg-slate-50 p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
