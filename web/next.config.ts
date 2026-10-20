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
    ];
  },
};

export default nextConfig;
