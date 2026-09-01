"use client"; // Los error boundaries tienen que ser Client Components.

import { useEffect } from "react";
import Link from "next/link";
import { unstable_isUnrecognizedActionError } from "next/navigation";
import { Logo } from "@/components/Logo";

export default function ErrorPantalla({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // Pasa cuando la pestaña lleva abierta desde antes de un despliegue: el
  // cliente pide una Server Action que el servidor nuevo ya no reconoce.
  // Recargar la página basta para volver a sincronizar cliente y servidor.
  const versionDesfasada = unstable_isUnrecognizedActionError(error);

  return (
    <main className="grid min-h-dvh place-items-center bg-gradient-to-b from-slate-50 to-brand-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl shadow-slate-200/50 sm:p-8">
          <h1 className="text-lg font-semibold text-slate-900">
            {versionDesfasada
              ? "La plataforma se actualizó"
              : "No pudimos completar la acción"}
          </h1>
          <p className="mb-6 mt-2 text-sm text-slate-500">
            {versionDesfasada
              ? "Hay una versión nueva disponible. Recarga la página para continuar; no perderás nada de lo que ya guardaste."
              : "Ocurrió un problema al comunicarnos con el servidor. Vuelve a intentarlo y, si sigue pasando, cierra sesión y entra de nuevo."}
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={
                versionDesfasada
                  ? () => window.location.reload()
                  : () => unstable_retry()
              }
              className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:ring-2 focus:ring-brand-200"
            >
              {versionDesfasada ? "Recargar" : "Reintentar"}
            </button>
            <Link
              href="/login"
              className="rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-slate-600 ring-1 ring-inset ring-slate-300 transition hover:bg-slate-50"
            >
              Ir al inicio de sesión
            </Link>
          </div>

          {error.digest && (
            <p className="mt-6 text-[11px] text-slate-400">
              Código de referencia: {error.digest}
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          ¿Sigue sin funcionar? Contacta a tu administrador.
        </p>
      </div>
    </main>
  );
}
