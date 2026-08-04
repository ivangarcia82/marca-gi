"use client";

import { logoutAction } from "@/lib/actions/auth";

export function SignOutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
      >
        Cerrar sesión
      </button>
    </form>
  );
}
