// Cálculo del cumplimiento de un empleado.
//
// Por defecto toda categoría activa que pide evidencia le toca a todos. Un
// administrador puede eximir a un empleado de algunas (tabla ExencionEvidencia):
// esas no cuentan ni en el total ni en el porcentaje.

import { ESTADOS } from "./constants";

type EvidenciaMin = { estado: string; categoriaId: string };
type ExencionMin = { categoriaId: string };

/** Categorías que sí debe entregar este empleado. */
export function categoriasRequeridas(
  categoriasConEvidencia: Iterable<string>,
  exenciones: ExencionMin[],
): Set<string> {
  const exentas = new Set(exenciones.map((e) => e.categoriaId));
  const requeridas = new Set<string>();
  for (const id of categoriasConEvidencia) {
    if (!exentas.has(id)) requeridas.add(id);
  }
  return requeridas;
}

/** Totales de un empleado sobre las categorías que le aplican. */
export function cumplimientoEmpleado(
  requeridas: Set<string>,
  evidencias: EvidenciaMin[],
) {
  const total = requeridas.size;
  const cuentan = evidencias.filter((e) => requeridas.has(e.categoriaId));
  const aprobadas = cuentan.filter((e) => e.estado === ESTADOS.APROBADA).length;
  const pendientes = cuentan.filter(
    (e) => e.estado === ESTADOS.PENDIENTE,
  ).length;

  return {
    total,
    aprobadas,
    pendientes,
    // Sin nada que entregar, el empleado está al día: 100%.
    pct: total === 0 ? 100 : Math.round((aprobadas / total) * 100),
  };
}

type EnCola = {
  categoriaId: string;
  usuario: { exenciones: { categoriaId: string }[] };
};

/**
 * Quita de la cola de revisión las evidencias cuya categoría dejó de aplicarle
 * al empleado (se subieron antes de que el admin la marcara como "no aplica").
 */
export function soloEvidenciasQueAplican<T extends EnCola>(evidencias: T[]): T[] {
  return evidencias.filter(
    (e) => !e.usuario.exenciones.some((x) => x.categoriaId === e.categoriaId),
  );
}
