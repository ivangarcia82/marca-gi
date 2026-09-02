import { NextRequest } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { blobToken } from "@/lib/storage";
import { IMAGE_MIME_TYPES, MAX_EVIDENCIA_BYTES } from "@/lib/constants";

export const runtime = "nodejs";

/**
 * Motivo que sí se le puede enseñar al empleado. Lo que no sea esto es un
 * fallo nuestro (configuración, red) y se responde en genérico: el SDK del
 * cliente no traduce nada y el mensaje acabaría tal cual en pantalla.
 */
class SubidaRechazada extends Error {}

/**
 * Autoriza la subida DIRECTA de una evidencia del navegador a Vercel Blob.
 *
 * El archivo nunca pasa por el servidor, así que no le aplica el tope de 4.5 MB
 * que Vercel impone al cuerpo de las peticiones a una función. Aquí solo se
 * emite un token de un solo uso, acotado a:
 *
 * - la carpeta del propio usuario (`evidencias/<userId>/…`),
 * - los formatos de imagen permitidos,
 * - MAX_EVIDENCIA_BYTES.
 *
 * Terminada la subida, el cliente llama a `registrarEvidenciaAction`, que
 * vuelve a comprobar todo contra el blob ya existente. No se usa
 * `onUploadCompleted` porque en local no puede llegar el callback.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const resultado = await handleUpload({
      request: req,
      // Sin esto el SDK solo leería BLOB_READ_WRITE_TOKEN, y en producción el
      // token vive bajo el nombre con prefijo personalizado.
      token: blobToken,
      body: (await req.json()) as HandleUploadBody,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!pathname.startsWith(`evidencias/${userId}/`)) {
          throw new SubidaRechazada("Ruta de subida no permitida.");
        }

        let categoriaId = "";
        try {
          categoriaId = String(JSON.parse(clientPayload ?? "{}").categoriaId ?? "");
        } catch {
          throw new SubidaRechazada("Petición mal formada.");
        }

        const [categoria, exencion] = await Promise.all([
          prisma.categoria.findUnique({ where: { id: categoriaId } }),
          prisma.exencionEvidencia.findUnique({
            where: { userId_categoriaId: { userId, categoriaId } },
          }),
        ]);
        if (!categoria || !categoria.activa) {
          throw new SubidaRechazada("La categoría no existe o está inactiva.");
        }
        if (!categoria.requiereEvidencia || exencion) {
          throw new SubidaRechazada("Esta evidencia no aplica para ti.");
        }

        return {
          allowedContentTypes: IMAGE_MIME_TYPES,
          maximumSizeInBytes: MAX_EVIDENCIA_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId, categoriaId }),
        };
      },
    });

    return Response.json(resultado);
  } catch (error) {
    if (error instanceof SubidaRechazada) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("Fallo al autorizar la subida de evidencia:", error);
    return Response.json(
      { error: "No se pudo autorizar la subida. Avisa al administrador." },
      { status: 500 },
    );
  }
}
