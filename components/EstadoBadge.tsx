import { ESTADO_LABEL } from "@/lib/constants";

const STYLES: Record<string, string> = {
  PENDIENTE: "bg-amber-100 text-amber-800 ring-amber-200",
  APROBADA: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  RECHAZADA: "bg-rose-100 text-rose-800 ring-rose-200",
  SIN_SUBIR: "bg-slate-100 text-slate-600 ring-slate-200",
};

const DOT: Record<string, string> = {
  PENDIENTE: "bg-amber-500",
  APROBADA: "bg-emerald-500",
  RECHAZADA: "bg-rose-500",
  SIN_SUBIR: "bg-slate-400",
};

export function EstadoBadge({ estado }: { estado: string }) {
  const key = estado in STYLES ? estado : "SIN_SUBIR";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STYLES[key]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[key]}`} />
      {ESTADO_LABEL[key]}
    </span>
  );
}
