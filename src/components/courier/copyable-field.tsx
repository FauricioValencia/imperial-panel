"use client";

import { Check, Copy, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CopyableFieldProps {
  icon: LucideIcon;
  label: string;
  value: string;
  copyValue?: string;
}

export function CopyableField({ icon: Icon, label, value, copyValue }: CopyableFieldProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(copyValue ?? value);
      setCopied(true);
      toast.success(`${label} copiado`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  return (
    <div className="flex items-center gap-3 text-sm text-[#64748B]">
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{value}</span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={`Copiar ${label}`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E3A5F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
      >
        {copied ? (
          <Check className="h-4 w-4 text-[#10B981]" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
