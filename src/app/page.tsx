import { redirect } from "next/navigation";
import { obtenerUsuarioActual } from "@/actions/auth";

export default async function HomePage() {
  const usuario = await obtenerUsuarioActual();

  if (!usuario) {
    redirect("/login");
  }

  if (usuario.rol === "mensajero") {
    redirect("/entregas");
  }

  redirect("/dashboard");
}
