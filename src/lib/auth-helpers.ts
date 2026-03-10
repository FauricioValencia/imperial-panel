"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

interface AuthUser {
  id: string;
  role: UserRole;
  admin_id: string | null;
}

interface AuthContext {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  user: AuthUser;
}

/** Verify authenticated user and return context with admin_id */
export async function verifyAuth(): Promise<AuthContext | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userData } = await supabase
    .from("users")
    .select("id, role, admin_id")
    .eq("id", user.id)
    .single();

  if (!userData) return null;
  return { supabase, user: userData as AuthUser };
}

/** Verify user is an admin */
export async function verifyAdmin(): Promise<AuthContext | null> {
  const ctx = await verifyAuth();
  if (!ctx || ctx.user.role !== "admin") return null;
  return ctx;
}

/** Verify user is a super_admin */
export async function verifySuperAdmin(): Promise<AuthContext | null> {
  const ctx = await verifyAuth();
  if (!ctx || ctx.user.role !== "super_admin") return null;
  return ctx;
}
