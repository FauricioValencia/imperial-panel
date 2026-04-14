"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { formatNumber, parseFormattedNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  id?: string;
  name?: string;
  defaultValue?: number | string | null;
  value?: number | null;
  onValueChange?: (value: number) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  className?: string;
}

export function CurrencyInput({
  id,
  name,
  defaultValue,
  value,
  onValueChange,
  required,
  disabled,
  placeholder,
  min,
  max,
  className,
}: CurrencyInputProps) {
  const isControlled = value !== undefined;

  const initialDisplay =
    defaultValue != null && defaultValue !== ""
      ? formatNumber(Number(defaultValue))
      : "";

  const [display, setDisplay] = useState(initialDisplay);

  useEffect(() => {
    if (isControlled) {
      setDisplay(value != null ? formatNumber(value) : "");
    }
  }, [isControlled, value]);

  const rawValue = parseFormattedNumber(display);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = parseFormattedNumber(e.target.value);
    const hasDigits = e.target.value.replace(/\D/g, "").length > 0;
    const nextDisplay = hasDigits ? formatNumber(raw) : "";
    setDisplay(nextDisplay);
    onValueChange?.(raw);
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#64748B]">
        $
      </span>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={cn("pl-6", className)}
      />
      {name && (
        <input
          type="hidden"
          name={name}
          value={display === "" ? "" : String(rawValue)}
          required={required}
          data-min={min}
          data-max={max}
        />
      )}
    </div>
  );
}
