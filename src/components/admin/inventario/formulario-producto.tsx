"use client";

import { useActionState, useEffect, useRef } from "react";
import { crearProducto, editarProducto } from "@/actions/inventario";
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

interface FormularioProductoProps {
  abierto: boolean;
  onCerrar: () => void;
  producto?: Producto | null;
}

export function FormularioProducto({ abierto, onCerrar, producto }: FormularioProductoProps) {
  const esEdicion = !!producto;
  const actionFn = esEdicion
    ? editarProducto.bind(null, producto.id)
    : crearProducto;

  const [estado, formAction, isPending] = useActionState(actionFn, estadoInicial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.success) {
      onCerrar();
    }
  }, [estado.success, onCerrar]);

  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && onCerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1E293B]">
            {esEdicion ? "Editar Producto" : "Nuevo Producto"}
          </DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="space-y-4">
          {estado.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {estado.error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              name="nombre"
              required
              defaultValue={producto?.nombre ?? ""}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripcion</Label>
            <Textarea
              id="descripcion"
              name="descripcion"
              defaultValue={producto?.descripcion ?? ""}
              disabled={isPending}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="precio">Precio *</Label>
              <Input
                id="precio"
                name="precio"
                type="number"
                min="0"
                step="1"
                required
                defaultValue={producto?.precio ?? ""}
                disabled={isPending}
              />
            </div>

            {!esEdicion && (
              <div className="space-y-2">
                <Label htmlFor="stock">Stock inicial</Label>
                <Input
                  id="stock"
                  name="stock"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={0}
                  disabled={isPending}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="stock_minimo">Stock minimo</Label>
              <Input
                id="stock_minimo"
                name="stock_minimo"
                type="number"
                min="0"
                step="1"
                defaultValue={producto?.stock_minimo ?? 5}
                disabled={isPending}
              />
            </div>
          </div>

          {esEdicion && (
            <input type="hidden" name="stock" value={producto.stock} />
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onCerrar} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-[#1E3A5F] hover:bg-[#2d4f7a]" disabled={isPending}>
              {isPending ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear producto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
