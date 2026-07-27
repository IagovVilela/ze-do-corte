/**
 * Observabilidade leve — logs estruturados + Sentry quando houver DSN.
 */

import * as Sentry from "@sentry/nextjs";

type LogFields = Record<string, string | number | boolean | null | undefined>;

function line(
  level: "info" | "warn" | "error",
  msg: string,
  fields?: LogFields,
) {
  const payload = {
    level,
    msg,
    ts: new Date().toISOString(),
    ...fields,
  };
  const text = JSON.stringify(payload);
  if (level === "error") console.error(text);
  else if (level === "warn") console.warn(text);
  else console.info(text);
}

export function logInfo(msg: string, fields?: LogFields) {
  line("info", msg, fields);
}

export function logWarn(msg: string, fields?: LogFields) {
  line("warn", msg, fields);
}

export function logError(msg: string, fields?: LogFields) {
  line("error", msg, fields);
}

/** Captura exceção no console e no Sentry (se `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`). */
export function captureException(err: unknown, context?: LogFields) {
  const message =
    err instanceof Error ? err.message : typeof err === "string" ? err : "error";
  logError(message, {
    ...context,
    stack: err instanceof Error ? err.stack?.slice(0, 2000) : undefined,
  });

  if (context && Object.keys(context).length > 0) {
    Sentry.withScope((scope) => {
      for (const [key, value] of Object.entries(context)) {
        if (value !== undefined) scope.setExtra(key, value);
      }
      Sentry.captureException(err);
    });
    return;
  }

  Sentry.captureException(err);
}
