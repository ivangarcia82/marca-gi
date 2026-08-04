import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Permite subir capturas/assets de hasta 10 MB por Server Action.
    // Debe coincidir con MAX_FILE_BYTES en lib/constants.ts.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
