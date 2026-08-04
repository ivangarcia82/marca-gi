import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ROLES } from "@/lib/constants";

/** Devuelve la sesión actual o null. */
export async function getSession() {
  return auth();
}

/** Exige sesión iniciada; si no, redirige a /login. Devuelve el usuario. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

/** Exige rol ADMIN; si no, redirige. Devuelve el usuario admin. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== ROLES.ADMIN) redirect("/dashboard");
  return user;
}
