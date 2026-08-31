// Áreas/departamentos. Se guardan como texto en `Usuario.area` (igual que el
// cargo): no hay catálogo aparte, la lista sale de lo que ya está capturado.

import { prisma } from "./prisma";
import { ROLES } from "./constants";

/** Áreas ya en uso, ordenadas. Alimenta el autocompletado de los formularios. */
export async function areasExistentes(): Promise<string[]> {
  const filas = await prisma.usuario.findMany({
    where: { rol: ROLES.EMPLEADO, area: { not: "" } },
    select: { area: true },
    distinct: ["area"],
    orderBy: { area: "asc" },
  });
  return filas.map((f) => f.area);
}
