"use client";

import { useActionState, useEffect, useRef } from "react";
import { createUser, updateUser } from "@/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ActionResponse, User } from "@/types";

const initialState: ActionResponse = { success: false };

interface UserFormDialogProps {
  open: boolean;
  onClose: () => void;
  user?: User | null;
}

export function UserFormDialog({ open, onClose, user }: UserFormDialogProps) {
  const isEditing = !!user;
  const actionFn = isEditing
    ? updateUser.bind(null, user.id)
    : createUser;

  const [state, formAction, isPending] = useActionState(actionFn, initialState);
  const prevSuccessRef = useRef(false);

  useEffect(() => {
    if (state.success && !prevSuccessRef.current) {
      onClose();
    }
    prevSuccessRef.current = state.success;
  }, [state.success, onClose]);

  useEffect(() => {
    if (open) {
      prevSuccessRef.current = false;
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1E293B]">
            {isEditing ? "Editar Usuario" : "Nuevo Usuario"}
          </DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {state.error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={user?.name ?? ""}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={user?.email ?? ""}
              disabled={isPending}
            />
          </div>

          {!isEditing && (
            <>
              <div className="space-y-2">
                <Label htmlFor="password">Contrasena *</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Rol *</Label>
                <Select name="role" required defaultValue="">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="courier">Domiciliario</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {isEditing && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-[#64748B]">
              Rol: <strong>{user.role === "admin" ? "Administrador" : "Domiciliario"}</strong>
              {" — "}No se puede cambiar el rol de un usuario existente.
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-[#1E3A5F] hover:bg-[#2d4f7a]"
              disabled={isPending}
            >
              {isPending
                ? "Guardando..."
                : isEditing
                  ? "Guardar cambios"
                  : "Crear usuario"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
