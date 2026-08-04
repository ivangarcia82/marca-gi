import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/constants";
import { EstadoBadge } from "@/components/EstadoBadge";
import { RevisarEvidencia } from "@/components/RevisarEvidencia";
import { SubirAssetForm } from "./SubirAssetForm";
import { ResetPasswordForm } from "./ResetPasswordForm";
import {
  toggleEmpleadoActivoAction,
  eliminarAssetAction,
} from "../actions";

export default async function EmpleadoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [usuario, categoriasActivas] = await Promise.all([
    prisma.usuario.findUnique({
      where: { id },
      include: {
        assets: { include: { categoria: true }, orderBy: { createdAt: "asc" } },
        evidencias: { include: { categoria: true } },
      },
    }),
    prisma.categoria.findMany({
      where: { activa: true },
      orderBy: { orden: "asc" },
    }),
  ]);

  if (!usuario || usuario.rol === ROLES.ADMIN) notFound();

  const evPorCat = new Map(usuario.evidencias.map((e) => [e.categoriaId, e]));
  const assetsPorCat = new Map<string, typeof usuario.assets>();
  for (const a of usuario.assets) {
    const list = assetsPorCat.get(a.categoriaId) ?? [];
    list.push(a);
    assetsPorCat.set(a.categoriaId, list);
  }

  // Categorías activas + cualquiera con datos previos (aunque esté inactiva).
  const relevantes = new Map<
    string,
    {
      id: string;
      nombre: string;
      activa: boolean;
      orden: number;
      requiereEvidencia: boolean;
    }
  >();
  for (const c of categoriasActivas) relevantes.set(c.id, c);
  for (const a of usuario.assets)
    if (!relevantes.has(a.categoriaId)) relevantes.set(a.categoriaId, a.categoria);
  for (const e of usuario.evidencias)
    if (!relevantes.has(e.categoriaId)) relevantes.set(e.categoriaId, e.categoria);
  // Muestra una categoría solo si pide evidencia o si el empleado tiene algo
  // personal en ella (evita listar recursos globales como "sin evidencia").
  const listaCategorias = [...relevantes.values()]
    .filter(
      (c) =>
        c.requiereEvidencia ||
        (assetsPorCat.get(c.id)?.length ?? 0) > 0 ||
        evPorCat.has(c.id),
    )
    .sort((a, b) => a.orden - b.orden);

  return (
    <div>
      <Link
        href="/admin/empleados"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
          <path
            d="m15 6-6 6 6 6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Empleados
      </Link>

      {/* Encabezado del empleado */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-100 text-lg font-semibold text-brand-700">
              {usuario.nombre.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                {usuario.nombre}
                {!usuario.activo && (
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    Inactivo
                  </span>
                )}
              </h1>
              <p className="text-sm text-slate-500">
                {usuario.email}
                {usuario.cargo ? ` · ${usuario.cargo}` : ""}
              </p>
            </div>
          </div>

          <form action={toggleEmpleadoActivoAction}>
            <input type="hidden" name="userId" value={usuario.id} />
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {usuario.activo ? "Desactivar" : "Reactivar"}
            </button>
          </form>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <ResetPasswordForm userId={usuario.id} />
        </div>
      </div>

      {/* Agregar archivo de marca */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 font-semibold text-slate-900">
          Agregar archivo de marca
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          Sube la firma, fondos u otros archivos que este empleado podrá descargar.
        </p>
        {categoriasActivas.length === 0 ? (
          <p className="text-sm text-slate-400">
            Primero crea al menos una categoría activa.
          </p>
        ) : (
          <SubirAssetForm userId={usuario.id} categorias={categoriasActivas} />
        )}
      </div>

      {/* Categorías: archivos + evidencia */}
      <div className="mt-6 space-y-4">
        {listaCategorias.map((cat) => {
          const ev = evPorCat.get(cat.id);
          const catAssets = assetsPorCat.get(cat.id) ?? [];
          return (
            <section
              key={cat.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-slate-900">
                  {cat.nombre}
                  {!cat.activa && (
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      (categoría inactiva)
                    </span>
                  )}
                </h3>
                {cat.requiereEvidencia ? (
                  <EstadoBadge estado={ev?.estado ?? "SIN_SUBIR"} />
                ) : (
                  <span className="whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                    Solo descarga
                  </span>
                )}
              </div>

              <div
                className={`mt-4 grid gap-5 ${
                  cat.requiereEvidencia ? "md:grid-cols-2" : ""
                }`}
              >
                {/* Archivos asignados */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Archivos asignados
                  </p>
                  {catAssets.length === 0 ? (
                    <p className="text-sm text-slate-400">Ninguno todavía.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {catAssets.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        >
                          <a
                            href={`/api/files/asset/${a.id}?download=1`}
                            className="min-w-0 flex-1 truncate text-slate-700 hover:text-brand-600"
                          >
                            {a.nombre}
                          </a>
                          <form action={eliminarAssetAction}>
                            <input type="hidden" name="assetId" value={a.id} />
                            <button
                              type="submit"
                              className="text-xs font-medium text-rose-500 hover:text-rose-700"
                            >
                              Eliminar
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Evidencia del empleado (solo si la categoría la pide) */}
                {cat.requiereEvidencia && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Evidencia
                  </p>
                  {!ev ? (
                    <p className="text-sm text-slate-400">
                      El empleado aún no ha subido evidencia.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <a
                        href={`/api/files/evidencia/${ev.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="block overflow-hidden rounded-lg border border-slate-200"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/files/evidencia/${ev.id}`}
                          alt={`Evidencia de ${cat.nombre}`}
                          className="max-h-40 w-full object-cover"
                        />
                      </a>
                      {ev.comentarioRevision && (
                        <p className="text-xs text-slate-500">
                          <span className="font-medium">Comentario:</span>{" "}
                          {ev.comentarioRevision}
                        </p>
                      )}
                      <RevisarEvidencia evidenciaId={ev.id} />
                    </div>
                  )}
                </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
