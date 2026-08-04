export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Logo oficial de Generando Ideas (public/brand/gi-logo-horizontal.svg) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/gi-logo-horizontal.svg"
        alt="Generando Ideas"
        className="h-7 w-auto sm:h-8"
      />
      <span className="hidden border-l border-slate-200 pl-2.5 text-[11px] font-medium leading-tight text-slate-500 sm:block">
        Gestión
        <span className="block">de marca</span>
      </span>
    </span>
  );
}
