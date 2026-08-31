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

/** Etiqueta para los empleados a los que todavía no se les puso área. */
export const SIN_AREA = "Sin área";

/** Nombre de área listo para mostrar y agrupar (vacío → "Sin área"). */
export function etiquetaArea(area: string): string {
  return area.trim() || SIN_AREA;
}

type EmpleadoConArea = {
  area: string;
  evidencias: EvidenciaMin[];
  exenciones: ExencionMin[];
};

export type CumplimientoArea = {
  area: string;
  empleados: number;
  /** Evidencias esperadas: la suma de los objetivos individuales del área. */
  total: number;
  aprobadas: number;
  pendientes: number;
  pct: number;
};

/**
 * El mismo KPI global, desglosado por área. El objetivo se suma empleado por
 * empleado (cada quien tiene el suyo según sus exenciones), así que el total
 * de todas las áreas coincide con el global.
 */
export function cumplimientoPorArea(
  categoriasConEvidencia: Iterable<string>,
  empleados: EmpleadoConArea[],
): CumplimientoArea[] {
  const ids = [...categoriasConEvidencia];
  const acc = new Map<string, CumplimientoArea>();

  for (const emp of empleados) {
    const area = etiquetaArea(emp.area);
    const fila = acc.get(area) ?? {
      area,
      empleados: 0,
      total: 0,
      aprobadas: 0,
      pendientes: 0,
      pct: 0,
    };
    const resumen = cumplimientoEmpleado(
      categoriasRequeridas(ids, emp.exenciones),
      emp.evidencias,
    );
    fila.empleados += 1;
    fila.total += resumen.total;
    fila.aprobadas += resumen.aprobadas;
    fila.pendientes += resumen.pendientes;
    acc.set(area, fila);
  }

  for (const fila of acc.values()) {
    // Un área sin nada que entregar está al día, igual que un empleado exento.
    fila.pct =
      fila.total === 0 ? 100 : Math.round((fila.aprobadas / fila.total) * 100);
  }

  // Mejor cumplimiento primero; "Sin área" siempre al final porque no es un área real.
  return [...acc.values()].sort((a, b) => {
    if (a.area === SIN_AREA) return 1;
    if (b.area === SIN_AREA) return -1;
    return b.pct - a.pct || b.empleados - a.empleados || a.area.localeCompare(b.area);
  });
}
