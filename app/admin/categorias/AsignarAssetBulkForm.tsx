"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { asignarAssetBulkAction, type BulkAssetState } from "./actions";
import { ARCHIVO_ACCEPT, avisoTamano } from "@/lib/constants";

const initial: BulkAssetState = {};

export function AsignarAssetBulkForm({
  categoriaId,
  empleados,
}: {
  categoriaId: string;
  empleados: { id: string; nombre: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    asignarAssetBulkAction,
    initial,
  );
  const [todos, setTodos] = useState(true);
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const [errorTamano, setErrorTamano] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setNombreArchivo(null);
      setErrorTamano(null);
      setTodos(true);
    }
  }, [state.ok]);

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="categoriaId" value={categoriaId} />

      <input
        name="nombre"
        required
        placeholder="Nombre del archivo (ej. Fondo corporativo)"
        className={inputCls}
      />

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 transition hover:border-brand-400">
        <span className="truncate">{nombreArchivo ?? "Elegir archivo…"}</span>
        <input
          type="file"
          name="archivo"
          accept={ARCHIVO_ACCEPT}
          required
          className="sr-only"
          onChange={(e) => {
            const archivo = e.target.files?.[0] ?? null;
            setNombreArchivo(archivo?.name ?? null);
            setErrorTamano(archivo ? avisoTamano(archivo.size) : null);
          }}
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="todos"
          checked={todos}
          onChange={(e) => setTodos(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        Asignar a todos los empleados activos
      </label>

      {!todos && (
        <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
          {empleados.length === 0 ? (
            <p className="text-xs text-slate-400">No hay empleados.</p>
          ) : (
            empleados.map((e) => (
              <label
                key={e.id}
                className="flex items-center gap-2 rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  name="empleados"
                  value={e.id}
                  className="h-4 w-4 rounded border-slate-300"
                />
                {e.nombre}
              </label>
            ))
          )}
        </div>
      )}

      {(errorTamano ?? state.error) && (
        <p className="text-xs text-rose-600">{errorTamano ?? state.error}</p>
      )}
      {state.ok && (
        <p className="text-xs text-emerald-600">
          Archivo asignado a {state.count} empleado(s).
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !nombreArchivo || Boolean(errorTamano)}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
      >
        {pending ? "Asignando…" : "Asignar archivo"}
      </button>
    </form>
  );
}
