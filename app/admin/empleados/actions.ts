"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { saveFile, deleteFile } from "@/lib/storage";
import { ROLES, ASSET_MIME_TYPES, MAX_FILE_BYTES } from "@/lib/constants";

export type EmpleadoState = { ok?: boolean; error?: string };

const crearSchema = z.object({
  nombre: z.string().min(2, "El nombre es muy corto."),
  email: z.string().email("Correo inválido."),
  cargo: z.string().optional(),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
});

export async function crearEmpleadoAction(
  _prev: EmpleadoState,
  formData: FormData,
): Promise<EmpleadoState> {
  await requireAdmin();

  const parsed = crearSchema.safeParse({
    nombre: formData.get("nombre"),
    email: formData.get("email"),
    cargo: formData.get("cargo") ?? "",
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    return { error: "Ya existe un usuario con ese correo." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.usuario.create({
    data: {
      nombre: parsed.data.nombre.trim(),
      email,
      cargo: (parsed.data.cargo ?? "").trim(),
      rol: ROLES.EMPLEADO,
      passwordHash,
    },
  });

  revalidatePath("/admin/empleados");
  revalidatePath("/admin");
  return { ok: true };
}

export async function toggleEmpleadoActivoAction(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
  if (!usuario || usuario.rol === ROLES.ADMIN) return;

  await prisma.usuario.update({
    where: { id: userId },
    data: { activo: !usuario.activo },
  });
  revalidatePath("/admin/empleados");
  revalidatePath(`/admin/empleados/${userId}`);
}

export type ResetState = { ok?: boolean; error?: string };

export async function resetPasswordAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }
  const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
  if (!usuario) return { error: "Empleado no encontrado." };

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.usuario.update({ where: { id: userId }, data: { passwordHash } });
  return { ok: true };
}

export type AssetState = { ok?: boolean; error?: string };

export async function subirAssetAction(
  _prev: AssetState,
  formData: FormData,
): Promise<AssetState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const categoriaId = String(formData.get("categoriaId") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const file = formData.get("archivo");

  if (!nombre) return { error: "Ponle un nombre al archivo." };
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona un archivo." };
  }
  if (!ASSET_MIME_TYPES.includes(file.type)) {
    return { error: "Formato no válido. Usa imagen o PDF." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { error: "El archivo supera el máximo de 10 MB." };
  }

  const [usuario, categoria] = await Promise.all([
    prisma.usuario.findUnique({ where: { id: userId } }),
    prisma.categoria.findUnique({ where: { id: categoriaId } }),
  ]);
  if (!usuario) return { error: "Empleado no encontrado." };
  if (!categoria) return { error: "Categoría no encontrada." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = await saveFile("assets", buffer, file.type, file.name);

  await prisma.asset.create({
    data: {
      userId,
      categoriaId,
      nombre,
      archivoKey: key,
      mimeType: file.type,
      subidoPor: admin.name ?? "Administrador",
    },
  });

  revalidatePath(`/admin/empleados/${userId}`);
  return { ok: true };
}

export async function eliminarAssetAction(formData: FormData) {
  await requireAdmin();
  const assetId = String(formData.get("assetId") ?? "");
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) return;

  await deleteFile(asset.archivoKey);
  await prisma.asset.delete({ where: { id: assetId } });
  revalidatePath(`/admin/empleados/${asset.userId}`);
}
