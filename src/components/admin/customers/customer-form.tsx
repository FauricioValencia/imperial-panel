"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCustomer, updateCustomer } from "@/actions/customers";
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
import type { ActionResponse, Customer, User } from "@/types";

const initialState: ActionResponse = { success: false };

interface CustomerFormProps {
  open: boolean;
  onClose: () => void;
  customer?: Customer | null;
  couriers?: User[];
}

export function CustomerForm({ open, onClose, customer, couriers = [] }: CustomerFormProps) {
  const isEditing = !!customer;
  const actionFn = isEditing
    ? updateCustomer.bind(null, customer.id)
    : createCustomer;

  const [state, formAction, isPending] = useActionState(actionFn, initialState);
  const formRef = useRef<HTMLFormElement>(null);
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
            {isEditing ? "Editar Cliente" : "Nuevo Cliente"}
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
              defaultValue={customer?.name ?? ""}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefono</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={customer?.phone ?? ""}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Direccion</Label>
            <Input
              id="address"
              name="address"
              defaultValue={customer?.address ?? ""}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference_code">Código de referencia</Label>
            <Input
              id="reference_code"
              name="reference_code"
              placeholder="Ej: CLI-001"
              defaultValue={customer?.reference_code ?? ""}
              disabled={isPending}
              className="uppercase"
            />
          </div>

          {couriers.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="preferred_courier_id">Domiciliario asignado</Label>
              <Select
                name="preferred_courier_id"
                defaultValue={customer?.preferred_courier_id ?? ""}
                disabled={isPending}
              >
                <SelectTrigger id="preferred_courier_id">
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin asignar</SelectItem>
                  {couriers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-[#64748B]">Solo informativo, no afecta la asignación de pedidos</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-[#1E3A5F] hover:bg-[#2d4f7a]" disabled={isPending}>
              {isPending ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear cliente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
