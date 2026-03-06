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
import { listarMovimientos } from "@/actions/inventario";
import type { MovimientoInventario, TipoMovimiento } from "@/types";

const iconosPorTipo: Record<TipoMovimiento, typeof ArrowDownCircle> = {
  entrada: ArrowDownCircle,
  salida: ArrowUpCircle,
  devolucion: RotateCcw,
  ajuste: Settings2,
};

const coloresPorTipo: Record<TipoMovimiento, string> = {
  entrada: "bg-emerald-100 text-emerald-700",
  salida: "bg-red-100 text-red-700",
  devolucion: "bg-blue-100 text-blue-700",
  ajuste: "bg-amber-100 text-amber-700",
};

function formatearFecha(fecha: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(fecha));
}

interface HistorialMovimientosProps {
  abierto: boolean;
  onCerrar: () => void;
  productoId: string | null;
  productoNombre: string;
}

export function HistorialMovimientos({
  abierto,
  onCerrar,
  productoId,
  productoNombre,
}: HistorialMovimientosProps) {
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (abierto && productoId) {
      setCargando(true);
      listarMovimientos(productoId).then((res) => {
        if (res.success && res.data) {
          setMovimientos(res.data);
        }
        setCargando(false);
      });
    }
  }, [abierto, productoId]);

  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && onCerrar()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[#1E293B]">
            Movimientos - {productoNombre}
          </DialogTitle>
        </DialogHeader>

        {cargando ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-[#64748B]">Cargando movimientos...</p>
          </div>
        ) : movimientos.length === 0 ? (
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
                {movimientos.map((mov) => {
                  const Icono = iconosPorTipo[mov.tipo as TipoMovimiento];
                  const color = coloresPorTipo[mov.tipo as TipoMovimiento];
                  return (
                    <TableRow key={mov.id}>
                      <TableCell>
                        <Badge variant="secondary" className={color}>
                          <Icono className="mr-1 h-3 w-3" />
                          {mov.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {mov.tipo === "salida" ? "-" : "+"}{mov.cantidad}
                      </TableCell>
                      <TableCell className="text-[#64748B] max-w-[200px] truncate">
                        {mov.notas || "—"}
                      </TableCell>
                      <TableCell className="text-[#64748B] text-sm">
                        {formatearFecha(mov.created_at)}
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
