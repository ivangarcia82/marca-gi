import { prisma } from "@/lib/prisma";
import { ESTADOS } from "@/lib/constants";
import { RevisarEvidencia } from "@/components/RevisarEvidencia";

export default async function RevisionPage() {
  const pendientes = await prisma.evidencia.findMany({
    where: { estado: ESTADOS.PENDIENTE },
    include: { usuario: true, categoria: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">
        Bandeja de revisión
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {pendientes.length === 0
          ? "No hay evidencias pendientes."
          : `${pendientes.length} evidencia(s) esperando tu revisión.`}
      </p>

      {pendientes.length === 0 ? (
        <div className="mt-8 grid place-items-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-4xl">🎉</p>
          <p className="mt-2 text-sm text-slate-500">
            ¡Todo al día! No hay nada por revisar.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pendientes.map((ev) => (
            <div
              key={ev.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <a
                href={`/api/files/evidencia/${ev.id}`}
                target="_blank"
                rel="noreferrer"
                className="block bg-slate-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/files/evidencia/${ev.id}`}
                  alt={`Evidencia de ${ev.usuario.nombre}`}
                  className="h-44 w-full object-cover"
                />
              </a>

              <div className="flex flex-1 flex-col p-4">
                <p className="text-sm font-semibold text-slate-800">
                  {ev.usuario.nombre}
                </p>
                <p className="text-xs text-slate-500">{ev.categoria.nombre}</p>

                <div className="mt-3 flex-1" />
                <RevisarEvidencia evidenciaId={ev.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
