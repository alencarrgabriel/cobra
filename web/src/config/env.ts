import "server-only";

import { parseEnv, serverEnvSchema, type ServerEnv } from "./env-schema";

let cached: ServerEnv | undefined;

/** Validated server configuration. Throws `EnvValidationError` on the first call if invalid. */
export function serverEnv(): ServerEnv {
  cached ??= parseEnv(serverEnvSchema, process.env);
  return cached;
}
