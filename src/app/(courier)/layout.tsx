import { redirect } from "next/navigation";
import { BottomNav } from "@/components/courier/bottom-nav";
import { CourierHeader } from "@/components/courier/courier-header";
import { getCurrentUser } from "@/actions/auth";

export default async function CourierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "courier") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <CourierHeader user={user} />
      <main className="flex-1 overflow-auto px-4 pb-20 pt-4">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
