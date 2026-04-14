"use client";

import { useState, useTransition } from "react";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSalesByMonth } from "@/actions/reports";
import { formatCurrency } from "@/lib/format";
import type { SalesByMonthReport, User, Product } from "@/types";

const MONTHS = [
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

interface SalesReportProps {
  couriers: User[];
  products: Product[];
}

export function SalesReport({ couriers, products }: SalesReportProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [year, setYear] = useState(String(currentYear));
  const [month, setMonth] = useState(String(currentMonth));
  const [courierId, setCourierId] = useState("all");
  const [productId, setProductId] = useState("all");
  const [results, setResults] = useState<SalesByMonthReport[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSearch() {
    startTransition(async () => {
      const filters = {
        year: Number(year),
        month: month && month !== "all" ? Number(month) : undefined,
        courier_id: courierId !== "all" ? courierId : undefined,
        product_id: productId !== "all" ? productId : undefined,
      };

      const result = await getSalesByMonth(filters);
      if (result.success && result.data) {
        setResults(result.data);
      } else {
        setResults([]);
      }
      setHasSearched(true);
    });
  }

  const totalAmount = results.reduce((sum, r) => sum + r.total_amount, 0);
  const totalItems = results.reduce((sum, r) => sum + r.total_items, 0);
  const totalOrders = results.reduce((sum, r) => sum + r.total_orders, 0);

  const years = Array.from({ length: 3 }, (_, i) => String(currentYear - i));

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-[#3B82F6]" />
            Ventas por Domiciliario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label>Año *</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mes</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los meses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los meses</SelectItem>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Domiciliario</Label>
              <Select value={courierId} onValueChange={setCourierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {couriers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Producto</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.codigo ? `[${p.codigo}] ` : ""}{p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              onClick={handleSearch}
              disabled={isPending}
              className="bg-[#1E3A5F] hover:bg-[#2d4f7a]"
            >
              {isPending ? "Consultando..." : "Generar reporte"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {hasSearched && (
        <>
          {results.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-[#64748B]">
                No se encontraron datos para los filtros seleccionados
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Resumen */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-[#64748B]">Total pedidos</p>
                    <p className="text-2xl font-bold text-[#1E293B]">{totalOrders}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-[#64748B]">Unidades entregadas</p>
                    <p className="text-2xl font-bold text-[#1E293B]">{totalItems}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-[#64748B]">Total ventas</p>
                    <p className="text-2xl font-bold text-[#10B981]">{formatCurrency(totalAmount)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Tabla detalle */}
              <div className="rounded-lg border border-slate-200 bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Domiciliario</TableHead>
                      <TableHead>Mes</TableHead>
                      {productId !== "all" &&<TableHead>Producto</TableHead>}
                      <TableHead className="text-center">Pedidos</TableHead>
                      <TableHead className="text-center">Unidades</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-[#1E293B]">
                          {row.courier_name}
                        </TableCell>
                        <TableCell className="text-[#64748B]">
                          {MONTHS.find((m) => m.value === String(row.month))?.label} {row.year}
                        </TableCell>
                        {productId !== "all" &&(
                          <TableCell className="text-[#64748B]">
                            {row.product_codigo && (
                              <span className="mr-1 font-mono text-xs">[{row.product_codigo}]</span>
                            )}
                            {row.product_name}
                          </TableCell>
                        )}
                        <TableCell className="text-center">{row.total_orders}</TableCell>
                        <TableCell className="text-center">{row.total_items}</TableCell>
                        <TableCell className="text-right font-medium text-[#1E293B]">
                          {formatCurrency(row.total_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
