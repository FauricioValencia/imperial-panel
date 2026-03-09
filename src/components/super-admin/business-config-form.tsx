"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateBusinessConfig, uploadLogo } from "@/actions/business-config";
import type { ActionResponse, BusinessConfig } from "@/types";

const initialState: ActionResponse = { success: false };

interface BusinessConfigFormProps {
  config: BusinessConfig;
}

export function BusinessConfigForm({ config }: BusinessConfigFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateBusinessConfig,
    initialState
  );
  const [logoUrl, setLogoUrl] = useState(config.logo_url);
  const [logoUploading, startLogoUpload] = useTransition();
  const [logoError, setLogoError] = useState("");
  const [saved, setSaved] = useState(false);
  const prevSuccessRef = useRef(false);

  useEffect(() => {
    if (state.success && !prevSuccessRef.current) {
      setSaved(true);
      const timer = setTimeout(() => setSaved(false), 3000);
      return () => clearTimeout(timer);
    }
    prevSuccessRef.current = state.success;
  }, [state.success]);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setLogoError("El archivo no debe superar 2MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setLogoError("El archivo debe ser una imagen");
      return;
    }

    setLogoError("");
    const fd = new FormData();
    fd.append("logo", file);

    startLogoUpload(async () => {
      const result = await uploadLogo(fd);
      if (result.success && result.data) {
        setLogoUrl(result.data);
      } else {
        setLogoError(result.error || "Error al subir logo");
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Logo section */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-[#1E293B]">Logo de la empresa</h3>
        <div className="flex items-center gap-6">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-slate-50">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt="Logo empresa"
                width={96}
                height={96}
                className="h-full w-full object-contain"
              />
            ) : (
              <Upload className="h-8 w-8 text-[#64748B]" />
            )}
          </div>
          <div className="space-y-2">
            <label className="cursor-pointer">
              <Button
                type="button"
                variant="outline"
                disabled={logoUploading}
                asChild
              >
                <span>
                  {logoUploading ? "Subiendo..." : "Cambiar logo"}
                </span>
              </Button>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
                disabled={logoUploading}
              />
            </label>
            <p className="text-xs text-[#64748B]">PNG, JPG o SVG. Maximo 2MB.</p>
            {logoError && (
              <p className="text-xs text-red-600">{logoError}</p>
            )}
          </div>
        </div>
      </div>

      {/* Config form */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-[#1E293B]">
          Datos del negocio
        </h3>

        <form action={formAction} className="space-y-4">
          {state.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {state.error}
            </div>
          )}

          {saved && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              Configuracion guardada correctamente.
            </div>
          )}

          <input type="hidden" name="logo_url" value={logoUrl ?? ""} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company_name">Nombre de la empresa *</Label>
              <Input
                id="company_name"
                name="company_name"
                required
                defaultValue={config.company_name}
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax_id">NIT / Documento fiscal</Label>
              <Input
                id="tax_id"
                name="tax_id"
                defaultValue={config.tax_id ?? ""}
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefono</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={config.phone ?? ""}
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Direccion</Label>
              <Input
                id="address"
                name="address"
                defaultValue={config.address ?? ""}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_terms">Condiciones de pago</Label>
            <Textarea
              id="payment_terms"
              name="payment_terms"
              rows={3}
              defaultValue={config.payment_terms ?? ""}
              disabled={isPending}
              placeholder="Ejemplo: Pago contra entrega. Plazo maximo 30 dias."
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              className="bg-[#1E3A5F] hover:bg-[#2d4f7a]"
              disabled={isPending}
            >
              {isPending ? "Guardando..." : "Guardar configuracion"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
