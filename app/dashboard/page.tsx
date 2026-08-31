import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { EstadoBadge } from "@/components/EstadoBadge";
import { EvidenciaUploader } from "@/components/EvidenciaUploader";
import {
  categoriasRequeridas,
  cumplimientoEmpleado,
} from "@/lib/cumplimiento";
import { ESTADOS } from "@/lib/constants";

export default async function DashboardPage() {
  const user = await requireUser();

  const [categorias, assets, evidencias, exenciones] = await Promise.all([
    prisma.categoria.findMany({
      where: { activa: true },
      orderBy: { orden: "asc" },
      include: { recursos: { orderBy: { orden: "asc" } } },
    }),
    prisma.asset.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.evidencia.findMany({ where: { userId: user.id } }),
    prisma.exencionEvidencia.findMany({
      where: { userId: user.id },
      select: { categoriaId: true },
    }),
  ]);

  const evPorCategoria = new Map(evidencias.map((e) => [e.categoriaId, e]));
  const assetsPorCategoria = new Map<string, typeof assets>();
  for (const a of assets) {
    const list = assetsPorCategoria.get(a.categoriaId) ?? [];
    list.push(a);
    assetsPorCategoria.set(a.categoriaId, list);
  }

  // Las evidencias que el administrador marcó como "no aplica" para este
  // empleado no cuentan en su total ni en su porcentaje.
  const requeridas = categoriasRequeridas(
    categorias.filter((c) => c.requiereEvidencia).map((c) => c.id),
    exenciones,
  );
  const { total, aprobadas, pct } = cumplimientoEmpleado(requeridas, evidencias);

  return (
    <div className="min-h-dvh">
      <AppHeader nombre={user.name ?? "Empleado"} rol={user.role} />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">
            Hola, {(user.name ?? "").split(" ")[0] || "de nuevo"} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Descarga tus archivos de marca y sube tus evidencias de uso
            correcto.
          </p>
        </div>

        {/* Progreso */}
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              Tu cumplimiento
            </span>
            <span className="text-sm font-semibold text-slate-900">
              {total === 0
                ? "Sin evidencias por entregar"
                : `${aprobadas} de ${total} aprobadas`}
            </span>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {categorias.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Aún no hay categorías configuradas. Tu administrador las cargará
            pronto.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {categorias.map((cat) => {
              const ev = evPorCategoria.get(cat.id);
              const catAssets = assetsPorCategoria.get(cat.id) ?? [];
              const estado = ev?.estado ?? "SIN_SUBIR";
              // Pide evidencia y además le toca a este empleado.
              const pideEvidencia =
                cat.requiereEvidencia && requeridas.has(cat.id);
              const descargas = [
                ...cat.recursos.map((r) => ({
                  id: r.id,
                  nombre: r.nombre,
                  href: `/api/files/recurso/${r.id}?download=1`,
                })),
                ...catAssets.map((a) => ({
                  id: a.id,
                  nombre: a.nombre,
                  href: `/api/files/asset/${a.id}?download=1`,
                })),
              ];

              return (
                <section
                  key={cat.id}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-slate-900">
                        {cat.nombre}
                      </h2>
                      {cat.descripcion && (
                        <p className="mt-0.5 text-sm text-slate-500">
                          {cat.descripcion}
                        </p>
                      )}
                    </div>
                    {pideEvidencia ? (
                      <EstadoBadge estado={estado} />
                    ) : (
                      <span className="whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                        {cat.requiereEvidencia ? "No aplica" : "Solo descarga"}
                      </span>
                    )}
                  </div>

                  {/* Archivos para descargar */}
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Tus archivos de marca
                    </p>
                    {descargas.length === 0 ? (
                      <p className="text-sm text-slate-400">
                        Aún no hay archivos disponibles aquí.
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {descargas.map((d) => (
                          <li key={d.id}>
                            <a
                              href={d.href}
                              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:border-brand-300 hover:bg-brand-50/50"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                className="h-4 w-4 shrink-0 text-brand-500"
                                aria-hidden="true"
                              >
                                <path
                                  d="M12 4v10m0 0 3.5-3.5M12 14l-3.5-3.5M5 18h14"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              <span className="truncate">{d.nombre}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Zona de evidencia (solo si le aplica al empleado) */}
                  {pideEvidencia && (
                    <>
                      {estado === ESTADOS.RECHAZADA && ev?.comentarioRevision && (
                        <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">
                          <span className="font-medium">
                            Motivo del rechazo:{" "}
                          </span>
                          {ev.comentarioRevision}
                        </div>
                      )}

                      {ev && (
                        <p className="mt-4 text-sm">
                          <a
                            href={`/api/files/evidencia/${ev.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-brand-600 hover:underline"
                          >
                            Ver mi evidencia actual
                          </a>
                        </p>
                      )}

                      <div className="mt-auto pt-4">
                        <EvidenciaUploader
                          categoriaId={cat.id}
                          yaSubida={Boolean(ev)}
                        />
                      </div>
                    </>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
