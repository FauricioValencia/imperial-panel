"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const filteredCustomers = customers.filter((c) => {
    const term = customerSearch.toLowerCase();
    if (!term) return true;
    return (
      c.name.toLowerCase().includes(term) ||
      (c.phone && c.phone.toLowerCase().includes(term)) ||
      (c.address && c.address.toLowerCase().includes(term))
    );
  });

  function handleSelectCustomer(id: string) {
    setCustomerId(id);
    const customer = customers.find((c) => c.id === id);
    setCustomerSearch(customer?.name ?? "");
    setCustomerDropdownOpen(false);
  }

  function handleClearCustomer() {
    setCustomerId("");
    setCustomerSearch("");
  }

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
          <div className="relative" ref={dropdownRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
              <Input
                ref={customerInputRef}
                placeholder="Buscar por nombre, telefono o direccion..."
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setCustomerDropdownOpen(true);
                  if (!e.target.value) setCustomerId("");
                }}
                onFocus={() => setCustomerDropdownOpen(true)}
                onBlur={() => {
                  // Delay to allow click on dropdown item
                  setTimeout(() => setCustomerDropdownOpen(false), 150);
                }}
                className="pl-9"
              />
            </div>
            {selectedCustomer && (
              <div className="mt-2 flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm">
                <Check className="h-4 w-4 text-[#10B981]" />
                <span className="font-medium text-[#1E293B]">{selectedCustomer.name}</span>
                {selectedCustomer.phone && (
                  <span className="text-[#64748B]">— {selectedCustomer.phone}</span>
                )}
                <button
                  type="button"
                  onClick={handleClearCustomer}
                  className="ml-auto text-xs text-[#64748B] hover:text-[#EF4444]"
                >
                  Cambiar
                </button>
              </div>
            )}
            {customerDropdownOpen && !selectedCustomer && (
              <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
                {filteredCustomers.length === 0 ? (
                  <div className="px-3 py-4 text-center text-sm text-[#64748B]">
                    No se encontraron clientes
                  </div>
                ) : (
                  filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelectCustomer(c.id)}
                      className="flex w-full flex-col px-3 py-2 text-left hover:bg-slate-50"
                    >
                      <span className="text-sm font-medium text-[#1E293B]">{c.name}</span>
                      <span className="text-xs text-[#64748B]">
                        {[c.phone, c.address].filter(Boolean).join(" — ") || "Sin datos adicionales"}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
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
