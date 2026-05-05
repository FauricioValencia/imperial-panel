"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { transferStockToCourier } from "@/actions/courier-warehouse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Product } from "@/types";

interface TransferStockDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  courierId: string;
  courierName: string;
  products: Product[];
}

interface Line {
  product_id: string;
  quantity: string;
}

export function TransferStockDialog({
  open,
  onClose,
  onSuccess,
  courierId,
  courierName,
  products,
}: TransferStockDialogProps) {
  const [lines, setLines] = useState<Line[]>([{ product_id: "", quantity: "" }]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setLines([{ product_id: "", quantity: "" }]);
      setNotes("");
      setError(null);
    }
  }, [open]);

  const addLine = () => setLines((prev) => [...prev, { product_id: "", quantity: "" }]);
  const removeLine = (idx: number) =>
    setLines((prev) => prev.filter((_, i) => i !== idx));
  const updateLine = (idx: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const validLines = lines
    .map((l) => ({ product_id: l.product_id, quantity: Number.parseInt(l.quantity, 10) }))
    .filter(
      (l) =>
        l.product_id.length > 0 && Number.isFinite(l.quantity) && l.quantity > 0
    );

  const productMap = new Map(products.map((p) => [p.id, p]));
  const overSomeLine = validLines.some((l) => {
    const p = productMap.get(l.product_id);
    return p ? l.quantity > p.stock_available : false;
  });

  const submitDisabled = isPending || validLines.length === 0 || overSomeLine;

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const res = await transferStockToCourier({
        courier_id: courierId,
        lines: validLines,
        notes: notes.trim() || undefined,
      });
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error ?? "Error al transferir");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#1E293B]">
            Cargar stock móvil de {courierName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {lines.map((line, idx) => {
              const product = productMap.get(line.product_id);
              const qty = Number.parseInt(line.quantity, 10);
              const overStock =
                product !== undefined && Number.isFinite(qty) && qty > product.stock_available;
              return (
                <div
                  key={idx}
                  className="flex items-end gap-2 rounded-lg border border-slate-200 p-3"
                >
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Producto</Label>
                    <Select
                      value={line.product_id}
                      onValueChange={(v) => updateLine(idx, { product_id: v })}
                      disabled={isPending}
                    >
                      <SelectTrigger className="min-h-11">
                        <SelectValue placeholder="Selecciona..." />
                      </SelectTrigger>
                      <SelectContent>
                        {products
                          .filter((p) => p.stock_available > 0)
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} ({p.stock_available} disp)
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24 space-y-1">
                    <Label className="text-xs">Cantidad</Label>
                    <Input
                      type="number"
                      min="1"
                      max={product?.stock_available ?? undefined}
                      value={line.quantity}
                      onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                      disabled={isPending || !line.product_id}
                      className="min-h-11"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLine(idx)}
                    disabled={isPending || lines.length === 1}
                    aria-label="Quitar producto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  {overStock && (
                    <p className="absolute -bottom-5 text-xs text-[#EF4444]">
                      Excede stock central
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addLine}
            disabled={isPending}
            className="w-full"
          >
            <Plus className="mr-1 h-4 w-4" /> Agregar producto
          </Button>

          <div className="space-y-2">
            <Label htmlFor="transfer-notes">Notas</Label>
            <Textarea
              id="transfer-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isPending}
              rows={2}
              placeholder="Observaciones..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitDisabled}
              className="bg-[#3B82F6] hover:bg-[#2563EB] text-white"
            >
              {isPending ? "Transfiriendo..." : "Transferir"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
