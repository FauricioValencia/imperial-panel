"use client";

import { useEffect, useId, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";

const MAX_UNIT_PRICE = 50_000_000;
const PRICE_EPS = 0.005;

export interface OrderItemsSummaryRow {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface OrderItemsSummaryProps {
  items: OrderItemsSummaryRow[];
  onRemoveItem: (productId: string) => void;
  /** Permite editar el precio por unidad en cada línea (pedido o venta directa). */
  editableUnitPrice?: boolean;
  onChangeUnitPrice?: (productId: string, unitPrice: number) => void;
  /** Precio de referencia (lista o acuerdo) por producto; se muestra como ayuda bajo el campo. */
  suggestedPriceByProductId?: Record<string, number>;
}

function parseCommittedUnitPrice(text: string, fallback: number): number {
  const normalized = text.trim().replace(",", ".");
  const v = Number(normalized);
  if (!Number.isFinite(v) || v <= 0) return fallback;
  const rounded = Math.round(v * 100) / 100;
  return Math.min(rounded, MAX_UNIT_PRICE);
}

function UnitPriceField({
  productId,
  productName,
  unitPrice,
  suggestedPrice,
  onCommit,
}: {
  productId: string;
  productName: string;
  unitPrice: number;
  suggestedPrice?: number;
  onCommit: (v: number) => void;
}) {
  const baseId = useId();
  const inputId = `${baseId}-price-${productId}`;
  const [text, setText] = useState(() => String(unitPrice));

  useEffect(() => {
    setText(String(unitPrice));
  }, [unitPrice]);

  const showSuggested =
    suggestedPrice !== undefined && Math.abs(unitPrice - suggestedPrice) >= PRICE_EPS;

  return (
    <div className="space-y-1">
      <Label htmlFor={inputId} className="sr-only">
        Precio unitario de {productName}
      </Label>
      <Input
        id={inputId}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        className="h-8 min-w-0 text-right tabular-nums"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const next = parseCommittedUnitPrice(text, unitPrice);
          setText(String(next));
          if (next !== unitPrice) onCommit(next);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
      {showSuggested && (
        <p className="text-[11px] leading-tight text-[#64748B]">
          Referencia: {formatCurrency(suggestedPrice)}
        </p>
      )}
    </div>
  );
}

export function OrderItemsSummary({
  items,
  onRemoveItem,
  editableUnitPrice = false,
  onChangeUnitPrice,
  suggestedPriceByProductId,
}: OrderItemsSummaryProps) {
  const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const canEdit = Boolean(editableUnitPrice && onChangeUnitPrice);

  return (
    <div className="space-y-2">
      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 md:hidden">
        {items.map((item) => {
          const subtotal = item.quantity * item.unit_price;
          const suggested = suggestedPriceByProductId?.[item.product_id];
          const modified =
            suggested !== undefined && Math.abs(item.unit_price - suggested) >= PRICE_EPS;

          return (
            <li key={item.product_id} className="p-3">
              <div className="flex flex-col gap-2">
                <div className="flex gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium wrap-break-word text-[#1E293B]">{item.product_name}</p>
                    <p className="mt-0.5 text-xs text-[#64748B]">Cantidad: {item.quantity}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
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
                {canEdit ? (
                  <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-2">
                    <div className="min-w-28 flex-1">
                      <p className="mb-1 text-xs font-medium text-[#64748B]">Precio c/u</p>
                      <UnitPriceField
                        productId={item.product_id}
                        productName={item.product_name}
                        unitPrice={item.unit_price}
                        suggestedPrice={suggested}
                        onCommit={(v) => onChangeUnitPrice!(item.product_id, v)}
                      />
                    </div>
                    {modified && (
                      <span className="mb-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                        Distinto a referencia
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-[#64748B]">
                    {item.quantity} × {formatCurrency(item.unit_price)} c/u
                  </p>
                )}
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
              <TableHead className="w-[32%] min-w-0">Producto</TableHead>
              <TableHead className="w-14 text-center">Cant.</TableHead>
              <TableHead className="w-[26%] text-right">Precio c/u</TableHead>
              <TableHead className="w-[22%] text-right">Subtotal</TableHead>
              <TableHead className="w-10 px-1" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const suggested = suggestedPriceByProductId?.[item.product_id];
              const modified =
                suggested !== undefined && Math.abs(item.unit_price - suggested) >= PRICE_EPS;

              return (
                <TableRow key={item.product_id}>
                  <TableCell className="min-w-0 font-medium wrap-break-word text-[#1E293B]">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span>{item.product_name}</span>
                      {canEdit && modified && (
                        <span className="w-fit rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                          Distinto a referencia
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center tabular-nums">{item.quantity}</TableCell>
                  <TableCell className="text-right align-top">
                    {canEdit ? (
                      <div className="inline-block w-full max-w-38">
                        <UnitPriceField
                          productId={item.product_id}
                          productName={item.product_name}
                          unitPrice={item.unit_price}
                          suggestedPrice={suggested}
                          onCommit={(v) => onChangeUnitPrice!(item.product_id, v)}
                        />
                      </div>
                    ) : (
                      <span className="tabular-nums text-[#64748B]">{formatCurrency(item.unit_price)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(item.quantity * item.unit_price)}
                  </TableCell>
                  <TableCell className="px-1 align-top">
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.product_id)}
                      className="mt-1 rounded-md p-1 text-[#64748B] hover:text-[#EF4444]"
                      aria-label={`Quitar ${item.product_name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
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
