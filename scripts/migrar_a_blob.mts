// Migra a Vercel Blob los archivos que quedaron referenciados con rutas locales
// en la base (recursos, assets y evidencias). Idempotente: salta los que ya son URL.
//
// Requiere en .env: DATABASE_URL (Neon) y el token de Blob
// (BLOB_READ_WRITE_TOKEN o BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN).
import { readFileSync, existsSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { put } from "@vercel/blob";

const prisma = new PrismaClient();
const STORAGE = path.join(process.cwd(), ".storage");
const token =
  process.env.BLOB_READ_WRITE_TOKEN ??
  process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN;

async function subir(archivoKey: string, mimeType: string): Promise<string | null> {
  const filePath = path.join(STORAGE, archivoKey);
  if (!existsSync(filePath)) return null;
  const buffer = readFileSync(filePath);
  const blob = await put(archivoKey, buffer, {
    access: "private",
    addRandomSuffix: true,
    contentType: mimeType,
    token,
  });
  return blob.url;
}

async function main() {
  if (!token) throw new Error("Falta el token de Blob en .env");
  if (!process.env.DATABASE_URL?.startsWith("postgres"))
    throw new Error("DATABASE_URL no apunta a Neon (postgres)");

  const stats = {
    recursos: { migrado: 0, ya_url: 0, sin_local: 0 },
    assets: { migrado: 0, ya_url: 0, sin_local: 0 },
    evidencias: { migrado: 0, ya_url: 0, sin_local: 0 },
  };
  const faltantes: string[] = [];

  // Recursos globales
  for (const r of await prisma.recursoGlobal.findMany()) {
    if (r.archivoKey.startsWith("http")) { stats.recursos.ya_url++; continue; }
    const url = await subir(r.archivoKey, r.mimeType);
    if (!url) { stats.recursos.sin_local++; faltantes.push(`recurso ${r.nombre}: ${r.archivoKey}`); continue; }
    await prisma.recursoGlobal.update({ where: { id: r.id }, data: { archivoKey: url } });
    stats.recursos.migrado++;
  }

  // Assets personales (firmas, fotos)
  for (const a of await prisma.asset.findMany()) {
    if (a.archivoKey.startsWith("http")) { stats.assets.ya_url++; continue; }
    const url = await subir(a.archivoKey, a.mimeType);
    if (!url) { stats.assets.sin_local++; faltantes.push(`asset ${a.nombre}: ${a.archivoKey}`); continue; }
    await prisma.asset.update({ where: { id: a.id }, data: { archivoKey: url } });
    stats.assets.migrado++;
  }

  // Evidencias
  for (const e of await prisma.evidencia.findMany()) {
    if (e.archivoKey.startsWith("http")) { stats.evidencias.ya_url++; continue; }
    const url = await subir(e.archivoKey, e.mimeType);
    if (!url) { stats.evidencias.sin_local++; faltantes.push(`evidencia ${e.id}: ${e.archivoKey}`); continue; }
    await prisma.evidencia.update({ where: { id: e.id }, data: { archivoKey: url } });
    stats.evidencias.migrado++;
  }

  console.log("=== MIGRACIÓN A BLOB ===");
  console.log(JSON.stringify(stats, null, 1));
  if (faltantes.length) {
    console.log(`\n⚠️ ${faltantes.length} archivos sin copia local (revisar):`);
    faltantes.slice(0, 20).forEach((f) => console.log("  ", f));
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
