import { z } from "zod";

/**
 * Server-only variables. Never import these from client components.
 * Every key here must also be documented in the repository root `.env.example`.
 */
export const serverEnvSchema = z.object({
  APP_ENV: z.enum(["development", "test", "production"]),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  APP_COMMIT_SHA: z
    .string()
    .regex(/^[0-9a-f]{7,40}$/, "must be a git commit SHA")
    .optional(),
  // Read-only connection to the Cobra database. Optional: without it the site stays up
  // and data pages explain that data is unavailable (spec obras-na-cidade).
  WEB_DATABASE_URL: z
    .string()
    .regex(/^postgres(ql)?:\/\//, "must be a postgres:// URL")
    .optional(),
  // Public address of the site, used in link previews and on share cards (change
  // compartilhamento). Optional: defaults to http://localhost:3000.
  SITE_URL: z.url({ protocol: /^https?$/ }).optional(),
  // Connection of the editorial panel (role cobra_editor), server only. Optional: without it
  // the panel says it is unavailable (change painel-editorial).
  EDITOR_DATABASE_URL: z
    .string()
    .regex(/^postgres(ql)?:\/\//, "must be a postgres:// URL")
    .optional(),
});

/**
 * Variables inlined into the browser bundle at build time. Only `NEXT_PUBLIC_*`.
 * The Supabase address and publishable key are public by design; they only let the editorial
 * panel sign editors in (change painel-editorial). Optional: without them the panel is off.
 */
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({ protocol: /^https?$/ }).optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export class EnvValidationError extends Error {
  readonly variables: string[];

  constructor(problems: { variable: string; problem: string }[]) {
    // Names and problems only: values are never echoed, as they may be secrets.
    const lines = problems.map((p) => `  - ${p.variable}: ${p.problem}`);
    super(`Invalid environment configuration:\n${lines.join("\n")}`);
    this.name = "EnvValidationError";
    this.variables = problems.map((p) => p.variable);
  }
}

function describeIssue(
  issue: z.core.$ZodIssue,
  source: Record<string, string | undefined>,
): string {
  const variable = String(issue.path[0]);
  if (source[variable] === undefined || source[variable] === "")
    return "is required";
  if (issue.code === "invalid_value") return "is not one of the allowed values";
  return "has an invalid format";
}

export function parseEnv<T extends z.ZodObject>(
  schema: T,
  source: Record<string, string | undefined>,
): z.infer<T> {
  // Treat empty strings as unset so `.env` placeholders like `FOO=` count as missing.
  const cleaned = Object.fromEntries(
    Object.entries(source).filter(
      ([, value]) => value !== undefined && value !== "",
    ),
  );
  const result = schema.safeParse(cleaned);
  if (result.success) return result.data;
  throw new EnvValidationError(
    result.error.issues.map((issue) => ({
      variable: String(issue.path[0]),
      problem: describeIssue(issue, source),
    })),
  );
}
