export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white shadow-sm">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path
            d="M12 3a6 6 0 0 0-3.6 10.8c.5.38.85.9 1 1.5l.2.9h4.8l.2-.9c.15-.6.5-1.12 1-1.5A6 6 0 0 0 12 3Z"
            fill="currentColor"
          />
          <path
            d="M9.5 19.5h5M10 21.5h4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="text-sm font-semibold leading-tight text-slate-900">
        Generando Ideas
        <span className="block text-[11px] font-medium text-slate-500">
          Gestión de marca
        </span>
      </span>
    </span>
  );
}
