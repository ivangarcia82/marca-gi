"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ESTADOS } from "@/lib/constants";

export type RevisionState = { ok?: boolean; error?: string };

export async function revisarEvidenciaAction(
  _prev: RevisionState,
  formData: FormData,
): Promise<RevisionState> {
  const admin = await requireAdmin();
  const evidenciaId = String(formData.get("evidenciaId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const comentario = String(formData.get("comentario") ?? "").trim();

  if (decision !== ESTADOS.APROBADA && decision !== ESTADOS.RECHAZADA) {
    return { error: "Decisión inválida." };
  }
  if (decision === ESTADOS.RECHAZADA && comentario.length === 0) {
    return { error: "Indica el motivo del rechazo." };
  }

  const ev = await prisma.evidencia.findUnique({ where: { id: evidenciaId } });
  if (!ev) return { error: "La evidencia ya no existe." };

  await prisma.evidencia.update({
    where: { id: evidenciaId },
    data: {
      estado: decision,
      comentarioRevision: decision === ESTADOS.RECHAZADA ? comentario : "",
      revisadoPor: admin.name ?? "Administrador",
      revisadoEn: new Date(),
    },
  });

  revalidatePath("/admin/revision");
  revalidatePath(`/admin/empleados/${ev.userId}`);
  revalidatePath("/admin");
  return { ok: true };
}
