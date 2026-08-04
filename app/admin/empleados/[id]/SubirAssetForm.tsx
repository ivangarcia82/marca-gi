"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { subirAssetAction, type AssetState } from "../actions";

const initial: AssetState = {};

export function SubirAssetForm({
  userId,
  categorias,
}: {
  userId: string;
  categorias: { id: string; nombre: string }[];
}) {
  const [state, formAction, pending] = useActionState(subirAssetAction, initial);
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setNombreArchivo(null);
    }
  }, [state.ok]);

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Categoría
          </label>
          <select name="categoriaId" required className={inputCls}>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Nombre del archivo
          </label>
          <input
            name="nombre"
            required
            placeholder="Ej. Firma de correo"
            className={inputCls}
          />
        </div>
      </div>

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 transition hover:border-brand-400 hover:bg-brand-50/40">
        <span className="truncate">{nombreArchivo ?? "Elegir archivo (imagen o PDF)…"}</span>
        <input
          type="file"
          name="archivo"
          accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
          required
          className="sr-only"
          onChange={(e) => setNombreArchivo(e.target.files?.[0]?.name ?? null)}
        />
      </label>

      {state.error && <p className="text-xs text-rose-600">{state.error}</p>}
      {state.ok && <p className="text-xs text-emerald-600">Archivo agregado.</p>}

      <button
        type="submit"
        disabled={pending || !nombreArchivo}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
      >
        {pending ? "Subiendo…" : "Agregar archivo"}
      </button>
    </form>
  );
}
