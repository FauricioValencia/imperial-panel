"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, MapPin, Clock, User } from "lucide-react";

const tabs = [
  { label: "Entregas", href: "/deliveries", icon: Package },
  { label: "Ruta", href: "/route", icon: MapPin },
  { label: "Historial", href: "/history", icon: Clock },
  { label: "Perfil", href: "/history", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white pb-safe">
      <div className="flex h-16 items-center justify-around">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 ${
                active
                  ? "text-[#1E3A5F]"
                  : "text-[#64748B]"
              }`}
            >
              <tab.icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
