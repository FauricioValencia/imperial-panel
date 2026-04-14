import { redirect } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { getCurrentUser, signOut } from "@/actions/auth";

export default async function CommercialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "commercial") {
    if (user.role === "admin" || user.role === "super_admin") {
      redirect("/dashboard");
    }
    if (user.role === "courier") {
      redirect("/deliveries");
    }
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-[#1E3A5F] px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
            <span className="text-xs font-bold text-white">I</span>
          </div>
          <Link
            href="/my-customers"
            className="text-base font-semibold text-white"
          >
            Mis Clientes
          </Link>
        </div>
        <div className="flex items-center gap-3">
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
      <main className="flex-1 overflow-auto px-4 py-6">{children}</main>
    </div>
  );
}
