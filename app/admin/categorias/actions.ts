"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { saveFile, deleteFile } from "@/lib/storage";
import {
  ROLES,
  ARCHIVO_FORMATO_ERROR,
  MAX_FILE_BYTES,
  mimeDeArchivo,
} from "@/lib/constants";

export type CategoriaState = { ok?: boolean; error?: string };

const categoriaSchema = z.object({
  nombre: z.string().min(2, "El nombre es muy corto."),
  descripcion: z.string().optional(),
});

export async function crearCategoriaAction(
  _prev: CategoriaState,
  formData: FormData,
): Promise<CategoriaState> {
  await requireAdmin();
  const parsed = categoriaSchema.safeParse({
    nombre: formData.get("nombre"),
    descripcion: formData.get("descripcion") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const max = await prisma.categoria.aggregate({ _max: { orden: true } });
  await prisma.categoria.create({
    data: {
      nombre: parsed.data.nombre.trim(),
      descripcion: (parsed.data.descripcion ?? "").trim(),
      orden: (max._max.orden ?? -1) + 1,
    },
  });

  revalidatePath("/admin/categorias");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function actualizarCategoriaAction(
  _prev: CategoriaState,
  formData: FormData,
): Promise<CategoriaState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const parsed = categoriaSchema.safeParse({
    nombre: formData.get("nombre"),
    descripcion: formData.get("descripcion") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  await prisma.categoria.update({
    where: { id },
    data: {
      nombre: parsed.data.nombre.trim(),
      descripcion: (parsed.data.descripcion ?? "").trim(),
    },
  });
  revalidatePath("/admin/categorias");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function toggleCategoriaActivaAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const cat = await prisma.categoria.findUnique({ where: { id } });
  if (!cat) return;
  await prisma.categoria.update({
    where: { id },
    data: { activa: !cat.activa },
  });
  revalidatePath("/admin/categorias");
  revalidatePath("/dashboard");
}

export async function toggleRequiereEvidenciaAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const cat = await prisma.categoria.findUnique({ where: { id } });
  if (!cat) return;
  await prisma.categoria.update({
    where: { id },
    data: { requiereEvidencia: !cat.requiereEvidencia },
  });
  revalidatePath("/admin/categorias");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
}

export type RecursoState = { ok?: boolean; error?: string };

/** Sube un recurso compartido (visible para todos) en una categoría. */
export async function subirRecursoGlobalAction(
  _prev: RecursoState,
  formData: FormData,
): Promise<RecursoState> {
  await requireAdmin();
  const categoriaId = String(formData.get("categoriaId") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const file = formData.get("archivo");

  if (!nombre) return { error: "Ponle un nombre al archivo." };
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona un archivo." };
  }

  const mimeType = mimeDeArchivo(file.name, file.type);
  if (!mimeType) return { error: ARCHIVO_FORMATO_ERROR };
  if (file.size > MAX_FILE_BYTES) {
    return { error: "El archivo supera el máximo de 10 MB." };
  }

  const categoria = await prisma.categoria.findUnique({
    where: { id: categoriaId },
  });
  if (!categoria) return { error: "Categoría no encontrada." };

  const max = await prisma.recursoGlobal.aggregate({
    where: { categoriaId },
    _max: { orden: true },
  });
  const buffer = Buffer.from(await file.arrayBuffer());
  const key = await saveFile("recursos", buffer, mimeType, file.name);

  await prisma.recursoGlobal.create({
    data: {
      categoriaId,
      nombre,
      archivoKey: key,
      mimeType,
      orden: (max._max.orden ?? -1) + 1,
    },
  });

  revalidatePath("/admin/categorias");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function eliminarRecursoGlobalAction(formData: FormData) {
  await requireAdmin();
  const recursoId = String(formData.get("recursoId") ?? "");
  const recurso = await prisma.recursoGlobal.findUnique({
    where: { id: recursoId },
  });
  if (!recurso) return;
  await deleteFile(recurso.archivoKey);
  await prisma.recursoGlobal.delete({ where: { id: recursoId } });
  revalidatePath("/admin/categorias");
  revalidatePath("/dashboard");
}

export async function moverCategoriaAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const dir = String(formData.get("dir") ?? ""); // "arriba" | "abajo"

  const categorias = await prisma.categoria.findMany({
    orderBy: { orden: "asc" },
  });
  const idx = categorias.findIndex((c) => c.id === id);
  if (idx === -1) return;
  const swapIdx = dir === "arriba" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= categorias.length) return;

  const a = categorias[idx];
  const b = categorias[swapIdx];
  await prisma.$transaction([
    prisma.categoria.update({ where: { id: a.id }, data: { orden: b.orden } }),
    prisma.categoria.update({ where: { id: b.id }, data: { orden: a.orden } }),
  ]);
  revalidatePath("/admin/categorias");
  revalidatePath("/dashboard");
}

export async function eliminarCategoriaAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  // Cascade elimina assets y evidencias asociadas.
  await prisma.categoria.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/categorias");
  revalidatePath("/dashboard");
}

export type BulkAssetState = { ok?: boolean; error?: string; count?: number };

/** Sube un mismo archivo y lo asigna a varios empleados en una categoría. */
export async function asignarAssetBulkAction(
  _prev: BulkAssetState,
  formData: FormData,
): Promise<BulkAssetState> {
  const admin = await requireAdmin();
  const categoriaId = String(formData.get("categoriaId") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const asignarTodos = formData.get("todos") === "on";
  const seleccionados = formData.getAll("empleados").map(String);
  const file = formData.get("archivo");

  if (!nombre) return { error: "Ponle un nombre al archivo." };
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona un archivo." };
  }
  const mimeType = mimeDeArchivo(file.name, file.type);
  if (!mimeType) return { error: ARCHIVO_FORMATO_ERROR };
  if (file.size > MAX_FILE_BYTES) {
    return { error: "El archivo supera el máximo de 10 MB." };
  }

  const categoria = await prisma.categoria.findUnique({
    where: { id: categoriaId },
  });
  if (!categoria) return { error: "Categoría no encontrada." };

  const empleados = await prisma.usuario.findMany({
    where: asignarTodos
      ? { rol: ROLES.EMPLEADO, activo: true }
      : { id: { in: seleccionados }, rol: ROLES.EMPLEADO },
    select: { id: true },
  });
  if (empleados.length === 0) {
    return { error: "Selecciona al menos un empleado." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Guarda una copia por empleado para que cada quien sea dueño de su archivo.
  for (const emp of empleados) {
    const key = await saveFile("assets", buffer, mimeType, file.name);
    await prisma.asset.create({
      data: {
        userId: emp.id,
        categoriaId,
        nombre,
        archivoKey: key,
        mimeType,
        subidoPor: admin.name ?? "Administrador",
      },
    });
  }

  revalidatePath("/admin/categorias");
  return { ok: true, count: empleados.length };
}
