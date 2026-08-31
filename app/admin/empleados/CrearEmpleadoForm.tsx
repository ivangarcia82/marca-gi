"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { crearEmpleadoAction, type EmpleadoState } from "./actions";

const initial: EmpleadoState = {};

function passwordAleatoria() {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function CrearEmpleadoForm({ areas }: { areas: string[] }) {
  const [state, formAction, pending] = useActionState(
    crearEmpleadoAction,
    initial,
  );
  const [password, setPassword] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setPassword("");
    }
  }, [state.ok]);

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Nombre completo
          </label>
          <input name="nombre" required className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Correo
          </label>
          <input name="email" type="email" required className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Cargo
          </label>
          <input name="cargo" className={inputCls} placeholder="Opcional" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Área
          </label>
          {/* Lista abierta: sugiere las áreas ya usadas sin impedir crear una nueva. */}
          <input
            name="area"
            list="areas-existentes"
            className={inputCls}
            placeholder="Opcional"
          />
          <datalist id="areas-existentes">
            {areas.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Contraseña temporal
          </label>
          <div className="flex gap-2">
            <input
              name="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => setPassword(passwordAleatoria())}
              className="shrink-0 rounded-lg border border-slate-300 px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Generar
            </button>
          </div>
        </div>
      </div>

      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state.ok && (
        <p className="text-sm text-emerald-600">Empleado creado correctamente.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Creando…" : "Agregar empleado"}
      </button>
    </form>
  );
}
