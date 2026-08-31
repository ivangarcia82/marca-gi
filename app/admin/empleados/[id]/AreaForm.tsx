"use client";

import { useActionState } from "react";
import { actualizarAreaAction, type AreaState } from "../actions";

const initial: AreaState = {};

/** Edita el área del empleado; de ahí sale su renglón en el KPI por área. */
export function AreaForm({
  userId,
  area,
  areas,
}: {
  userId: string;
  area: string;
  areas: string[];
}) {
  const [state, formAction, pending] = useActionState(
    actualizarAreaAction,
    initial,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="userId" value={userId} />
      <div className="min-w-48 flex-1">
        <label
          htmlFor="area"
          className="mb-1 block text-xs font-medium text-slate-600"
        >
          Área
        </label>
        {/* Lista abierta: sugiere las áreas ya usadas sin impedir crear una nueva. */}
        <input
          id="area"
          name="area"
          list="areas-existentes"
          defaultValue={area}
          placeholder="Sin área"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <datalist id="areas-existentes">
          {areas.map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar área"}
      </button>
      {state.error && (
        <p className="basis-full text-sm text-rose-600">{state.error}</p>
      )}
      {state.ok && (
        <p className="basis-full text-sm text-emerald-600">Área actualizada.</p>
      )}
    </form>
  );
}
