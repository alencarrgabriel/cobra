import type { NextConfig } from "next";

import { loadRootEnv } from "./src/config/root-env";
import { securityHeaders } from "./src/config/security-headers";

// Site and collectors share a single `.env` at the repository root.
loadRootEnv(__dirname);

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders(process.env.NODE_ENV === "development"),
      },
      {
        // Street map, glyphs and icons change only with a new extract (docs/mapa.md).
        source: "/mapa/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
    ];
  },
};

export default nextConfig;
