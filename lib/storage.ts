// Capa de abstracción de almacenamiento de archivos.
//
// DEV (o sin token de Blob): guarda en disco bajo `.storage/`.
// PROD (con BLOB_READ_WRITE_TOKEN): usa Vercel Blob.
//
// Los archivos NUNCA se sirven directo al cliente: siempre pasan por la ruta
// autenticada /api/files/[tipo]/[id], que valida permisos y luego lee por `key`.

import { promises as fs, createReadStream } from "fs";
import { Readable } from "stream";
import path from "path";
import { randomUUID } from "crypto";

// Acepta el nombre estándar de Vercel Blob o el que genera un prefijo
// personalizado (BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN).
const blobToken =
  process.env.BLOB_READ_WRITE_TOKEN ??
  process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN;
const useBlob = Boolean(blobToken);
const STORAGE_DIR = path.join(process.cwd(), ".storage");

/**
 * `true` cuando los archivos van a Vercel Blob. Solo entonces el navegador
 * puede subir directo al almacenamiento (sin pasar por el servidor); en local,
 * sin token, se sube por el server action contra el disco.
 */
export const blobHabilitado = useBlob;

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/pdf": "pdf",
    "application/zip": "zip",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      "pptx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  };
  return map[mime] ?? "bin";
}

/** Extensión (sin punto) de un nombre de archivo, o "" si no tiene. */
export function extFromName(name?: string): string {
  if (!name) return "";
  const ext = path.extname(name).replace(/^\./, "").toLowerCase();
  return /^[a-z0-9]{1,5}$/.test(ext) ? ext : "";
}

/**
 * Guarda un archivo y devuelve la `key` que se persiste en la base.
 * @param prefix carpeta lógica, ej. "evidencias", "assets", "recursos".
 * @param originalName nombre original para preservar su extensión.
 */
export async function saveFile(
  prefix: string,
  buffer: Buffer,
  mimeType: string,
  originalName?: string,
): Promise<string> {
  const ext = extFromName(originalName) || extFromMime(mimeType);
  const name = `${randomUUID()}.${ext}`;

  if (useBlob) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`${prefix}/${name}`, buffer, {
      access: "private",
      addRandomSuffix: true,
      contentType: mimeType,
      token: blobToken,
    });
    // Blob privado: solo accesible con token; se sirve por la ruta autenticada.
    return blob.url;
  }

  const dir = path.join(STORAGE_DIR, prefix);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, name);
  await fs.writeFile(filePath, buffer);
  return `${prefix}/${name}`;
}

/**
 * Metadatos de un blob que subió el navegador. Que `head` responda ya prueba
 * que la `key` pertenece a NUESTRO store (el token lo delimita), así que sirve
 * para validar lo que el cliente dice haber subido antes de guardarlo en base.
 * Devuelve null si no existe o si el Blob no está activo.
 */
export async function blobInfo(
  key: string,
): Promise<{ pathname: string; size: number; contentType: string } | null> {
  if (!useBlob || !key.startsWith("http")) return null;
  try {
    const { head } = await import("@vercel/blob");
    const blob = await head(key, { token: blobToken });
    return {
      pathname: blob.pathname,
      size: blob.size,
      contentType: blob.contentType,
    };
  } catch {
    return null;
  }
}

/** Lee un archivo por su `key`. Devuelve el buffer o null si no existe. */
export async function readFile(key: string): Promise<Buffer | null> {
  try {
    if (key.startsWith("http")) {
      const res = await fetch(key);
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    }
    const filePath = path.join(STORAGE_DIR, key);
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

/**
 * Devuelve un ReadableStream del archivo (sin cargarlo entero en memoria).
 * Ideal para archivos grandes como el Brand Book. Devuelve null si no existe.
 */
export async function readStream(key: string): Promise<ReadableStream | null> {
  try {
    if (key.startsWith("http")) {
      const { get } = await import("@vercel/blob");
      const res = await get(key, { access: "private", token: blobToken });
      return (res?.stream as ReadableStream) ?? null;
    }
    const filePath = path.join(STORAGE_DIR, key);
    await fs.access(filePath);
    return Readable.toWeb(createReadStream(filePath)) as ReadableStream;
  } catch {
    return null;
  }
}

/**
 * Elimina un archivo por su `key`. No lanza nunca.
 *
 * Devuelve `true` si tras la llamada el archivo ya no está (borrado, o no
 * existía). `false` solo si el borrado falló de verdad —token inválido, red
 * caída—, para que quien llame no dé por perdida una referencia que todavía
 * apunta a algo y el archivo quede huérfano en el store.
 */
export async function deleteFile(key: string): Promise<boolean> {
  if (!key) return true;
  try {
    if (key.startsWith("http")) {
      const { del } = await import("@vercel/blob");
      await del(key, { token: blobToken });
      return true;
    }
    await fs.unlink(path.join(STORAGE_DIR, key));
    return true;
  } catch (error) {
    // Que ya no exista es justo lo que buscábamos.
    return (error as NodeJS.ErrnoException)?.code === "ENOENT";
  }
}
