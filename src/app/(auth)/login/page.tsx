"use client";

import { useActionState } from "react";
import { iniciarSesion } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { ActionResponse } from "@/types";

const estadoInicial: ActionResponse = { success: false };

export default function LoginPage() {
  const [estado, formAction, isPending] = useActionState(iniciarSesion, estadoInicial);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-[#1E3A5F]">
            <span className="text-2xl font-bold text-white">I</span>
          </div>
          <CardTitle className="text-2xl font-bold text-[#1E293B]">
            Imperial
          </CardTitle>
          <CardDescription>
            Ingresa tus credenciales para continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            {estado.error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {estado.error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Correo electronico</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="correo@ejemplo.com"
                required
                autoComplete="email"
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contrasena</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                disabled={isPending}
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-[#1E3A5F] hover:bg-[#2d4f7a]"
              disabled={isPending}
            >
              {isPending ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
