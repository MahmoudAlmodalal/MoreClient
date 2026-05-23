import * as Sentry from "@sentry/nextjs";
import { logger } from "./logger";

let initialised = false;

export function initialiseSentry() {
  if (initialised) return;
  initialised = true;

  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    logger.warn("Sentry DSN not set — error tracking disabled");
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
    enabled: process.env.NODE_ENV === "production",
  });
}

/** Capture an exception in Sentry and log it locally. */
export function captureException(
  err: unknown,
  context?: Record<string, unknown>,
): void {
  logger.error({ err, context }, "Captured exception");

  if (process.env.NODE_ENV === "production") {
    Sentry.captureException(err, { extra: context });
  }
}

/** Capture a message in Sentry. */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info",
  context?: Record<string, unknown>,
): void {
  Sentry.captureMessage(message, { level, extra: context });
}
