"use client";

import { useActionState, useEffect, useRef } from "react";
import { createZone, updateZone } from "@/actions/zones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ActionResponse, Zone } from "@/types";

const initialState: ActionResponse = { success: false };

interface ZoneFormProps {
  open: boolean;
  onClose: () => void;
  zone?: Zone | null;
}

export function ZoneForm({ open, onClose, zone }: ZoneFormProps) {
  const isEditing = !!zone;
  const actionFn = isEditing ? updateZone.bind(null, zone.id) : createZone;

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
            {isEditing ? "Editar Zona" : "Nueva Zona"}
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
              defaultValue={zone?.name ?? ""}
              disabled={isPending}
              placeholder="Ej: Norte, Sur, Centro"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={zone?.description ?? ""}
              disabled={isPending}
              rows={2}
              placeholder="Barrios, calles o referencias que cubre esta zona"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-[#1E3A5F] hover:bg-[#2d4f7a]" disabled={isPending}>
              {isPending ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear zona"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
