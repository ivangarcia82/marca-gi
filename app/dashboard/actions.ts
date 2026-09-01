"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { saveFile, deleteFile, blobInfo } from "@/lib/storage";
import {
  ESTADOS,
  IMAGE_MIME_TYPES,
  MAX_FILE_BYTES,
  enMB,
} from "@/lib/constants";

export type UploadState = { ok?: boolean; error?: string };

/**
 * Comprueba que el usuario puede subir evidencia de esta categoría.
 * Devuelve el mensaje de error, o null si todo está en orden.
 */
async function motivoParaRechazar(
  userId: string,
  categoriaId: string,
): Promise<string | null> {
  const [categoria, exencion] = await Promise.all([
    prisma.categoria.findUnique({ where: { id: categoriaId } }),
    prisma.exencionEvidencia.findUnique({
      where: { userId_categoriaId: { userId, categoriaId } },
    }),
  ]);
  if (!categoria || !categoria.activa) {
    return "La categoría no existe o está inactiva.";
  }
  if (!categoria.requiereEvidencia || exencion) {
    return "Esta evidencia no aplica para ti.";
  }
  return null;
}

/**
 * Deja la evidencia como pendiente de revisión, reemplazando la anterior
 * (y borrando su archivo) si ya había una.
 */
async function guardarEvidencia(
  userId: string,
  categoriaId: string,
  archivoKey: string,
  mimeType: string,
): Promise<void> {
  const existente = await prisma.evidencia.findUnique({
    where: { userId_categoriaId: { userId, categoriaId } },
  });

  if (existente) {
    await deleteFile(existente.archivoKey);
    await prisma.evidencia.update({
      where: { id: existente.id },
      data: {
        archivoKey,
        mimeType,
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
        userId,
        categoriaId,
        archivoKey,
        mimeType,
        estado: ESTADOS.PENDIENTE,
      },
    });
  }

  revalidatePath("/dashboard");
}

/**
 * Registra una evidencia que el navegador ya subió directo a Vercel Blob.
 *
 * El archivo no pasó por aquí, así que no hay nada que creer del cliente: se
 * verifica contra el blob real (existe en nuestro store, cuelga de la carpeta
 * del usuario, y es una imagen). Si algo falla se borra el huérfano.
 */
export async function registrarEvidenciaAction(
  categoriaId: string,
  archivoKey: string,
): Promise<UploadState> {
  const user = await requireUser();

  const info = await blobInfo(archivoKey);
  if (!info) {
    return { error: "No se pudo verificar el archivo subido." };
  }

  const descartar = async (error: string): Promise<UploadState> => {
    await deleteFile(archivoKey);
    return { error };
  };

  // El token solo autoriza esta carpeta, pero se revalida: es lo único que
  // ata el archivo a quien dice haberlo subido.
  if (!info.pathname.startsWith(`evidencias/${user.id}/`)) {
    return descartar("Archivo no válido.");
  }
  if (!IMAGE_MIME_TYPES.includes(info.contentType)) {
    return descartar("Formato no válido. Usa PNG, JPG, WEBP o GIF.");
  }

  const rechazo = await motivoParaRechazar(user.id, categoriaId);
  if (rechazo) return descartar(rechazo);

  await guardarEvidencia(user.id, categoriaId, archivoKey, info.contentType);
  return { ok: true };
}

/**
 * Sube la evidencia a través del servidor. Es el camino de respaldo para
 * cuando no hay Vercel Blob (local, con los archivos en `.storage`), y por eso
 * arrastra el tope de MAX_FILE_BYTES: aquí el archivo sí viaja en el cuerpo de
 * la petición. Con Blob activo, el navegador usa `registrarEvidenciaAction`.
 */
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
    return { error: `La imagen supera el máximo de ${enMB(MAX_FILE_BYTES)}.` };
  }

  const rechazo = await motivoParaRechazar(user.id, categoriaId);
  if (rechazo) return { error: rechazo };

  const buffer = Buffer.from(await file.arrayBuffer());
  const nuevaKey = await saveFile("evidencias", buffer, file.type, file.name);

  await guardarEvidencia(user.id, categoriaId, nuevaKey, file.type);
  return { ok: true };
}
