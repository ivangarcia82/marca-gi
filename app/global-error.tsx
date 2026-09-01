"use client"; // Los error boundaries tienen que ser Client Components.

// Última red de seguridad: sustituye al layout raíz, así que no puede dar por
// hecho que las hojas de estilo de la app estén cargadas. Todo va en línea.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "2.5rem 1rem",
          background: "#f6f7f8",
          color: "#2e3033",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <title>Algo salió mal · Marca Generando Ideas</title>

        <div
          style={{
            width: "100%",
            maxWidth: "28rem",
            borderRadius: "1rem",
            border: "1px solid #e2e8f0",
            background: "#fff",
            padding: "2rem",
            textAlign: "center",
            boxShadow: "0 20px 25px -5px rgb(148 163 184 / 0.25)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/gi-logo-horizontal.svg"
            alt="Generando Ideas"
            style={{ height: "2rem", width: "auto", marginBottom: "1.5rem" }}
          />

          <h1 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>
            No pudimos cargar la página
          </h1>
          <p
            style={{
              margin: "0.5rem 0 1.5rem",
              fontSize: "0.875rem",
              color: "#64748b",
            }}
          >
            Ocurrió un error inesperado. Vuelve a intentarlo; si continúa,
            recarga la página o contacta a tu administrador.
          </p>

          <button
            type="button"
            onClick={() => unstable_retry()}
            style={{
              borderRadius: "0.5rem",
              border: "none",
              background: "#ff8300",
              color: "#fff",
              padding: "0.625rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>

          {error.digest && (
            <p
              style={{
                marginTop: "1.5rem",
                marginBottom: 0,
                fontSize: "0.6875rem",
                color: "#94a3b8",
              }}
            >
              Código de referencia: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
