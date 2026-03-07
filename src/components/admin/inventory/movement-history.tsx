"use client";

import { useEffect, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, RotateCcw, Settings2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { listMovements } from "@/actions/inventory";
import type { InventoryMovement, MovementType } from "@/types";

const iconsByType: Record<MovementType, typeof ArrowDownCircle> = {
  inbound: ArrowDownCircle,
  outbound: ArrowUpCircle,
  return: RotateCcw,
  adjustment: Settings2,
};

const colorsByType: Record<MovementType, string> = {
  inbound: "bg-emerald-100 text-emerald-700",
  outbound: "bg-red-100 text-red-700",
  return: "bg-blue-100 text-blue-700",
  adjustment: "bg-amber-100 text-amber-700",
};

const labelsByType: Record<MovementType, string> = {
  inbound: "Entrada",
  outbound: "Salida",
  return: "Devolucion",
  adjustment: "Ajuste",
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

interface MovementHistoryProps {
  open: boolean;
  onClose: () => void;
  productId: string | null;
  productName: string;
}

export function MovementHistory({
  open,
  onClose,
  productId,
  productName,
}: MovementHistoryProps) {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && productId) {
      setLoading(true);
      listMovements(productId).then((res) => {
        if (res.success && res.data) {
          setMovements(res.data);
        }
        setLoading(false);
      });
    }
  }, [open, productId]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[#1E293B]">
            Movimientos - {productName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-[#64748B]">Cargando movimientos...</p>
          </div>
        ) : movements.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-[#64748B]">No hay movimientos registrados</p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-auto rounded-lg border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((mov) => {
                  const Icon = iconsByType[mov.type as MovementType];
                  const color = colorsByType[mov.type as MovementType];
                  const label = labelsByType[mov.type as MovementType];
                  return (
                    <TableRow key={mov.id}>
                      <TableCell>
                        <Badge variant="secondary" className={color}>
                          <Icon className="mr-1 h-3 w-3" />
                          {label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {mov.type === "outbound" ? "-" : "+"}{mov.quantity}
                      </TableCell>
                      <TableCell className="text-[#64748B] max-w-[200px] truncate">
                        {mov.notes || "—"}
                      </TableCell>
                      <TableCell className="text-[#64748B] text-sm">
                        {formatDate(mov.created_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
