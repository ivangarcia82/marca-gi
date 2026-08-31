import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/constants";
import { areasExistentes } from "@/lib/areas";
import {
  SIN_AREA,
  categoriasRequeridas,
  cumplimientoEmpleado,
  etiquetaArea,
} from "@/lib/cumplimiento";
import { CrearEmpleadoForm } from "./CrearEmpleadoForm";

export default async function EmpleadosPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string | string[] }>;
}) {
  const { area } = await searchParams;
  // El resumen enlaza aquí con el nombre del área tal cual se muestra.
  const filtro = (Array.isArray(area) ? area[0] : area)?.trim() ?? "";

  const [categoriasActivas, todos, areas] = await Promise.all([
    prisma.categoria.findMany({
      where: { activa: true, requiereEvidencia: true },
      select: { id: true },
    }),
    prisma.usuario.findMany({
      where: { rol: ROLES.EMPLEADO },
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
      include: {
        evidencias: { select: { estado: true, categoriaId: true } },
        exenciones: { select: { categoriaId: true } },
      },
    }),
    areasExistentes(),
  ]);

  const activeIds = categoriasActivas.map((c) => c.id);
  const empleados = filtro
    ? todos.filter((e) => etiquetaArea(e.area) === filtro)
    : todos;
  const haySinArea = todos.some((e) => !e.area.trim());

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Empleados</h1>
      <p className="mt-1 text-sm text-slate-500">
        Da de alta empleados y revisa su nivel de cumplimiento.
      </p>

      {/* Formulario de alta */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-900">Nuevo empleado</h2>
        <CrearEmpleadoForm areas={areas} />
      </div>

      {/* Lista */}
      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-900">
            {filtro || "Todos los empleados"}{" "}
            <span className="text-slate-400">({empleados.length})</span>
          </h2>

          {/* Filtro por área. Como <form> GET funciona sin JavaScript. */}
          <form method="get" className="flex items-center gap-2">
            <label htmlFor="area" className="sr-only">
              Filtrar por área
            </label>
            <select
              id="area"
              name="area"
              defaultValue={filtro}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">Todas las áreas</option>
              {areas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
              {haySinArea && <option value={SIN_AREA}>{SIN_AREA}</option>}
            </select>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Filtrar
            </button>
          </form>
        </div>

        {empleados.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-400">
            {filtro
              ? `Ningún empleado en «${filtro}».`
              : "Aún no hay empleados. Agrega el primero arriba."}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {empleados.map((emp) => {
              // El total es por empleado: las categorías de las que está exento
              // no cuentan ni arriba ni abajo de la fracción.
              const requeridas = categoriasRequeridas(activeIds, emp.exenciones);
              const { total, aprobadas, pendientes, pct } = cumplimientoEmpleado(
                requeridas,
                emp.evidencias,
              );

              return (
                <li key={emp.id}>
                  <Link
                    href={`/admin/empleados/${emp.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50"
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                      {emp.nombre.slice(0, 1).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-slate-800">
                          {emp.nombre}
                        </p>
                        {!emp.activo && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                            Inactivo
                          </span>
                        )}
                        {pendientes > 0 && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                            {pendientes} por revisar
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-slate-500">
                        {emp.email}
                        {emp.cargo ? ` · ${emp.cargo}` : ""}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {etiquetaArea(emp.area)}
                      </p>
                    </div>

                    <div className="hidden w-40 shrink-0 sm:block">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>
                          {aprobadas}/{total}
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-5 w-5 shrink-0 text-slate-300"
                      aria-hidden="true"
                    >
                      <path
                        d="m9 6 6 6-6 6"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
