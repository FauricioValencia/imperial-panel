"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Settings, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { signOut } from "@/actions/auth";
import type { User } from "@/types";

const navigation = [
  { label: "Dashboard", href: "/admin-panel", icon: LayoutDashboard },
  { label: "Usuarios", href: "/admin-panel/users", icon: Users },
  { label: "Configuracion", href: "/admin-panel/config", icon: Settings },
];

export function SuperAdminSidebar({ user }: { user: User }) {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r border-slate-200">
      <SidebarHeader className="border-b border-slate-200 p-4">
        <Link href="/admin-panel" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1E3A5F]">
            <span className="text-sm font-bold text-white">I</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1E293B]">Imperial</p>
            <p className="text-xs text-[#64748B]">Super Administrador</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Gestion</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const active =
                  item.href === "/admin-panel"
                    ? pathname === "/admin-panel"
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className={
                        active
                          ? "bg-[#1E3A5F]/10 text-[#1E3A5F] font-medium"
                          : "text-[#64748B] hover:text-[#1E293B]"
                      }
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1E3A5F] text-xs font-medium text-white">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-[#1E293B]">
              {user.name}
            </p>
            <p className="truncate text-xs text-[#64748B]">{user.email}</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md p-1.5 text-[#64748B] hover:bg-slate-100 hover:text-[#1E293B]"
              title="Cerrar sesion"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
