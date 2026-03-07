import { redirect } from "next/navigation";
import { getCurrentUser, signOut } from "@/actions/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, User, Mail } from "lucide-react";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-[#1E293B]">Mi Perfil</h2>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1E3A5F]">
              <span className="text-xl font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <CardTitle className="text-lg text-[#1E293B]">{user.name}</CardTitle>
              <p className="text-sm text-[#64748B]">Mensajero</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 text-sm text-[#64748B]">
            <Mail className="h-4 w-4 shrink-0" />
            <span>{user.email}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-[#64748B]">
            <User className="h-4 w-4 shrink-0" />
            <span>ID: {user.id.slice(0, 8)}</span>
          </div>
        </CardContent>
      </Card>

      <form action={signOut}>
        <Button
          type="submit"
          variant="outline"
          className="w-full min-h-[48px] border-[#EF4444] text-[#EF4444] hover:bg-red-50"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesion
        </Button>
      </form>
    </div>
  );
}
