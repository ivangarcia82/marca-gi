"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import {
  registrarEvidenciaAction,
  subirEvidenciaAction,
  type UploadState,
} from "@/app/dashboard/actions";
import { MAX_EVIDENCIA_BYTES, avisoTamano, enMB } from "@/lib/constants";

const initial: UploadState = {};
const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

// A partir de aquí Blob parte el archivo y sube los trozos en paralelo.
const UMBRAL_MULTIPART = 8 * 1024 * 1024;

const RUTA_SUBIDA = "/api/evidencias/subida";

/**
 * `upload()` esconde por qué el servidor negó la subida: lo envuelve todo en
 * "Failed to retrieve the client token". Cuando pasa eso, se le vuelve a
 * preguntar a la ruta para poder mostrar el motivo de verdad.
 */
async function motivoDelRechazo(
  ruta: string,
  categoriaId: string,
): Promise<string | null> {
  try {
    const res = await fetch(RUTA_SUBIDA, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "blob.generate-client-token",
        payload: {
          pathname: ruta,
          multipart: false,
          clientPayload: JSON.stringify({ categoriaId }),
        },
      }),
    });
    if (res.ok) return null;
    const { error } = await res.json();
    return typeof error === "string" ? error : null;
  } catch {
    return null;
  }
}

export function EvidenciaUploader({
  categoriaId,
  yaSubida,
  subidaDirecta,
  userId,
}: {
  categoriaId: string;
  yaSubida: boolean;
  /** Con Vercel Blob activo el navegador sube directo, sin tope de 4.5 MB. */
  subidaDirecta: boolean;
  /** Carpeta destino en Blob; el servidor solo firma esta ruta. */
  userId: string;
}) {
  return subidaDirecta ? (
    <UploaderDirecto
      categoriaId={categoriaId}
      yaSubida={yaSubida}
      userId={userId}
    />
  ) : (
    <UploaderPorServidor categoriaId={categoriaId} yaSubida={yaSubida} />
  );
}

/** Sube el archivo del navegador a Vercel Blob y luego lo registra. */
function UploaderDirecto({
  categoriaId,
  yaSubida,
  userId,
}: {
  categoriaId: string;
  yaSubida: boolean;
  userId: string;
}) {
  const router = useRouter();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [estado, setEstado] = useState<UploadState>(initial);
  const [progreso, setProgreso] = useState<number | null>(null);
  const [registrando, iniciarRegistro] = useTransition();
  const enCurso = progreso !== null || registrando;

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!archivo) return;

    if (archivo.size > MAX_EVIDENCIA_BYTES) {
      setEstado({
        error: `La imagen supera el máximo de ${enMB(MAX_EVIDENCIA_BYTES)}.`,
      });
      return;
    }

    setEstado(initial);
    setProgreso(0);
    const nombre = archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const ruta = `evidencias/${userId}/${nombre}`;
    try {
      const blob = await upload(ruta, archivo, {
        access: "private",
        handleUploadUrl: RUTA_SUBIDA,
        clientPayload: JSON.stringify({ categoriaId }),
        contentType: archivo.type,
        multipart: archivo.size > UMBRAL_MULTIPART,
        onUploadProgress: ({ percentage }) => setProgreso(percentage),
      });

      iniciarRegistro(async () => {
        const resultado = await registrarEvidenciaAction(categoriaId, blob.url);
        setEstado(resultado);
        if (resultado.ok) {
          setArchivo(null);
          router.refresh();
        }
      });
    } catch (error) {
      const mensaje = (error as Error).message ?? "";
      console.error("Fallo al subir la evidencia:", mensaje);
      const motivo = /client token/i.test(mensaje)
        ? await motivoDelRechazo(ruta, categoriaId)
        : null;
      setEstado({
        error:
          motivo ??
          "No se pudo subir la imagen. Vuelve a intentarlo; si sigue fallando, avisa al administrador.",
      });
    } finally {
      setProgreso(null);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-2">
      <SelectorArchivo
        nombreArchivo={archivo?.name ?? null}
        onSeleccion={(f) => {
          setArchivo(f);
          setEstado(initial);
        }}
      />

      {progreso !== null && (
        <div
          className="h-1 overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-valuenow={Math.round(progreso)}
        >
          <div
            className="h-full bg-brand-600 transition-[width]"
            style={{ width: `${progreso}%` }}
          />
        </div>
      )}

      <Mensajes estado={estado} pending={enCurso} />

      <BotonEnviar
        disabled={enCurso || !archivo}
        yaSubida={yaSubida}
        etiquetaEnCurso={
          progreso !== null ? `Subiendo… ${Math.round(progreso)}%` : "Enviando…"
        }
        enCurso={enCurso}
      />
    </form>
  );
}

/**
 * Camino de respaldo sin Vercel Blob (local): el archivo viaja por el server
 * action, con el tope de MAX_FILE_BYTES que valida la propia acción.
 */
function UploaderPorServidor({
  categoriaId,
  yaSubida,
}: {
  categoriaId: string;
  yaSubida: boolean;
}) {
  const [estado, formAction, pending] = useActionState(
    subirEvidenciaAction,
    initial,
  );
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  // Pasado el tope, la petición muere en el parser de Next y el error de la
  // acción nunca llega: hay que avisar antes de enviar.
  const [errorTamano, setErrorTamano] = useState<string | null>(null);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="categoriaId" value={categoriaId} />

      <SelectorArchivo
        nombreArchivo={nombreArchivo}
        onSeleccion={(f) => {
          setNombreArchivo(f?.name ?? null);
          setErrorTamano(f ? avisoTamano(f.size) : null);
        }}
      />

      <Mensajes
        estado={errorTamano ? { error: errorTamano } : estado}
        pending={pending}
      />

      <BotonEnviar
        disabled={pending || !nombreArchivo || Boolean(errorTamano)}
        yaSubida={yaSubida}
        etiquetaEnCurso="Enviando…"
        enCurso={pending}
      />
    </form>
  );
}

function SelectorArchivo({
  nombreArchivo,
  onSeleccion,
}: {
  nombreArchivo: string | null;
  onSeleccion: (archivo: File | null) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 transition hover:border-brand-400 hover:bg-brand-50/40">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-4 w-4 text-slate-400"
        aria-hidden="true"
      >
        <path
          d="M12 16V4m0 0 4 4m-4-4L8 8M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="truncate">{nombreArchivo ?? "Elegir captura…"}</span>
      <input
        type="file"
        name="archivo"
        accept={ACCEPT}
        required
        className="sr-only"
        onChange={(e) => onSeleccion(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}

function Mensajes({
  estado,
  pending,
}: {
  estado: UploadState;
  pending: boolean;
}) {
  return (
    <>
      {estado.error && <p className="text-xs text-rose-600">{estado.error}</p>}
      {estado.ok && !pending && (
        <p className="text-xs text-emerald-600">
          ¡Evidencia enviada! Queda pendiente de revisión.
        </p>
      )}
    </>
  );
}

function BotonEnviar({
  disabled,
  yaSubida,
  etiquetaEnCurso,
  enCurso,
}: {
  disabled: boolean;
  yaSubida: boolean;
  etiquetaEnCurso: string;
  enCurso: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {enCurso
        ? etiquetaEnCurso
        : yaSubida
          ? "Reemplazar evidencia"
          : "Enviar evidencia"}
    </button>
  );
}
