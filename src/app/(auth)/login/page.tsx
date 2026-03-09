"use client";

import { useActionState, useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { signIn } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { ActionResponse } from "@/types";

const STORAGE_KEY = "imperial_remember";
const initialState: ActionResponse = { success: false };

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(signIn, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [savedEmail, setSavedEmail] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setSavedEmail(stored);
      setRemember(true);
    }
  }, []);

  function handleSubmit(formData: FormData) {
    const email = formData.get("email") as string;
    if (remember && email) {
      localStorage.setItem(STORAGE_KEY, email);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    formAction(formData);
  }

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
          <form action={handleSubmit} className="space-y-4">
            {state.error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {state.error}
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
                defaultValue={savedEmail}
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contrasena</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  disabled={isPending}
                  minLength={6}
                  className="pr-10!"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-[#64748B] hover:text-[#1E293B]"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={remember}
                onCheckedChange={(checked) => setRemember(checked === true)}
              />
              <Label htmlFor="remember" className="text-sm font-normal text-[#64748B] cursor-pointer">
                Recordar mis datos
              </Label>
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
