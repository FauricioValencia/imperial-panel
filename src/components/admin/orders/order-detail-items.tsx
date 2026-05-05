import { Package, Undo2 } from "lucide-react";
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
import type { OrderItem } from "@/types";

interface OrderDetailItemsProps {
  items: OrderItem[];
}

export function OrderDetailItems({ items }: OrderDetailItemsProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center sm:px-0">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-[#94A3B8]">
          <Package className="h-5 w-5" aria-hidden />
        </div>
        <p className="text-sm text-[#64748B]">Sin productos en este pedido.</p>
      </div>
    );
  }

  const totalUnits = items.reduce((acc, it) => acc + it.quantity, 0);
  const totalAmount = items.reduce(
    (acc, it) => acc + it.quantity * it.unit_price,
    0,
  );

  return (
    <>
      <div className="md:hidden">
        <ul className="divide-y divide-slate-100">
          {items.map((item) => {
            const subtotal = item.quantity * item.unit_price;
            const name = item.product?.name || "—";
            const hasReturn = item.returned_quantity > 0;

            return (
              <li
                key={item.id}
                className="flex items-center gap-3.5 px-4 py-3.5 transition active:bg-slate-50"
              >
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[#F1F5F9] ring-1 ring-inset ring-slate-200/60">
                  <span className="text-[15px] font-bold leading-none tabular-nums text-[#1E3A5F]">
                    {item.quantity}
                  </span>
                  <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#94A3B8]">
                    und
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="wrap-break-word text-[15px] font-semibold leading-snug text-[#1E293B]">
                    {name}
                  </h3>
                  <p className="mt-1 text-xs tabular-nums text-[#94A3B8]">
                    {formatCurrency(item.unit_price)}
                    <span className="text-[#CBD5E1]"> · </span>c/u
                  </p>
                  {hasReturn ? (
                    <p className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                      <Undo2 className="h-2.5 w-2.5" aria-hidden />
                      {item.returned_quantity} devuelta
                      {item.returned_quantity > 1 ? "s" : ""}
                    </p>
                  ) : null}
                </div>

                <p className="shrink-0 text-[15px] font-bold tabular-nums tracking-tight text-[#1E293B]">
                  {formatCurrency(subtotal)}
                </p>
              </li>
            );
          })}
        </ul>

        <div className="mt-1 flex items-center justify-between border-t-2 border-dashed border-slate-200 px-4 pt-3.5 pb-4">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#94A3B8]">
              Total
            </span>
            <span className="text-[11px] text-[#64748B]">
              {totalUnits} unidad{totalUnits === 1 ? "" : "es"}
            </span>
          </div>
          <span className="text-xl font-bold tabular-nums tracking-tight text-[#1E3A5F]">
            {formatCurrency(totalAmount)}
          </span>
        </div>
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="text-center">Cantidad</TableHead>
              <TableHead className="text-right">Precio Unit.</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="text-center">Devuelto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium text-[#1E293B]">
                  {item.product?.name || "—"}
                </TableCell>
                <TableCell className="text-center">{item.quantity}</TableCell>
                <TableCell className="text-right text-[#64748B]">
                  {formatCurrency(item.unit_price)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(item.quantity * item.unit_price)}
                </TableCell>
                <TableCell className="text-center">
                  {item.returned_quantity > 0 ? (
                    <Badge variant="destructive" className="bg-[#EF4444]">
                      {item.returned_quantity} devuelto
                      {item.returned_quantity > 1 ? "s" : ""}
                    </Badge>
                  ) : (
                    <span className="text-[#64748B]">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
