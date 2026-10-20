import path from "node:path";

import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

import { securityHeaders } from "./src/config/security-headers";

// Site and collectors share a single `.env` at the repository root.
loadEnvConfig(path.resolve(__dirname, ".."));

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
