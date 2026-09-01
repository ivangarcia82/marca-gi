"use client";

import { useActionState } from "react";
import { logoutAction, type LogoutState } from "@/lib/actions/auth";

const initial: LogoutState = {};

export function SignOutButton() {
  const [state, formAction, pending] = useActionState(logoutAction, initial);

  return (
    <form action={formAction} className="relative">
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-60"
      >
        {pending ? "Cerrando…" : "Cerrar sesión"}
      </button>

      {state.error && (
        <p
          role="alert"
          className="absolute right-0 top-full z-30 mt-1 w-64 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 shadow-lg ring-1 ring-inset ring-rose-200"
        >
          {state.error}
        </p>
      )}
    </form>
  );
}
