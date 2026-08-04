"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { subirRecursoGlobalAction, type RecursoState } from "./actions";

const initial: RecursoState = {};

export function RecursoGlobalForm({ categoriaId }: { categoriaId: string }) {
  const [state, formAction, pending] = useActionState(
    subirRecursoGlobalAction,
    initial,
  );
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setNombreArchivo(null);
    }
  }, [state.ok]);

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <input type="hidden" name="categoriaId" value={categoriaId} />
      <input
        name="nombre"
        required
        placeholder="Nombre visible (ej. Fondo Teams v1)"
        className={inputCls}
      />
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 transition hover:border-indigo-400">
        <span className="truncate">{nombreArchivo ?? "Elegir archivo…"}</span>
        <input
          type="file"
          name="archivo"
          accept="image/*,application/pdf,application/zip,.docx,.pptx"
          required
          className="sr-only"
          onChange={(e) => setNombreArchivo(e.target.files?.[0]?.name ?? null)}
        />
      </label>
      {state.error && <p className="text-xs text-rose-600">{state.error}</p>}
      {state.ok && <p className="text-xs text-emerald-600">Recurso agregado.</p>}
      <button
        type="submit"
        disabled={pending || !nombreArchivo}
        className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Subiendo…" : "Agregar recurso compartido"}
      </button>
    </form>
  );
}
