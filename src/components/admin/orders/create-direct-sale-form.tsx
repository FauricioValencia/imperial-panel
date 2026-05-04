"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderItemsSummary } from "@/components/admin/orders/order-items-summary";
import { getCustomerResolvedUnitPrices } from "@/actions/customer-prices";
import { createDirectSale } from "@/actions/direct-sale";
import { formatCurrency } from "@/lib/format";
import type { Customer, DirectSaleProductOption, PaymentMethod } from "@/types";

interface LineItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface CreateDirectSaleFormProps {
  customers: Customer[];
  products: DirectSaleProductOption[];
}

export function CreateDirectSaleForm({ customers, products }: CreateDirectSaleFormProps) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [pagoInmediato, setPagoInmediato] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [allowLoss, setAllowLoss] = useState(false);
  const [resolvedPrices, setResolvedPrices] = useState<Record<string, number>>({});
  const [allowPriceOverride, setAllowPriceOverride] = useState(false);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  useEffect(() => {
    if (!customerId) {
      setResolvedPrices({});
      return;
    }
    setResolvedPrices({});
    let cancelled = false;
    void getCustomerResolvedUnitPrices(customerId, products.map((p) => p.id)).then((res) => {
      if (cancelled || !res.success || !res.data) return;
      setResolvedPrices(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [customerId, products]);

  useEffect(() => {
    if (!customerId || Object.keys(resolvedPrices).length === 0) return;
    setItems((prev) =>
      prev.map((i) => ({
        ...i,
        unit_price:
          resolvedPrices[i.product_id] ??
          products.find((p) => p.id === i.product_id)?.price ??
          i.unit_price,
      }))
    );
  }, [customerId, resolvedPrices, products]);
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
    setResolvedPrices({});
    setAllowPriceOverride(false);
    setItems((prev) =>
      prev.map((i) => ({
        ...i,
        unit_price: products.find((p) => p.id === i.product_id)?.price ?? i.unit_price,
      }))
    );
  }

  const availableProducts = products.filter(
    (p) => !items.some((i) => i.product_id === p.id) && p.warehouse_available > 0
  );

  function handleAddItem() {
    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;

    const qty = Math.min(quantity, product.warehouse_available);
    if (qty <= 0) return;

    const unit =
      resolvedPrices[product.id] !== undefined ? resolvedPrices[product.id] : product.price;
    setItems([
      ...items,
      {
        product_id: product.id,
        product_name: product.name,
        quantity: qty,
        unit_price: unit,
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
      const result = await createDirectSale({
        customer_id: customerId,
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
        notes: notes || undefined,
        allow_loss: allowLoss || undefined,
        payment_method: pagoInmediato ? paymentMethod : undefined,
        allow_price_override: allowPriceOverride || undefined,
      });

      if (!result.success) {
        setError(result.error || "Error al registrar la venta");
      } else {
        router.push("/orders");
      }
    });
  }

  const selectedProductRow = products.find((p) => p.id === selectedProduct);

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
                  setTimeout(() => setCustomerDropdownOpen(false), 150);
                }}
                className="pl-9"
              />
            </div>
            {selectedCustomer && (
              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm">
                <Check className="h-4 w-4 shrink-0 text-[#10B981]" />
                <span className="min-w-0 font-medium wrap-break-word text-[#1E293B]">
                  {selectedCustomer.name}
                </span>
                {selectedCustomer.phone && (
                  <span className="shrink-0 text-[#64748B]">— {selectedCustomer.phone}</span>
                )}
                <button
                  type="button"
                  onClick={handleClearCustomer}
                  className="ml-auto shrink-0 text-xs text-[#64748B] hover:text-[#EF4444]"
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
          <CardTitle className="text-base text-[#1E293B]">Productos (bodega central)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-end">
            <div className="min-w-0 w-full overflow-hidden md:min-h-0 md:flex-1">
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger className="h-9 w-full min-w-0 max-w-full gap-2 overflow-hidden py-0 **:data-[slot=select-value]:block! **:data-[slot=select-value]:min-w-0 **:data-[slot=select-value]:flex-1 **:data-[slot=select-value]:overflow-hidden! **:data-[slot=select-value]:truncate **:data-[slot=select-value]:text-left **:data-[slot=select-value]:line-clamp-none!">
                  <SelectValue placeholder="Seleccionar producto..." />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {formatCurrency(p.price)} (central: {p.warehouse_available})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex shrink-0 items-end gap-2 md:gap-3">
              <div className="w-20 md:w-24">
                <Input
                  type="number"
                  min={1}
                  max={selectedProductRow?.warehouse_available || 999}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  placeholder="Cant."
                  className="min-w-0"
                />
              </div>
              <Button
                type="button"
                onClick={handleAddItem}
                disabled={!selectedProduct || quantity <= 0}
                className="shrink-0 bg-[#3B82F6] hover:bg-[#2563EB]"
                size="icon"
                aria-label="Agregar producto"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {items.length > 0 && (
            <OrderItemsSummary items={items} onRemoveItem={handleRemoveItem} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-[#1E293B]">Pago</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant={!pagoInmediato ? "default" : "outline"}
              className={!pagoInmediato ? "bg-[#1E3A5F] hover:bg-[#2d4f7a]" : ""}
              onClick={() => setPagoInmediato(false)}
            >
              A crédito (cartera)
            </Button>
            <Button
              type="button"
              variant={pagoInmediato ? "default" : "outline"}
              className={pagoInmediato ? "bg-[#10B981] hover:bg-[#059669]" : ""}
              onClick={() => setPagoInmediato(true)}
            >
              Pago inmediato
            </Button>
          </div>
          {pagoInmediato && (
            <div className="space-y-2">
              <Label htmlFor="payment-method">Método de pago</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              >
                <SelectTrigger id="payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                  <SelectItem value="nequi">Nequi</SelectItem>
                  <SelectItem value="daviplata">Daviplata</SelectItem>
                </SelectContent>
              </Select>
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
            placeholder="Notas opcionales..."
            rows={2}
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2">
        <Checkbox
          id="allow-loss"
          checked={allowLoss}
          onCheckedChange={(c) => setAllowLoss(c === true)}
        />
        <Label htmlFor="allow-loss" className="cursor-pointer text-sm font-normal text-[#1E293B]">
          Permitir venta con pérdida (precio bajo costo FIFO proyectado)
        </Label>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
        <Checkbox
          id="allow-price-override-direct"
          checked={allowPriceOverride}
          onCheckedChange={(c) => setAllowPriceOverride(c === true)}
        />
        <Label
          htmlFor="allow-price-override-direct"
          className="cursor-pointer text-sm font-normal text-[#1E293B]"
        >
          Permitir precio distinto al de lista o acuerdo con el cliente
        </Label>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push("/orders")} disabled={isPending}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isPending || items.length === 0 || !customerId}
          className="bg-[#1E3A5F] hover:bg-[#2d4f7a]"
        >
          {isPending ? "Registrando..." : "Registrar venta"}
        </Button>
      </div>
    </div>
  );
}
