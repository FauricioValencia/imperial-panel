"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { gananciaEstimadaPorUnidad } from "@/lib/customer-pricing";
import type { CustomerPrice, Product } from "@/types";

interface CustomerAgreedPricesTableProps {
  initialPrices: CustomerPrice[];
  productById: Map<string, Product>;
  inventoryCppByProductId: Record<string, number | null>;
  isPending: boolean;
  onDeactivate: (priceId: string) => void;
  onReactivateEdit: (row: CustomerPrice) => void;
}

export function CustomerAgreedPricesTable({
  initialPrices,
  productById,
  inventoryCppByProductId,
  isPending,
  onDeactivate,
  onReactivateEdit,
}: CustomerAgreedPricesTableProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead className="text-right">Lista</TableHead>
            <TableHead className="text-right">Acordado</TableHead>
            <TableHead
              className="text-right"
              title="Precio acordado menos costo promedio ponderado del inventario vigente (por unidad)."
            >
              Ganancia / u.
            </TableHead>
            <TableHead className="w-[100px]">Estado</TableHead>
            <TableHead className="w-[90px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialPrices.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-sm text-[#64748B]">
                Sin precios acordados. Usa el precio de lista en pedidos.
              </TableCell>
            </TableRow>
          ) : (
            initialPrices.map((row) => {
              const list = row.product?.price ?? productById.get(row.product_id)?.price ?? 0;
              const diffPct =
                list > 0 ? Math.round(((row.custom_price - list) / list) * 1000) / 10 : null;
              const cpp = inventoryCppByProductId[row.product_id];
              const ganancia = gananciaEstimadaPorUnidad(row.custom_price, cpp);
              const margenSobreVentaPct =
                ganancia != null && row.custom_price > 0
                  ? Math.round((ganancia / row.custom_price) * 1000) / 10
                  : null;
              return (
                <TableRow key={row.id}>
                  <TableCell className="font-medium text-[#1E293B]">
                    {row.product?.name ?? productById.get(row.product_id)?.name ?? row.product_id}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-[#64748B]">
                    {formatCurrency(list)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className="font-medium text-[#1E293B]">{formatCurrency(row.custom_price)}</span>
                    {diffPct !== null && diffPct !== 0 && (
                      <span className="ml-2 text-xs text-[#64748B]">
                        ({diffPct > 0 ? "+" : ""}
                        {diffPct}%)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {ganancia == null ? (
                      <span className="text-sm text-[#64748B]">Sin CPP</span>
                    ) : (
                      <>
                        <span
                          className={
                            ganancia >= 0 ? "font-medium text-[#10B981]" : "font-medium text-[#EF4444]"
                          }
                        >
                          {formatCurrency(ganancia)}
                        </span>
                        {margenSobreVentaPct != null && (
                          <span className="ml-2 text-xs text-[#64748B]">
                            ({margenSobreVentaPct > 0 ? "+" : ""}
                            {margenSobreVentaPct}%)
                          </span>
                        )}
                      </>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.active ? (
                      <Badge className="bg-[#10B981]">Activo</Badge>
                    ) : (
                      <Badge variant="secondary">Inactivo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.active ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        disabled={isPending}
                        onClick={() => onDeactivate(row.id)}
                      >
                        Desactivar
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto px-0 text-xs text-[#3B82F6]"
                        disabled={isPending}
                        onClick={() => {
                          onReactivateEdit(row);
                        }}
                      >
                        Reactivar
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
  );
}
