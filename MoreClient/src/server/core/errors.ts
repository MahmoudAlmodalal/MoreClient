import { generateId } from "./ids";

export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNPROCESSABLE"
  | "RATE_LIMITED"
  | "QUOTA_EXCEEDED"
  | "INTERNAL"
  | "BAD_REQUEST"
  | "SERVICE_UNAVAILABLE"
  | string;

/**
 * Application-level error carrying HTTP status and a machine-readable code.
 * Serialised as RFC 7807 problem+json on the wire.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly requestId: string;
  readonly meta?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    status = 500,
    meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.requestId = generateId();
    this.meta = meta;
  }
}

/** Build an RFC 7807 problem+json response body. */
export function toProblemJson(
  err: AppError,
  instancePath?: string,
): Record<string, unknown> {
  return {
    type: `https://moreclient.com/errors/${err.code.toLowerCase().replace(/_/g, "-")}`,
    title: err.message,
    status: err.status,
    code: err.code,
    instance: instancePath,
    requestId: err.requestId,
    ...(err.meta ? { meta: err.meta } : {}),
  };
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

/** Convert any thrown value into an AppError. */
export function toAppError(err: unknown): AppError {
  if (isAppError(err)) return err;
  if (err instanceof Error) {
    return new AppError("INTERNAL", err.message, 500);
  }
  return new AppError("INTERNAL", "An unexpected error occurred", 500);
}
