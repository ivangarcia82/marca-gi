"use client";

import { useActionState, useEffect, useRef } from "react";
import { crearCategoriaAction, type CategoriaState } from "./actions";

const initial: CategoriaState = {};

export function CrearCategoriaForm() {
  const [state, formAction, pending] = useActionState(
    crearCategoriaAction,
    initial,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Nombre
          </label>
          <input
            name="nombre"
            required
            placeholder="Ej. Fondo de Zoom"
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Descripción
          </label>
          <input
            name="descripcion"
            placeholder="Opcional"
            className={inputCls}
          />
        </div>
      </div>

      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-600">Categoría creada.</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
      >
        {pending ? "Creando…" : "Agregar categoría"}
      </button>
    </form>
  );
}
