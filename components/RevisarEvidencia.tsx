"use client";

import { useActionState } from "react";
import {
  revisarEvidenciaAction,
  type RevisionState,
} from "@/app/admin/actions";
import { ESTADOS } from "@/lib/constants";

const initial: RevisionState = {};

export function RevisarEvidencia({ evidenciaId }: { evidenciaId: string }) {
  const [state, formAction, pending] = useActionState(
    revisarEvidenciaAction,
    initial,
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="evidenciaId" value={evidenciaId} />
      <textarea
        name="comentario"
        rows={2}
        placeholder="Motivo del rechazo (obligatorio si rechazas)"
        className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />

      {state.error && <p className="text-xs text-rose-600">{state.error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          name="decision"
          value={ESTADOS.APROBADA}
          disabled={pending}
          className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          Aprobar
        </button>
        <button
          type="submit"
          name="decision"
          value={ESTADOS.RECHAZADA}
          disabled={pending}
          className="flex-1 rounded-lg bg-white px-3 py-2 text-sm font-medium text-rose-600 ring-1 ring-inset ring-rose-200 transition hover:bg-rose-50 disabled:opacity-60"
        >
          Rechazar
        </button>
      </div>
    </form>
  );
}
