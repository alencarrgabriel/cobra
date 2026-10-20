// Node.js-only startup checks: fail fast on invalid configuration.
import { serverEnv } from "./config/env";

try {
  serverEnv();
} catch (error) {
  // The message lists variable names only, never values.
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
