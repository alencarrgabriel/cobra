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
});

/**
 * Variables inlined into the browser bundle at build time. Only `NEXT_PUBLIC_*`.
 * Empty for now.
 */
export const publicEnvSchema = z.object({});

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
