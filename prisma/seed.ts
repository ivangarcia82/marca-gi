import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { CATEGORIAS_INICIALES, ROLES } from "../lib/constants";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@generandoideas.com")
    .toLowerCase()
    .trim();
  const password = process.env.ADMIN_PASSWORD ?? "Admin1234";
  const nombre = process.env.ADMIN_NOMBRE ?? "Administrador";

  // Administrador inicial (idempotente).
  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (!existente) {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.usuario.create({
      data: {
        nombre,
        email,
        cargo: "Administrador de marca",
        rol: ROLES.ADMIN,
        passwordHash,
      },
    });
    console.log(`✔ Administrador creado: ${email} / ${password}`);
  } else {
    console.log(`• Administrador ya existe: ${email}`);
  }

  // Categorías iniciales (solo si no hay ninguna).
  const totalCategorias = await prisma.categoria.count();
  if (totalCategorias === 0) {
    for (let i = 0; i < CATEGORIAS_INICIALES.length; i++) {
      const c = CATEGORIAS_INICIALES[i];
      await prisma.categoria.create({
        data: { nombre: c.nombre, descripcion: c.descripcion, orden: i },
      });
    }
    console.log(`✔ ${CATEGORIAS_INICIALES.length} categorías creadas`);
  } else {
    console.log(`• Ya existen ${totalCategorias} categorías`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
