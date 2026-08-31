"use client";

import { useState, useTransition } from "react";
import { guardarExencionesAction, type ExencionesState } from "../actions";

export type CategoriaExigible = {
  id: string;
  nombre: string;
  /** Motivo guardado si hoy está exenta; null si le aplica. */
  motivoExencion: string | null;
};

export function EvidenciasRequeridasForm({
  userId,
  categorias,
}: {
  userId: string;
  categorias: CategoriaExigible[];
}) {
  const [guardando, startTransition] = useTransition();
  const [estado, setEstado] = useState<ExencionesState>({});
  // catId -> motivo. Estar en el mapa significa que no le aplica.
  const [exentas, setExentas] = useState<Map<string, string>>(
    () =>
      new Map(
        categorias
          .filter((c) => c.motivoExencion !== null)
          .map((c) => [c.id, c.motivoExencion ?? ""]),
      ),
  );

  const aplican = categorias.length - exentas.size;

  function editar(cambio: (mapa: Map<string, string>) => void) {
    setExentas((prev) => {
      const siguiente = new Map(prev);
      cambio(siguiente);
      return siguiente;
    });
    setEstado({});
  }

  function guardar() {
    startTransition(async () => {
      const resultado = await guardarExencionesAction({
        userId,
        mostradas: categorias.map((c) => c.id),
        exentas: [...exentas].map(([categoriaId, motivo]) => ({
          categoriaId,
          motivo,
        })),
      });
      setEstado(resultado);
    });
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
        {categorias.map((cat) => {
          const motivo = exentas.get(cat.id);
          const exenta = motivo !== undefined;
          return (
            <li key={cat.id} className="px-3 py-2.5">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={!exenta}
                  onChange={(e) =>
                    editar((mapa) => {
                      if (e.target.checked) mapa.delete(cat.id);
                      else mapa.set(cat.id, cat.motivoExencion ?? "");
                    })
                  }
                  className="h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 accent-brand-600"
                />
                <span
                  className={`flex-1 text-sm ${
                    exenta ? "text-slate-400 line-through" : "text-slate-800"
                  }`}
                >
                  {cat.nombre}
                </span>
                {exenta && (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                    No aplica
                  </span>
                )}
              </label>

              {exenta && (
                <input
                  value={motivo}
                  onChange={(e) =>
                    editar((mapa) => mapa.set(cat.id, e.target.value))
                  }
                  maxLength={300}
                  placeholder="Motivo (opcional). Ej. no usa Teams."
                  className="mt-2 ml-7 w-[calc(100%-1.75rem)] rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
        <span className="text-xs text-slate-500">
          Le aplican {aplican} de {categorias.length} evidencias.
        </span>
        {estado.error && (
          <span className="text-xs text-rose-600">{estado.error}</span>
        )}
        {estado.ok && (
          <span className="text-xs text-emerald-600">Cambios guardados.</span>
        )}
      </div>
    </div>
  );
}
