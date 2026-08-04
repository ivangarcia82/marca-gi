import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ESTADOS, ROLES } from "@/lib/constants";

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

export default async function AdminResumenPage() {
  const [empleadosActivos, categoriasActivas, pendientes, aprobadas, colaPendiente] =
    await Promise.all([
      prisma.usuario.count({ where: { rol: ROLES.EMPLEADO, activo: true } }),
      prisma.categoria.count({
        where: { activa: true, requiereEvidencia: true },
      }),
      prisma.evidencia.count({ where: { estado: ESTADOS.PENDIENTE } }),
      prisma.evidencia.count({ where: { estado: ESTADOS.APROBADA } }),
      prisma.evidencia.findMany({
        where: { estado: ESTADOS.PENDIENTE },
        include: { usuario: true, categoria: true },
        orderBy: { createdAt: "asc" },
        take: 5,
      }),
    ]);

  const objetivo = empleadosActivos * categoriasActivas;
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
