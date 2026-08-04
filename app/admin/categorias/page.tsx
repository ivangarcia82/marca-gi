import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/constants";
import { CrearCategoriaForm } from "./CrearCategoriaForm";
import { CategoriaEditor } from "./CategoriaEditor";
import { AsignarAssetBulkForm } from "./AsignarAssetBulkForm";
import { RecursoGlobalForm } from "./RecursoGlobalForm";
import {
  toggleCategoriaActivaAction,
  toggleRequiereEvidenciaAction,
  moverCategoriaAction,
  eliminarCategoriaAction,
  eliminarRecursoGlobalAction,
} from "./actions";

export default async function CategoriasPage() {
  const [categorias, empleados] = await Promise.all([
    prisma.categoria.findMany({
      orderBy: { orden: "asc" },
      include: {
        recursos: { orderBy: { orden: "asc" } },
        _count: { select: { assets: true, evidencias: true, recursos: true } },
      },
    }),
    prisma.usuario.findMany({
      where: { rol: ROLES.EMPLEADO, activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Categorías</h1>
      <p className="mt-1 text-sm text-slate-500">
        Define qué evidencias deben subir tus empleados.
      </p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-900">Nueva categoría</h2>
        <CrearCategoriaForm />
      </div>

      <div className="mt-8 space-y-4">
        {categorias.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-400">
            No hay categorías. Crea la primera arriba.
          </p>
        ) : (
          categorias.map((cat, i) => (
            <section
              key={cat.id}
              className={`rounded-2xl border bg-white p-5 shadow-sm ${
                cat.activa ? "border-slate-200" : "border-slate-200 opacity-70"
              }`}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                      cat.activa
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {cat.activa ? "Activa" : "Inactiva"}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                      cat.requiereEvidencia
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {cat.requiereEvidencia ? "Pide evidencia" : "Solo descarga"}
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {cat._count.recursos} compartido(s) · {cat._count.assets}{" "}
                  personal(es) · {cat._count.evidencias} evidencia(s)
                </span>
              </div>

              <CategoriaEditor
                id={cat.id}
                nombre={cat.nombre}
                descripcion={cat.descripcion}
              />

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <form action={moverCategoriaAction}>
                  <input type="hidden" name="id" value={cat.id} />
                  <input type="hidden" name="dir" value="arriba" />
                  <button
                    type="submit"
                    disabled={i === 0}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    ↑ Subir
                  </button>
                </form>
                <form action={moverCategoriaAction}>
                  <input type="hidden" name="id" value={cat.id} />
                  <input type="hidden" name="dir" value="abajo" />
                  <button
                    type="submit"
                    disabled={i === categorias.length - 1}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    ↓ Bajar
                  </button>
                </form>
                <form action={toggleCategoriaActivaAction}>
                  <input type="hidden" name="id" value={cat.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    {cat.activa ? "Desactivar" : "Activar"}
                  </button>
                </form>
                <form action={toggleRequiereEvidenciaAction}>
                  <input type="hidden" name="id" value={cat.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    {cat.requiereEvidencia
                      ? "Quitar evidencia"
                      : "Pedir evidencia"}
                  </button>
                </form>
              </div>

              {/* Recursos compartidos (para todos) */}
              <details className="mt-4 rounded-lg bg-indigo-50/50 p-3">
                <summary className="cursor-pointer text-sm font-medium text-indigo-700">
                  Recursos compartidos ({cat._count.recursos})
                </summary>
                <div className="mt-3 space-y-3">
                  {cat.recursos.length > 0 && (
                    <ul className="space-y-1.5">
                      {cat.recursos.map((r) => (
                        <li
                          key={r.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                        >
                          <a
                            href={`/api/files/recurso/${r.id}?download=1`}
                            className="min-w-0 flex-1 truncate text-slate-700 hover:text-indigo-600"
                          >
                            {r.nombre}
                          </a>
                          <form action={eliminarRecursoGlobalAction}>
                            <input type="hidden" name="recursoId" value={r.id} />
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
                  <RecursoGlobalForm categoriaId={cat.id} />
                </div>
              </details>

              <details className="mt-4 rounded-lg bg-slate-50 p-3">
                <summary className="cursor-pointer text-sm font-medium text-slate-700">
                  Asignar archivo a varios empleados
                </summary>
                <div className="mt-3">
                  <AsignarAssetBulkForm
                    categoriaId={cat.id}
                    empleados={empleados}
                  />
                </div>
              </details>

              <details className="mt-2 rounded-lg p-3">
                <summary className="cursor-pointer text-sm font-medium text-rose-600">
                  Eliminar categoría
                </summary>
                <div className="mt-2 rounded-lg bg-rose-50 p-3">
                  <p className="mb-2 text-xs text-rose-700">
                    Esto eliminará la categoría junto con sus{" "}
                    {cat._count.assets} archivo(s) y {cat._count.evidencias}{" "}
                    evidencia(s). No se puede deshacer.
                  </p>
                  <form action={eliminarCategoriaAction}>
                    <input type="hidden" name="id" value={cat.id} />
                    <button
                      type="submit"
                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
                    >
                      Sí, eliminar definitivamente
                    </button>
                  </form>
                </div>
              </details>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
