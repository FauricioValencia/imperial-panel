"use client";

import { useState, useTransition } from "react";
import { Pencil, UserCheck, UserX, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserFormDialog } from "./user-form-dialog";
import { toggleUserActive } from "@/actions/users";
import type { User } from "@/types";

const roleBadge: Record<string, { label: string; className: string }> = {
  admin: { label: "Admin", className: "bg-blue-100 text-blue-700" },
  courier: { label: "Domiciliario", className: "bg-emerald-100 text-emerald-700" },
};

interface UsersTableProps {
  initialUsers: User[];
}

export function UsersTable({ initialUsers }: UsersTableProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [togglingUser, setTogglingUser] = useState<User | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = initialUsers.filter((u) => {
    const term = search.toLowerCase();
    const matchesSearch =
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term);
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  function handleEdit(user: User) {
    setEditingUser(user);
    setFormOpen(true);
  }

  function handleNew() {
    setEditingUser(null);
    setFormOpen(true);
  }

  function handleToggleActive() {
    if (!togglingUser) return;
    startTransition(async () => {
      const result = await toggleUserActive(togglingUser.id);
      if (!result.success) {
        alert(result.error);
      }
      setTogglingUser(null);
    });
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
            <Input
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="courier">Domiciliario</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleNew} className="bg-[#1E3A5F] hover:bg-[#2d4f7a]">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-[#64748B]">
                  {search || roleFilter !== "all"
                    ? "No se encontraron usuarios"
                    : "No hay usuarios registrados"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium text-[#1E293B]">
                    {user.name}
                  </TableCell>
                  <TableCell className="text-[#64748B]">{user.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={roleBadge[user.role]?.className ?? ""}
                    >
                      {roleBadge[user.role]?.label ?? user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.active ? (
                      <Badge className="bg-emerald-100 text-emerald-700">
                        Activo
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700">
                        Inactivo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(user)}
                        className="rounded-md p-1.5 text-[#64748B] hover:bg-slate-100 hover:text-[#3B82F6]"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setTogglingUser(user)}
                        className={`rounded-md p-1.5 text-[#64748B] hover:bg-slate-100 ${
                          user.active
                            ? "hover:text-[#EF4444]"
                            : "hover:text-[#10B981]"
                        }`}
                        title={user.active ? "Desactivar" : "Activar"}
                      >
                        {user.active ? (
                          <UserX className="h-4 w-4" />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <UserFormDialog
        key={editingUser?.id ?? "new"}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        user={editingUser}
      />

      <Dialog
        open={!!togglingUser}
        onOpenChange={(open) => !open && setTogglingUser(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {togglingUser?.active ? "Desactivar" : "Activar"} Usuario
            </DialogTitle>
            <DialogDescription>
              Se {togglingUser?.active ? "desactivara" : "activara"} al usuario{" "}
              <strong>{togglingUser?.name}</strong>.
              {togglingUser?.active &&
                " No podra iniciar sesion hasta que sea reactivado."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTogglingUser(null)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              variant={togglingUser?.active ? "destructive" : "default"}
              onClick={handleToggleActive}
              disabled={isPending}
              className={
                !togglingUser?.active ? "bg-[#10B981] hover:bg-[#059669]" : ""
              }
            >
              {isPending
                ? "Procesando..."
                : togglingUser?.active
                  ? "Desactivar"
                  : "Activar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
