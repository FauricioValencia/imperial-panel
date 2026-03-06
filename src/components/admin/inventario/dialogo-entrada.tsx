"use client";

import { useActionState, useEffect } from "react";
import { registrarEntradaInventario } from "@/actions/inventario";
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
import type { ActionResponse, Producto } from "@/types";

const estadoInicial: ActionResponse = { success: false };

interface DialogoEntradaProps {
  abierto: boolean;
  onCerrar: () => void;
  producto: Producto | null;
}

export function DialogoEntrada({ abierto, onCerrar, producto }: DialogoEntradaProps) {
  const [estado, formAction, isPending] = useActionState(registrarEntradaInventario, estadoInicial);

  useEffect(() => {
    if (estado.success) {
      onCerrar();
    }
  }, [estado.success, onCerrar]);

  if (!producto) return null;

  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && onCerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1E293B]">
            Registrar Entrada - {producto.nombre}
          </DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {estado.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {estado.error}
            </div>
          )}

          <input type="hidden" name="producto_id" value={producto.id} />

          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-sm text-[#64748B]">
              Stock actual: <span className="font-semibold text-[#1E293B]">{producto.stock}</span> unidades
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cantidad">Cantidad a ingresar *</Label>
            <Input
              id="cantidad"
              name="cantidad"
              type="number"
              min="1"
              step="1"
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              name="notas"
              placeholder="Ej: Compra a proveedor X"
              disabled={isPending}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onCerrar} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-[#10B981] hover:bg-[#059669]" disabled={isPending}>
              {isPending ? "Registrando..." : "Registrar entrada"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
