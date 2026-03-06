import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function actualizarSesion(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Rutas publicas que no requieren autenticacion
  const rutasPublicas = ["/login"];
  const esRutaPublica = rutasPublicas.some((ruta) => pathname.startsWith(ruta));

  // Si no hay usuario y no es ruta publica, redirigir a login
  if (!user && !esRutaPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Si hay usuario y esta en login, redirigir segun rol
  if (user && esRutaPublica) {
    // Obtener rol del usuario desde la tabla usuarios
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("rol")
      .eq("id", user.id)
      .single();

    const url = request.nextUrl.clone();
    if (usuario?.rol === "mensajero") {
      url.pathname = "/entregas";
    } else {
      url.pathname = "/dashboard";
    }
    return NextResponse.redirect(url);
  }

  // Verificar acceso por rol a rutas protegidas
  if (user) {
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("rol")
      .eq("id", user.id)
      .single();

    const rutasAdmin = ["/dashboard", "/cartera", "/inventario", "/reportes", "/clientes", "/domiciliarios"];
    const rutasMensajero = ["/entregas", "/ruta", "/historial"];

    const esRutaAdmin = rutasAdmin.some((ruta) => pathname.startsWith(ruta));
    const esRutaMensajero = rutasMensajero.some((ruta) => pathname.startsWith(ruta));

    if (esRutaAdmin && usuario?.rol !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/entregas";
      return NextResponse.redirect(url);
    }

    if (esRutaMensajero && usuario?.rol !== "mensajero") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
