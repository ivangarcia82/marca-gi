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
      access: "public",
      addRandomSuffix: true,
      contentType: mimeType,
      token: blobToken,
    });
    // La URL es no adivinable y nunca se expone al cliente directamente.
    return blob.url;
  }

  const dir = path.join(STORAGE_DIR, prefix);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, name);
  await fs.writeFile(filePath, buffer);
  return `${prefix}/${name}`;
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
      const res = await fetch(key);
      if (!res.ok || !res.body) return null;
      return res.body;
    }
    const filePath = path.join(STORAGE_DIR, key);
    await fs.access(filePath);
    return Readable.toWeb(createReadStream(filePath)) as ReadableStream;
  } catch {
    return null;
  }
}

/** Elimina un archivo por su `key`. No lanza si ya no existe. */
export async function deleteFile(key: string): Promise<void> {
  try {
    if (key.startsWith("http")) {
      const { del } = await import("@vercel/blob");
      await del(key, { token: blobToken });
      return;
    }
    await fs.unlink(path.join(STORAGE_DIR, key));
  } catch {
    // ignorar si no existe
  }
}
