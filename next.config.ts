import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Un poco por encima de MAX_FILE_BYTES (4 MB) para que quien valide sea
    // nuestro código —con mensaje claro— y no el parser de Next, que ante un
    // cuerpo cortado revienta con un 500 opaco.
    //
    // Subirlo más no sirve: en Vercel la plataforma corta en 4.5 MB. Las
    // evidencias no pasan por aquí, van directas a Blob desde el navegador
    // (app/api/evidencias/subida) y por eso admiten hasta MAX_EVIDENCIA_BYTES.
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
