import path from "node:path";

import { loadRootEnv } from "../src/config/root-env";

// Load the root `.env.test` (fake values) exactly as the app would with NODE_ENV=test.
loadRootEnv(path.resolve(import.meta.dirname, ".."), "test");
