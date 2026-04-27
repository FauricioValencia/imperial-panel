"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Droplet,
  Gift,
  RotateCcw,
  Settings2,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { listMovements } from "@/actions/inventory";
import type { InventoryMovement, MovementType } from "@/types";

type MovementCategory = "inbound" | "merma" | "muestra" | "return" | "adjustment";
type FilterValue = "all" | "inbound" | "merma" | "muestra";

interface CategoryStyle {
  label: string;
  icon: typeof ArrowDownCircle;
  className: string;
}

const categoryStyles: Record<MovementCategory, CategoryStyle> = {
  inbound: {
    label: "Entrada",
    icon: ArrowDownCircle,
    // Verde #10B981
    className: "bg-[#10B981]/15 text-[#047857] border-[#10B981]/30",
  },
  merma: {
    label: "Merma",
    icon: Droplet,
    // Ámbar #F59E0B
    className: "bg-[#F59E0B]/15 text-[#B45309] border-[#F59E0B]/30",
  },
  muestra: {
    label: "Muestra",
    icon: Gift,
    // Azul #3B82F6
    className: "bg-[#3B82F6]/15 text-[#1D4ED8] border-[#3B82F6]/30",
  },
  return: {
    label: "Devolución",
    icon: RotateCcw,
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  adjustment: {
    label: "Ajuste",
    icon: Settings2,
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

function categorizeMovement(mov: InventoryMovement): MovementCategory {
  const type = mov.type as MovementType;
  if (type === "outbound") {
    if (mov.reason === "merma") return "merma";
    if (mov.reason === "muestra") return "muestra";
    return "merma";
  }
  if (type === "inbound") return "inbound";
  if (type === "return") return "return";
  return "adjustment";
}

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
  const [filter, setFilter] = useState<FilterValue>("all");

  useEffect(() => {
    if (open && productId) {
      setLoading(true);
      setFilter("all");
      listMovements(productId).then((res) => {
        if (res.success && res.data) {
          setMovements(res.data);
        }
        setLoading(false);
      });
    }
  }, [open, productId]);

  const filteredMovements = useMemo(() => {
    if (filter === "all") return movements;
    return movements.filter((mov) => {
      const category = categorizeMovement(mov);
      return category === filter;
    });
  }, [movements, filter]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-2xl">
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
          <div className="space-y-3">
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Label htmlFor="movement-filter" className="text-xs text-[#64748B]">
                Filtrar por tipo
              </Label>
              <Select
                value={filter}
                onValueChange={(v) => setFilter(v as FilterValue)}
              >
                <SelectTrigger
                  id="movement-filter"
                  className="h-8 w-full text-sm sm:w-[180px]"
                  aria-label="Filtrar movimientos por tipo"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="inbound">Entradas</SelectItem>
                  <SelectItem value="merma">Mermas</SelectItem>
                  <SelectItem value="muestra">Muestras</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-[#64748B]">
                {filteredMovements.length} de {movements.length}
              </span>
            </div>

            <div className="max-h-[400px] overflow-auto rounded-lg border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Cant.</TableHead>
                    <TableHead className="hidden sm:table-cell">Detalle / Notas</TableHead>
                    <TableHead className="hidden md:table-cell">Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovements.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-6 text-center text-sm text-[#64748B]"
                      >
                        No hay movimientos para este filtro
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMovements.map((mov) => {
                      const category = categorizeMovement(mov);
                      const style = categoryStyles[category];
                      const Icon = style.icon;
                      const isOutbound = mov.type === "outbound";
                      const isMuestra = category === "muestra";
                      const customerLabel = isMuestra
                        ? mov.sample_customer?.name
                          ? mov.sample_customer.name
                          : "Cliente eliminado"
                        : null;
                      const customerClass =
                        isMuestra && !mov.sample_customer
                          ? "text-[#64748B] italic"
                          : "text-[#1E293B]";
                      return (
                        <TableRow key={mov.id}>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`border ${style.className}`}
                            >
                              <Icon className="mr-1 h-3 w-3" />
                              {style.label}
                            </Badge>
                            <p className="mt-1 text-xs text-[#64748B] sm:hidden">
                              {customerLabel && (
                                <span className={`block font-medium ${customerClass}`}>
                                  {customerLabel}
                                </span>
                              )}
                              {mov.notes && (
                                <span className="block truncate">{mov.notes}</span>
                              )}
                              <span className="block">{formatDate(mov.created_at)}</span>
                            </p>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {isOutbound ? "-" : "+"}
                            {mov.quantity}
                          </TableCell>
                          <TableCell className="hidden max-w-[240px] text-[#64748B] sm:table-cell">
                            {customerLabel && (
                              <span
                                className={`block text-xs font-medium ${customerClass}`}
                              >
                                {customerLabel}
                              </span>
                            )}
                            <span className="block truncate">
                              {mov.notes || "—"}
                            </span>
                          </TableCell>
                          <TableCell className="hidden text-sm text-[#64748B] md:table-cell">
                            {formatDate(mov.created_at)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
