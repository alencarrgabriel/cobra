// Scans the working tree for exposed credentials with gitleaks (via Docker),
// using the same image and config as CI. Usage: pnpm check:secrets
import { spawnSync } from "node:child_process";

const GITLEAKS_IMAGE = "ghcr.io/gitleaks/gitleaks:v8.30.1";
const repo = process.cwd();

const result = spawnSync(
  "docker",
  [
    "run", "--rm",
    "-v", `${repo}:/repo`,
    GITLEAKS_IMAGE,
    "dir", "/repo",
    "--config", "/repo/.gitleaks.toml",
    "--redact", "--no-banner", "--verbose",
  ],
  { stdio: "inherit" },
);

if (result.error) {
  console.error(`Could not run Docker (${result.error.message}). Is Docker running?`);
  process.exit(1);
}
process.exit(result.status ?? 1);
