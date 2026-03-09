"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const titles: Record<string, string> = {
  "/admin-panel": "Dashboard",
  "/admin-panel/users": "Usuarios",
  "/admin-panel/config": "Configuracion",
};

export function SuperAdminHeader() {
  const pathname = usePathname();
  const currentTitle = titles[pathname] || "Dashboard";

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-4">
      <SidebarTrigger className="-ml-1 text-[#64748B]" />
      <Separator orientation="vertical" className="mx-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin-panel" className="text-[#64748B]">
              Super Admin
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-[#1E293B] font-medium">
              {currentTitle}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
