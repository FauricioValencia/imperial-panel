"use client";

import { Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";

export interface OrderItemsSummaryRow {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface OrderItemsSummaryProps {
  items: OrderItemsSummaryRow[];
  onRemoveItem: (productId: string) => void;
}

export function OrderItemsSummary({ items, onRemoveItem }: OrderItemsSummaryProps) {
  const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  return (
    <div className="space-y-2">
      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 md:hidden">
        {items.map((item) => {
          const subtotal = item.quantity * item.unit_price;
          return (
            <li key={item.product_id} className="p-3">
              <div className="flex gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium wrap-break-word text-[#1E293B]">{item.product_name}</p>
                  <p className="mt-1 text-xs text-[#64748B]">
                    {item.quantity} × {formatCurrency(item.unit_price)} c/u
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end justify-between gap-2">
                  <span className="text-sm font-semibold tabular-nums text-[#1E3A5F]">
                    {formatCurrency(subtotal)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.product_id)}
                    className="rounded-md p-1.5 text-[#64748B] hover:bg-slate-100 hover:text-[#EF4444]"
                    aria-label={`Quitar ${item.product_name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
        <li className="flex items-center justify-between gap-3 bg-slate-50/90 px-3 py-3">
          <span className="font-semibold text-[#1E293B]">Total</span>
          <span className="text-lg font-bold tabular-nums text-[#1E3A5F]">
            {formatCurrency(total)}
          </span>
        </li>
      </ul>

      <div className="hidden rounded-lg border border-slate-200 md:block">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[38%] min-w-0">Producto</TableHead>
              <TableHead className="w-14 text-center">Cant.</TableHead>
              <TableHead className="w-[22%] text-right">Precio</TableHead>
              <TableHead className="w-[22%] text-right">Subtotal</TableHead>
              <TableHead className="w-10 px-1" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.product_id}>
                <TableCell className="min-w-0 font-medium wrap-break-word text-[#1E293B]">
                  {item.product_name}
                </TableCell>
                <TableCell className="text-center tabular-nums">{item.quantity}</TableCell>
                <TableCell className="text-right tabular-nums text-[#64748B]">
                  {formatCurrency(item.unit_price)}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatCurrency(item.quantity * item.unit_price)}
                </TableCell>
                <TableCell className="px-1">
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.product_id)}
                    className="rounded-md p-1 text-[#64748B] hover:text-[#EF4444]"
                    aria-label={`Quitar ${item.product_name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={3} className="text-right font-semibold text-[#1E293B]">
                Total
              </TableCell>
              <TableCell className="text-right text-lg font-bold tabular-nums text-[#1E3A5F]">
                {formatCurrency(total)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
