import "server-only";

import { parseEnv, serverEnvSchema, type ServerEnv } from "./env-schema";
import { loadRootEnv } from "./root-env";

let cached: ServerEnv | undefined;

/** Validated server configuration. Throws `EnvValidationError` on the first call if invalid. */
export function serverEnv(): ServerEnv {
  if (!cached) {
    // The server process does not inherit what next.config.ts loaded, so load the root .env here too.
    loadRootEnv(process.cwd());
    cached = parseEnv(serverEnvSchema, process.env);
  }
  return cached;
}
