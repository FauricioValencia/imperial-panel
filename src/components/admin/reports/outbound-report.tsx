"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Gift, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getOutboundMovements,
  type OutboundMovementRow,
  type OutboundReportData,
} from "@/actions/reports";
import { formatCurrency } from "@/lib/format";

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function firstDayOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

interface OutboundTableProps {
  title: string;
  icon: typeof AlertTriangle;
  accentClass: string;
  rows: OutboundMovementRow[];
  totalQuantity: number;
  totalValue: number;
  showCustomer: boolean;
  emptyMessage: string;
}

function OutboundTable({
  title,
  icon: Icon,
  accentClass,
  rows,
  totalQuantity,
  totalValue,
  showCustomer,
  emptyMessage,
}: OutboundTableProps) {
  const colSpan = showCustomer ? 6 : 5;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={`h-5 w-5 ${accentClass}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Producto</TableHead>
                {showCustomer && <TableHead>Cliente</TableHead>}
                <TableHead className="text-center">Cantidad</TableHead>
                <TableHead className="text-right">Valor estimado</TableHead>
                <TableHead>Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={colSpan}
                    className="py-6 text-center text-sm text-[#64748B]"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const customerMissing = showCustomer && !row.customer_name;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="text-sm text-[#64748B]">
                        {formatDate(row.created_at)}
                      </TableCell>
                      <TableCell className="font-medium text-[#1E293B]">
                        {row.product_name}
                      </TableCell>
                      {showCustomer && (
                        <TableCell
                          className={
                            customerMissing
                              ? "italic text-[#64748B]"
                              : "text-[#1E293B]"
                          }
                        >
                          {row.customer_name ?? "Cliente eliminado"}
                        </TableCell>
                      )}
                      <TableCell className="text-center">{row.quantity}</TableCell>
                      <TableCell className="text-right font-medium text-[#1E293B]">
                        {formatCurrency(row.estimated_value)}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-sm text-[#64748B]">
                        {row.notes || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            {rows.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell
                    colSpan={showCustomer ? 3 : 2}
                    className="text-right font-medium text-[#1E293B]"
                  >
                    Totales
                  </TableCell>
                  <TableCell className="text-center font-semibold text-[#1E293B]">
                    {totalQuantity}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-[#1E293B]">
                    {formatCurrency(totalValue)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export function OutboundReport() {
  const [from, setFrom] = useState<string>(firstDayOfMonth());
  const [to, setTo] = useState<string>(today());
  const [data, setData] = useState<OutboundReportData | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSearch() {
    setError(null);
    startTransition(async () => {
      const result = await getOutboundMovements({ from, to });
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setData(null);
        setError(result.error ?? "Error al generar el reporte");
      }
      setHasSearched(true);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-[#F59E0B]" />
            Pérdidas y muestras
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="outbound-from">Desde *</Label>
              <Input
                id="outbound-from"
                type="date"
                value={from}
                max={to}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="outbound-to">Hasta *</Label>
              <Input
                id="outbound-to"
                type="date"
                value={to}
                min={from}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleSearch}
                disabled={isPending || !from || !to || from > to}
                className="w-full bg-[#1E3A5F] hover:bg-[#2d4f7a] sm:w-auto"
              >
                {isPending ? "Consultando..." : "Generar reporte"}
              </Button>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-[#64748B]">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#3B82F6]" />
            <span>
              Valor estimado calculado con precio actual del producto, no costo
              histórico.
            </span>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-[#EF4444]">
            {error}
          </CardContent>
        </Card>
      )}

      {hasSearched && data && (
        <>
          <OutboundTable
            title="Mermas"
            icon={AlertTriangle}
            accentClass="text-[#F59E0B]"
            rows={data.mermas}
            totalQuantity={data.totals.mermas_quantity}
            totalValue={data.totals.mermas_value}
            showCustomer={false}
            emptyMessage="No hay mermas registradas en este rango"
          />
          <OutboundTable
            title="Muestras"
            icon={Gift}
            accentClass="text-[#3B82F6]"
            rows={data.muestras}
            totalQuantity={data.totals.muestras_quantity}
            totalValue={data.totals.muestras_value}
            showCustomer={true}
            emptyMessage="No hay muestras registradas en este rango"
          />
        </>
      )}
    </div>
  );
}
