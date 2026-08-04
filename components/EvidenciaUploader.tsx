"use client";

import { useActionState, useRef, useState } from "react";
import { subirEvidenciaAction, type UploadState } from "@/app/dashboard/actions";

const initial: UploadState = {};

export function EvidenciaUploader({
  categoriaId,
  yaSubida,
}: {
  categoriaId: string;
  yaSubida: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    subirEvidenciaAction,
    initial,
  );
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="categoriaId" value={categoriaId} />

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 transition hover:border-brand-400 hover:bg-brand-50/40">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-4 w-4 text-slate-400"
          aria-hidden="true"
        >
          <path
            d="M12 16V4m0 0 4 4m-4-4L8 8M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="truncate">
          {nombreArchivo ?? "Elegir captura…"}
        </span>
        <input
          ref={inputRef}
          type="file"
          name="archivo"
          accept="image/png,image/jpeg,image/webp,image/gif"
          required
          className="sr-only"
          onChange={(e) =>
            setNombreArchivo(e.target.files?.[0]?.name ?? null)
          }
        />
      </label>

      {state.error && <p className="text-xs text-rose-600">{state.error}</p>}
      {state.ok && !pending && (
        <p className="text-xs text-emerald-600">
          ¡Evidencia enviada! Queda pendiente de revisión.
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !nombreArchivo}
        className="w-full rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending
          ? "Enviando…"
          : yaSubida
            ? "Reemplazar evidencia"
            : "Enviar evidencia"}
      </button>
    </form>
  );
}
