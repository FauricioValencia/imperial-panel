"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { createOrder } from "@/actions/orders";
import type { Customer, Product } from "@/types";

interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  max_stock: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value);
}

interface CreateOrderFormProps {
  customers: Customer[];
  products: Product[];
}

export function CreateOrderForm({ customers, products }: CreateOrderFormProps) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const availableProducts = products.filter(
    (p) => p.stock > 0 && !items.some((i) => i.product_id === p.id)
  );

  function handleAddItem() {
    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;

    const qty = Math.min(quantity, product.stock);
    if (qty <= 0) return;

    setItems([
      ...items,
      {
        product_id: product.id,
        product_name: product.name,
        quantity: qty,
        unit_price: product.price,
        max_stock: product.stock,
      },
    ]);
    setSelectedProduct("");
    setQuantity(1);
  }

  function handleRemoveItem(productId: string) {
    setItems(items.filter((i) => i.product_id !== productId));
  }

  function handleSubmit() {
    setError("");

    if (!customerId) {
      setError("Seleccione un cliente");
      return;
    }
    if (items.length === 0) {
      setError("Agregue al menos un producto");
      return;
    }

    startTransition(async () => {
      const result = await createOrder({
        customer_id: customerId,
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
        notes: notes || undefined,
      });

      if (!result.success) {
        setError(result.error || "Error creating order");
      } else {
        router.push("/orders");
      }
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-[#1E293B]">Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar cliente..." />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} {c.phone ? `— ${c.phone}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-[#1E293B]">Productos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar producto..." />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {formatCurrency(p.price)} (stock: {p.stock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-24">
              <Input
                type="number"
                min={1}
                max={products.find((p) => p.id === selectedProduct)?.stock || 999}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                placeholder="Cant."
              />
            </div>
            <Button
              type="button"
              onClick={handleAddItem}
              disabled={!selectedProduct || quantity <= 0}
              className="bg-[#3B82F6] hover:bg-[#2563EB]"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {items.length > 0 && (
            <div className="rounded-lg border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Cant.</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.product_id}>
                      <TableCell className="font-medium text-[#1E293B]">
                        {item.product_name}
                      </TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right text-[#64748B]">
                        {formatCurrency(item.unit_price)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.quantity * item.unit_price)}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleRemoveItem(item.product_id)}
                          className="rounded-md p-1 text-[#64748B] hover:text-[#EF4444]"
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
                    <TableCell className="text-right text-lg font-bold text-[#1E3A5F]">
                      {formatCurrency(total)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-[#1E293B]">Notas</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas adicionales para el pedido..."
            rows={2}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push("/orders")} disabled={isPending}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isPending || items.length === 0 || !customerId}
          className="bg-[#1E3A5F] hover:bg-[#2d4f7a]"
        >
          {isPending ? "Creando pedido..." : "Crear Pedido"}
        </Button>
      </div>
    </div>
  );
}
