"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { saveFile, deleteFile } from "@/lib/storage";
import { ESTADOS, IMAGE_MIME_TYPES, MAX_FILE_BYTES } from "@/lib/constants";

export type UploadState = { ok?: boolean; error?: string };

export async function subirEvidenciaAction(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const user = await requireUser();
  const categoriaId = String(formData.get("categoriaId") ?? "");
  const file = formData.get("archivo");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona una imagen." };
  }
  if (!IMAGE_MIME_TYPES.includes(file.type)) {
    return { error: "Formato no válido. Usa PNG, JPG, WEBP o GIF." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { error: "La imagen supera el máximo de 10 MB." };
  }

  const [categoria, exencion] = await Promise.all([
    prisma.categoria.findUnique({ where: { id: categoriaId } }),
    prisma.exencionEvidencia.findUnique({
      where: { userId_categoriaId: { userId: user.id, categoriaId } },
    }),
  ]);
  if (!categoria || !categoria.activa) {
    return { error: "La categoría no existe o está inactiva." };
  }
  if (!categoria.requiereEvidencia || exencion) {
    return { error: "Esta evidencia no aplica para ti." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const nuevaKey = await saveFile("evidencias", buffer, file.type, file.name);

  const existente = await prisma.evidencia.findUnique({
    where: { userId_categoriaId: { userId: user.id, categoriaId } },
  });

  if (existente) {
    await deleteFile(existente.archivoKey);
    await prisma.evidencia.update({
      where: { id: existente.id },
      data: {
        archivoKey: nuevaKey,
        mimeType: file.type,
        estado: ESTADOS.PENDIENTE,
        comentarioRevision: "",
        revisadoPor: "",
        revisadoEn: null,
        createdAt: new Date(),
      },
    });
  } else {
    await prisma.evidencia.create({
      data: {
        userId: user.id,
        categoriaId,
        archivoKey: nuevaKey,
        mimeType: file.type,
        estado: ESTADOS.PENDIENTE,
      },
    });
  }

  revalidatePath("/dashboard");
  return { ok: true };
}
