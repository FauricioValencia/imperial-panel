"use client";

import { useActionState, useEffect, useRef } from "react";
import { crearCliente, editarCliente } from "@/actions/clientes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ActionResponse, Cliente } from "@/types";

const estadoInicial: ActionResponse = { success: false };

interface FormularioClienteProps {
  abierto: boolean;
  onCerrar: () => void;
  cliente?: Cliente | null;
}

export function FormularioCliente({ abierto, onCerrar, cliente }: FormularioClienteProps) {
  const esEdicion = !!cliente;
  const actionFn = esEdicion
    ? editarCliente.bind(null, cliente.id)
    : crearCliente;

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
            {esEdicion ? "Editar Cliente" : "Nuevo Cliente"}
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
              defaultValue={cliente?.nombre ?? ""}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefono">Telefono</Label>
            <Input
              id="telefono"
              name="telefono"
              type="tel"
              defaultValue={cliente?.telefono ?? ""}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="direccion">Direccion</Label>
            <Input
              id="direccion"
              name="direccion"
              defaultValue={cliente?.direccion ?? ""}
              disabled={isPending}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onCerrar} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-[#1E3A5F] hover:bg-[#2d4f7a]" disabled={isPending}>
              {isPending ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear cliente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
