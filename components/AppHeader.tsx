import { Logo } from "./Logo";
import { SignOutButton } from "./SignOutButton";

export function AppHeader({
  nombre,
  rol,
}: {
  nombre: string;
  rol?: string;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Logo />
        <div className="flex items-center gap-3">
          <span className="hidden text-right text-sm leading-tight sm:block">
            <span className="block font-medium text-slate-800">{nombre}</span>
            {rol && (
              <span className="block text-[11px] text-slate-500">
                {rol === "ADMIN" ? "Administrador" : "Empleado"}
              </span>
            )}
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
