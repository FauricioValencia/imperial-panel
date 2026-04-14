"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { createCourier, updateCourier } from "@/actions/couriers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActionResponse, User, Zone } from "@/types";

const initialState: ActionResponse = { success: false };

interface CourierFormProps {
  open: boolean;
  onClose: () => void;
  courier?: User | null;
  zones?: Zone[];
}

export function CourierForm({ open, onClose, courier, zones = [] }: CourierFormProps) {
  const isEditing = !!courier;
  const actionFn = isEditing
    ? updateCourier.bind(null, courier.id)
    : createCourier;

  const [state, formAction, isPending] = useActionState(actionFn, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const prevSuccessRef = useRef(false);
  const [showPassword, setShowPassword] = useState(false);
  const [zoneValue, setZoneValue] = useState<string>(courier?.zone_id ?? "none");

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
            {isEditing ? "Editar Domiciliario" : "Nuevo Domiciliario"}
          </DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="space-y-4">
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
              defaultValue={courier?.name ?? ""}
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
              defaultValue={courier?.email ?? ""}
              disabled={isPending}
            />
          </div>

          {zones.filter((z) => z.id).length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="zone_id">Zona</Label>
              <input
                type="hidden"
                name="zone_id"
                value={zoneValue === "none" ? "" : zoneValue}
              />
              <Select
                value={zoneValue || "none"}
                onValueChange={setZoneValue}
                disabled={isPending}
              >
                <SelectTrigger id="zone_id">
                  <SelectValue placeholder="Sin zona asignada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin zona</SelectItem>
                  {zones
                    .filter((z) => z.id)
                    .map((z) => (
                      <SelectItem key={z.id} value={z.id}>
                        {z.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="password">Contrasena *</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder="Minimo 6 caracteres"
                  disabled={isPending}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#64748B] hover:text-[#1E293B]"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-[#1E3A5F] hover:bg-[#2d4f7a]" disabled={isPending}>
              {isPending ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear domiciliario"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
