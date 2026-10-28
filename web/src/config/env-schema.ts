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
  // Claude API key for AI drafts of vote summaries in the editorial panel, server only.
  // Optional: without it the panel has no "Gerar rascunho com IA" (change rascunho-ia).
  ANTHROPIC_API_KEY: z.string().min(20).optional(),
  // E-mail alerts (change alertas-cadastro), server only. Without ALERTS_DATABASE_URL and
  // ALERTS_SECRET the sign-up says it is unavailable.
  ALERTS_DATABASE_URL: z
    .string()
    .regex(/^postgres(ql)?:\/\//, "must be a postgres:// URL")
    .optional(),
  // 32 random bytes in base64: encrypts e-mails and preferences and signs tokens.
  ALERTS_SECRET: z
    .string()
    .refine(
      (v) => Buffer.from(v, "base64").length === 32,
      "must be 32 bytes in base64",
    )
    .optional(),
  // Resend API key. Without it, outside production, messages go to alerts.outbox_local.
  RESEND_API_KEY: z.string().startsWith("re_").optional(),
  // Sender of the alert messages, e.g. "Cobra <alertas@example.org>" (verified domain).
  ALERTS_FROM: z.string().min(3).default("Cobra <alertas@localhost>"),
  // Most alert e-mails per day in total; the Resend free plan sends 100 per day.
  ALERTS_DAILY_CAP: z.coerce.number().int().positive().default(80),
  // Bearer secret of the weekly summary trigger (change resumo-semanal). Without it the
  // trigger route answers 404.
  CRON_SECRET: z.string().min(24).optional(),
  // Team address for the daily integrations alert (change saude-integracoes). Without it
  // the alert only goes to the log.
  OPS_ALERT_EMAIL: z.email().optional(),
  // Connection of the public report form (role cobra_reports, change reporte-de-erro), server
  // only. Without it the form says it is unavailable.
  REPORTS_DATABASE_URL: z
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
