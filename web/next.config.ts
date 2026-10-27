import type { NextConfig } from "next";

import { loadRootEnv } from "./src/config/root-env";
import { securityHeaders } from "./src/config/security-headers";

// Site and collectors share a single `.env` at the repository root.
loadRootEnv(__dirname);

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // Official photos go through the site's image proxy, so visitors never contact the
  // houses' servers (change busca-geografica, design D6). Only these addresses.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.camara.leg.br",
        port: "",
        pathname: "/internet/deputado/bandep/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "legis.senado.leg.br",
        port: "",
        pathname: "/senadores/fotos-oficiais/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "www.cl.df.gov.br",
        port: "",
        pathname: "/documents/**",
      },
    ],
    maximumRedirects: 0,
    minimumCacheTTL: 604800,
  },
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
