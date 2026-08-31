import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ESTADOS, ROLES } from "@/lib/constants";
import {
  cumplimientoPorArea,
  soloEvidenciasQueAplican,
} from "@/lib/cumplimiento";

function StatCard({
  label,
  value,
  hint,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "slate" | "amber" | "emerald" | "brand";
}) {
  const tones: Record<string, string> = {
    slate: "text-slate-900",
    amber: "text-amber-600",
    emerald: "text-emerald-600",
    brand: "text-brand-600",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-semibold ${tones[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

// Semáforo del cumplimiento, igual para todas las áreas.
function tono(pct: number) {
  if (pct >= 80) return { barra: "bg-emerald-500", texto: "text-emerald-600" };
  if (pct >= 50) return { barra: "bg-amber-500", texto: "text-amber-600" };
  return { barra: "bg-rose-500", texto: "text-rose-600" };
}

export default async function AdminResumenPage() {
  const [empleados, categoriasActivas, enCola] = await Promise.all([
    prisma.usuario.findMany({
      where: { rol: ROLES.EMPLEADO, activo: true },
      select: {
        area: true,
        evidencias: { select: { estado: true, categoriaId: true } },
        exenciones: { select: { categoriaId: true } },
      },
    }),
    prisma.categoria.findMany({
      where: { activa: true, requiereEvidencia: true },
      select: { id: true },
    }),
    prisma.evidencia.findMany({
      where: { estado: ESTADOS.PENDIENTE },
      include: {
        usuario: { include: { exenciones: { select: { categoriaId: true } } } },
        categoria: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // El objetivo se suma empleado por empleado: cada quien tiene su propio total
  // según las evidencias de las que el admin lo haya eximido. El global es la
  // suma de las áreas, así que ambos indicadores no pueden desviarse.
  const porArea = cumplimientoPorArea(
    categoriasActivas.map((c) => c.id),
    empleados,
  );
  const objetivo = porArea.reduce((n, a) => n + a.total, 0);
  const aprobadas = porArea.reduce((n, a) => n + a.aprobadas, 0);

  const empleadosActivos = empleados.length;
  const porRevisar = soloEvidenciasQueAplican(enCola);
  const pendientes = porRevisar.length;
  const colaPendiente = porRevisar.slice(0, 5);
  const pct = objetivo === 0 ? 0 : Math.round((aprobadas / objetivo) * 100);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Resumen</h1>
      <p className="mt-1 text-sm text-slate-500">
        Estado general del cumplimiento de marca.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Empleados activos" value={empleadosActivos} tone="brand" />
        <StatCard
          label="Evidencias por revisar"
          value={pendientes}
          tone="amber"
          hint={pendientes > 0 ? "Requieren tu atención" : "Todo al día"}
        />
        <StatCard label="Evidencias aprobadas" value={aprobadas} tone="emerald" />
        <StatCard
          label="Cumplimiento global"
          value={`${pct}%`}
          hint={`${aprobadas} de ${objetivo} esperadas`}
        />
      </div>

      {/* El mismo KPI, área por área */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-semibold text-slate-900">
              Cumplimiento por área
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Evidencias aprobadas sobre las esperadas de cada área.
            </p>
          </div>
          <span className="shrink-0 text-sm text-slate-400">
            {porArea.length} {porArea.length === 1 ? "área" : "áreas"}
          </span>
        </div>

        {porArea.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">
            Aún no hay empleados activos que medir.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {porArea.map((a) => {
              const t = tono(a.pct);
              return (
                <li key={a.area}>
                  <Link
                    href={`/admin/empleados?area=${encodeURIComponent(a.area)}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 transition hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1 basis-48">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {a.area}
                        </p>
                        {a.pendientes > 0 && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                            {a.pendientes} por revisar
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {a.empleados}{" "}
                        {a.empleados === 1 ? "empleado" : "empleados"}
                      </p>
                    </div>

                    <div className="w-40 shrink-0">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${t.barra}`}
                          style={{ width: `${a.pct}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {a.aprobadas} de {a.total} esperadas
                      </p>
                    </div>

                    <p
                      className={`w-12 shrink-0 text-right text-lg font-semibold ${t.texto}`}
                    >
                      {a.pct}%
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Últimas por revisar</h2>
          <Link
            href="/admin/revision"
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            Ver todas
          </Link>
        </div>
        {colaPendiente.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">
            No hay evidencias pendientes. 🎉
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {colaPendiente.map((ev) => (
              <li
                key={ev.id}
                className="flex items-center justify-between gap-4 px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {ev.usuario.nombre}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {ev.categoria.nombre}
                  </p>
                </div>
                <Link
                  href="/admin/revision"
                  className="shrink-0 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100"
                >
                  Revisar
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
