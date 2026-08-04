"use client";

import { useActionState } from "react";
import { actualizarCategoriaAction, type CategoriaState } from "./actions";

const initial: CategoriaState = {};

export function CategoriaEditor({
  id,
  nombre,
  descripcion,
}: {
  id: string;
  nombre: string;
  descripcion: string;
}) {
  const [state, formAction, pending] = useActionState(
    actualizarCategoriaAction,
    initial,
  );

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  return (
    <form action={formAction} className="grid gap-2 sm:grid-cols-[1fr_1.5fr_auto]">
      <input type="hidden" name="id" value={id} />
      <input
        name="nombre"
        defaultValue={nombre}
        required
        className={inputCls}
        aria-label="Nombre"
      />
      <input
        name="descripcion"
        defaultValue={descripcion}
        placeholder="Descripción"
        className={inputCls}
        aria-label="Descripción"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
      >
        {pending ? "…" : state.ok ? "Guardado" : "Guardar"}
      </button>
      {state.error && (
        <p className="text-xs text-rose-600 sm:col-span-3">{state.error}</p>
      )}
    </form>
  );
}
