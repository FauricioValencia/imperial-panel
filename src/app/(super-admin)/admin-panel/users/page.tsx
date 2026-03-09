import { listUsers } from "@/actions/users";
import { UsersTable } from "@/components/super-admin/users-table";

export default async function UsersPage() {
  const result = await listUsers();
  const users = result.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E293B]">Usuarios</h2>
        <p className="text-sm text-[#64748B]">
          Gestiona administradores y domiciliarios del sistema
        </p>
      </div>
      <UsersTable initialUsers={users} />
    </div>
  );
}
