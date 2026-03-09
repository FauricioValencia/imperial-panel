import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SuperAdminSidebar } from "@/components/super-admin/super-admin-sidebar";
import { SuperAdminHeader } from "@/components/super-admin/super-admin-header";
import { getCurrentUser } from "@/actions/auth";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "courier") {
    redirect("/deliveries");
  }

  if (user.role !== "super_admin") {
    redirect("/dashboard");
  }

  return (
    <SidebarProvider>
      <SuperAdminSidebar user={user} />
      <SidebarInset>
        <SuperAdminHeader />
        <main className="flex-1 overflow-auto bg-slate-50 p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
