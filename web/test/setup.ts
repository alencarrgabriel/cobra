import path from "node:path";

import { loadRootEnv } from "../src/config/root-env";

// Load the root `.env.test` (fake values) exactly as the app would with NODE_ENV=test.
loadRootEnv(path.resolve(import.meta.dirname, ".."), "test");

// Unmount rendered components between tests (component tests run in jsdom).
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());
