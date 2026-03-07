import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "courier") {
    redirect("/deliveries");
  }

  redirect("/dashboard");
}
