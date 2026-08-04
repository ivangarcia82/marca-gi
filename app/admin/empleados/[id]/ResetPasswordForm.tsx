"use client";

import { useActionState } from "react";
import { resetPasswordAction, type ResetState } from "../actions";

const initial: ResetState = {};

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState(
    resetPasswordAction,
    initial,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="userId" value={userId} />
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Nueva contraseña
        </label>
        <input
          name="password"
          type="text"
          required
          placeholder="Mínimo 6 caracteres"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Restablecer"}
      </button>
      {state.error && <p className="w-full text-xs text-rose-600">{state.error}</p>}
      {state.ok && (
        <p className="w-full text-xs text-emerald-600">Contraseña actualizada.</p>
      )}
    </form>
  );
}
