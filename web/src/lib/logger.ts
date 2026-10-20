import "server-only";

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;

export type LogLevel = keyof typeof LEVELS;
export type LogFields = Record<string, unknown>;

export type Logger = Record<
  LogLevel,
  (message: string, fields?: LogFields) => void
>;

type Sink = (line: string) => void;

/** Structured JSON logger: one line per event, filtered by minimum level (RNF-17). */
export function createLogger(
  minLevel: LogLevel,
  sink: Sink = (line) => console.log(line),
): Logger {
  const log =
    (level: LogLevel) =>
    (message: string, fields: LogFields = {}) => {
      if (LEVELS[level] < LEVELS[minLevel]) return;
      sink(
        JSON.stringify({
          time: new Date().toISOString(),
          level,
          message,
          ...fields,
        }),
      );
    };
  return {
    debug: log("debug"),
    info: log("info"),
    warn: log("warn"),
    error: log("error"),
  };
}

let shared: Logger | undefined;

/** Process-wide logger using `LOG_LEVEL` from the validated configuration. */
export async function logger(): Promise<Logger> {
  if (!shared) {
    const { serverEnv } = await import("@/config/env");
    shared = createLogger(serverEnv().LOG_LEVEL);
  }
  return shared;
}
