import { NextRequest } from "next/server";
import path from "path";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readStream } from "@/lib/storage";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tipo: string; id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return new Response("No autorizado", { status: 401 });
  }

  const { tipo, id } = await params;
  const isAdmin = session.user.role === ROLES.ADMIN;

  let archivoKey: string | undefined;
  let mimeType: string | undefined;
  let ownerId: string | undefined; // undefined = recurso global (todos)
  let esGlobal = false;
  let nombre = "archivo";

  if (tipo === "evidencia") {
    const ev = await prisma.evidencia.findUnique({
      where: { id },
      include: { categoria: true },
    });
    if (ev) {
      archivoKey = ev.archivoKey;
      mimeType = ev.mimeType;
      ownerId = ev.userId;
      nombre = `evidencia-${ev.categoria.nombre}`;
    }
  } else if (tipo === "asset") {
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (asset) {
      archivoKey = asset.archivoKey;
      mimeType = asset.mimeType;
      ownerId = asset.userId;
      nombre = asset.nombre;
    }
  } else if (tipo === "recurso") {
    const recurso = await prisma.recursoGlobal.findUnique({ where: { id } });
    if (recurso) {
      archivoKey = recurso.archivoKey;
      mimeType = recurso.mimeType;
      esGlobal = true; // cualquier usuario autenticado puede descargarlo
      nombre = recurso.nombre;
    }
  } else {
    return new Response("Tipo inválido", { status: 400 });
  }

  if (!archivoKey || !mimeType) {
    return new Response("No encontrado", { status: 404 });
  }

  if (!esGlobal && !isAdmin && ownerId !== session.user.id) {
    return new Response("Prohibido", { status: 403 });
  }

  const stream = await readStream(archivoKey);
  if (!stream) {
    return new Response("Archivo no disponible", { status: 404 });
  }

  const download = req.nextUrl.searchParams.get("download") === "1";
  const ext = path.extname(archivoKey.split("?")[0]) || "";
  const safeName = nombre.replace(/[^a-z0-9\-_. ]/gi, "_");
  const disposition = download
    ? `attachment; filename="${safeName}${ext}"`
    : "inline";

  return new Response(stream, {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": disposition,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
