"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { RegisterChargeDialog } from "./register-charge-dialog";
import { cancelManualCharge } from "@/actions/billing";
import { formatCurrency } from "@/lib/format";
import type { ChargeType, Customer, CustomerCharge } from "@/types";

const chargeTypeLabels: Record<ChargeType, string> = {
  legacy_debt: "Deuda anterior",
  adjustment: "Ajuste",
  late_fee: "Recargo / mora",
  service: "Servicio",
  other: "Otro",
};

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

interface ManualChargesCardProps {
  customer: Customer;
  charges: CustomerCharge[];
}

export function ManualChargesCard({ customer, charges }: ManualChargesCardProps) {
  const router = useRouter();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<CustomerCharge | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [isPending, startTransition] = useTransition();

  function closeCancelDialog() {
    setCancelTarget(null);
    setCancelReason("");
    setCancelError("");
  }

  function handleCancel() {
    if (!cancelTarget) return;
    setCancelError("");

    if (cancelReason.trim().length < 5) {
      setCancelError("Indica un motivo de al menos 5 caracteres");
      return;
    }

    startTransition(async () => {
      const result = await cancelManualCharge({
        charge_id: cancelTarget.id,
        cancel_reason: cancelReason.trim(),
      });
      if (result.success) {
        closeCancelDialog();
        router.refresh();
      } else {
        setCancelError(result.error || "Error al anular el cargo");
      }
    });
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base text-[#1E293B]">Ajustes manuales de cartera</CardTitle>
          <Button
            size="sm"
            onClick={() => setRegisterOpen(true)}
            className="bg-[#1E3A5F] hover:bg-[#16304D]"
          >
            <Plus className="mr-1 h-4 w-4" />
            Agregar cargo
          </Button>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {charges.length === 0 ? (
              <p className="py-4 text-center text-sm text-[#64748B]">
                No hay ajustes manuales
              </p>
            ) : (
              charges.map((charge) => {
                const isCancelled = charge.cancelled_at != null;
                return (
                  <div
                    key={charge.id}
                    className={`rounded-lg border p-3 ${
                      isCancelled ? "border-slate-200 bg-slate-50" : "border-red-100"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Badge
                          variant="secondary"
                          className="bg-red-100 text-xs text-red-700"
                        >
                          {chargeTypeLabels[charge.charge_type]}
                        </Badge>
                        <p className="mt-1 text-xs text-[#64748B]">
                          {formatDate(charge.created_at)}
                        </p>
                      </div>
                      <span
                        className={`font-medium ${
                          isCancelled
                            ? "text-[#64748B] line-through"
                            : "text-[#EF4444]"
                        }`}
                      >
                        {formatCurrency(charge.amount)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[#1E293B]">{charge.reason}</p>
                    {isCancelled ? (
                      <p className="mt-2 text-xs italic text-[#64748B]">
                        Anulado: {charge.cancel_reason}
                      </p>
                    ) : (
                      <div className="mt-3 flex justify-end border-t border-slate-100 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCancelTarget(charge)}
                          className="border-[#EF4444] text-[#EF4444] hover:bg-red-50"
                        >
                          <Ban className="mr-1 h-3 w-3" />
                          Anular
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="hidden lg:table-cell">Fecha</TableHead>
                  <TableHead className="w-[100px]">Estado</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {charges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-[#64748B]">
                      No hay ajustes manuales
                    </TableCell>
                  </TableRow>
                ) : (
                  charges.map((charge) => {
                    const isCancelled = charge.cancelled_at != null;
                    return (
                      <TableRow
                        key={charge.id}
                        className={isCancelled ? "opacity-60" : undefined}
                      >
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="bg-red-100 text-red-700"
                          >
                            {chargeTypeLabels[charge.charge_type]}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm text-[#1E293B]">
                          {charge.reason}
                          {isCancelled && charge.cancel_reason && (
                            <span className="block text-xs italic text-[#64748B]">
                              Anulado: {charge.cancel_reason}
                            </span>
                          )}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${
                            isCancelled
                              ? "text-[#64748B] line-through"
                              : "text-[#EF4444]"
                          }`}
                        >
                          {formatCurrency(charge.amount)}
                        </TableCell>
                        <TableCell className="hidden text-sm text-[#64748B] lg:table-cell">
                          {formatDate(charge.created_at)}
                        </TableCell>
                        <TableCell>
                          {isCancelled ? (
                            <Badge variant="outline" className="text-xs text-[#64748B]">
                              Anulado
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="bg-emerald-100 text-emerald-700"
                            >
                              Activo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!isCancelled && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setCancelTarget(charge)}
                              className="border-[#EF4444] text-[#EF4444] hover:bg-red-50"
                            >
                              <Ban className="mr-1 h-3 w-3" />
                              Anular
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <RegisterChargeDialog
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        customer={customer}
      />

      <Dialog
        open={cancelTarget != null}
        onOpenChange={(o) => { if (!o) closeCancelDialog(); }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1E293B]">Anular cargo manual</DialogTitle>
            <DialogDescription>
              {cancelTarget && (
                <>
                  {chargeTypeLabels[cancelTarget.charge_type]} —{" "}
                  {formatCurrency(cancelTarget.amount)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {cancelError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {cancelError}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#1E293B]">
              Motivo de la anulacion
            </label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Explica por que se anula este cargo"
              rows={3}
              maxLength={500}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeCancelDialog}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCancel}
              disabled={isPending}
              className="bg-[#EF4444] hover:bg-[#DC2626]"
            >
              {isPending ? "Anulando..." : "Confirmar anulacion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
