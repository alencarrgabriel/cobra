import path from "node:path";

import { loadEnvConfig } from "@next/env";

// Load the root `.env.test` (fake values) exactly as Next.js would with NODE_ENV=test.
loadEnvConfig(path.resolve(import.meta.dirname, "../.."), false, {
  info: () => {},
  error: console.error,
});
