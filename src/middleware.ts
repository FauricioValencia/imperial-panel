import { type NextRequest } from "next/server";
import { actualizarSesion } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await actualizarSesion(request);
}

export const config = {
  matcher: [
    /*
     * Aplicar middleware a todas las rutas excepto:
     * - _next/static (archivos estaticos)
     * - _next/image (optimizacion de imagenes)
     * - favicon.ico, iconos, manifest
     * - archivos publicos (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
