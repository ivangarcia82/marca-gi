import { Logo } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-gradient-to-b from-slate-50 to-indigo-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
          <h1 className="text-lg font-semibold text-slate-900">
            Bienvenido de nuevo
          </h1>
          <p className="mb-6 mt-1 text-sm text-slate-500">
            Ingresa para gestionar tu marca.
          </p>
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          ¿Problemas para entrar? Contacta a tu administrador.
        </p>
      </div>
    </main>
  );
}
