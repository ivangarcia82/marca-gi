"use server";

import { unstable_rethrow } from "next/navigation";
import { signOut } from "@/auth";

export type LogoutState = { error?: string };

// Pensada para `useActionState`: React le pasa (estadoPrevio, formData), pero
// cerrar sesión no necesita ninguno de los dos.
export async function logoutAction(): Promise<LogoutState> {
  try {
    await signOut({ redirectTo: "/login" });
  } catch (error) {
    // El redirect de Next viaja como excepción (NEXT_REDIRECT): hay que
    // devolverlo al framework en vez de tratarlo como fallo.
    unstable_rethrow(error);
    console.error("[logout] no se pudo cerrar la sesión:", error);
    return { error: "No pudimos cerrar tu sesión. Inténtalo de nuevo." };
  }

  // signOut siempre redirige, así que esta línea no debería alcanzarse.
  return {};
}
