// Cargador de material de marca. Consume scripts/carga_plan.json.
// Idempotente: re-ejecutarlo no duplica usuarios, recursos ni assets.
import { readFileSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { saveFile } from "../lib/storage";
import { ROLES } from "../lib/constants";

const prisma = new PrismaClient();
const PLAN = path.join(process.cwd(), "scripts/carga_plan.json");

type Recurso = { nombre: string; path: string };
type Plan = {
  password: string;
  categorias: {
    nombre: string;
    descripcion: string;
    requiereEvidencia: boolean;
    orden: number;
    recursos: Recurso[];
  }[];
  usuarios: { nombre: string; email: string; cargo: string; areaNum: string }[];
  firmasPorArea: Record<string, { path: string; label: string }>;
  fotos: { email: string; path: string; nombre: string; confianza: string }[];
};

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};
const mimeOf = (p: string) => MIME[path.extname(p).toLowerCase()] ?? "application/octet-stream";

async function main() {
  const plan: Plan = JSON.parse(readFileSync(PLAN, "utf8"));
  const passwordHash = await bcrypt.hash(plan.password, 10);
  const stats = {
    categorias: 0,
    recursos: 0,
    usuariosNuevos: 0,
    usuariosExistentes: 0,
    firmas: 0,
    fotos: 0,
    errores: [] as string[],
  };

  // 1) Categorías + recursos compartidos
  const catId: Record<string, string> = {};
  for (const c of plan.categorias) {
    let cat = await prisma.categoria.findFirst({ where: { nombre: c.nombre } });
    if (!cat) {
      cat = await prisma.categoria.create({
        data: {
          nombre: c.nombre,
          descripcion: c.descripcion,
          orden: c.orden,
          activa: true,
          requiereEvidencia: c.requiereEvidencia,
        },
      });
      stats.categorias++;
    } else {
      cat = await prisma.categoria.update({
        where: { id: cat.id },
        data: {
          descripcion: c.descripcion,
          orden: c.orden,
          activa: true,
          requiereEvidencia: c.requiereEvidencia,
        },
      });
    }
    catId[c.nombre] = cat.id;

    for (const r of c.recursos) {
      const existe = await prisma.recursoGlobal.findFirst({
        where: { categoriaId: cat.id, nombre: r.nombre },
      });
      if (existe) continue;
      try {
        const buf = readFileSync(r.path);
        const key = await saveFile("recursos", buf, mimeOf(r.path), path.basename(r.path));
        await prisma.recursoGlobal.create({
          data: { categoriaId: cat.id, nombre: r.nombre, archivoKey: key, mimeType: mimeOf(r.path) },
        });
        stats.recursos++;
        console.log(`  recurso: ${c.nombre} · ${r.nombre}`);
      } catch (e) {
        stats.errores.push(`recurso ${r.nombre}: ${e}`);
      }
    }
  }

  const firmaCatId = catId["Firma de correo"];
  const fotoCatId = catId["Fotografía corporativa"];

  // 2) Usuarios
  const userId: Record<string, { id: string; areaNum: string }> = {};
  for (const u of plan.usuarios) {
    let usuario = await prisma.usuario.findUnique({ where: { email: u.email } });
    if (!usuario) {
      usuario = await prisma.usuario.create({
        data: {
          nombre: u.nombre,
          email: u.email,
          cargo: u.cargo,
          rol: ROLES.EMPLEADO,
          passwordHash,
        },
      });
      stats.usuariosNuevos++;
    } else {
      stats.usuariosExistentes++;
    }
    userId[u.email] = { id: usuario.id, areaNum: u.areaNum };
  }

  // 3) Firmas (por departamento) como asset personal
  for (const u of plan.usuarios) {
    const info = userId[u.email];
    const firma = plan.firmasPorArea[u.areaNum];
    if (!info || !firma || !firmaCatId) continue;
    const ya = await prisma.asset.findFirst({
      where: { userId: info.id, categoriaId: firmaCatId },
    });
    if (ya) continue;
    try {
      const buf = readFileSync(firma.path);
      const key = await saveFile("assets", buf, mimeOf(firma.path), path.basename(firma.path));
      await prisma.asset.create({
        data: {
          userId: info.id,
          categoriaId: firmaCatId,
          nombre: "Firma de correo",
          archivoKey: key,
          mimeType: mimeOf(firma.path),
          subidoPor: "Carga inicial",
        },
      });
      stats.firmas++;
    } catch (e) {
      stats.errores.push(`firma ${u.email}: ${e}`);
    }
  }

  // 4) Fotografías corporativas (por persona)
  for (const f of plan.fotos) {
    const info = userId[f.email];
    if (!info || !fotoCatId) continue;
    const ya = await prisma.asset.findFirst({
      where: { userId: info.id, categoriaId: fotoCatId },
    });
    if (ya) continue;
    try {
      const buf = readFileSync(f.path);
      const key = await saveFile("assets", buf, mimeOf(f.path), path.basename(f.path));
      await prisma.asset.create({
        data: {
          userId: info.id,
          categoriaId: fotoCatId,
          nombre: "Fotografía corporativa",
          archivoKey: key,
          mimeType: mimeOf(f.path),
          subidoPor: "Carga inicial",
        },
      });
      stats.fotos++;
    } catch (e) {
      stats.errores.push(`foto ${f.email}: ${e}`);
    }
  }

  console.log("\n=== RESUMEN DE CARGA ===");
  console.log(stats);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
