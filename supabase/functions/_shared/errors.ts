import { jsonResponse } from "./cors.ts";

export type ErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "method_not_allowed"
  | "internal_error";

/** An error whose message is safe to show to the client. */
export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;

  constructor(status: number, code: ErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Turns any thrown value into the error envelope
 * `{ "error": { "code": string, "message": string } }`.
 * Anything that is not an AppError is logged and returned as a generic 500, so
 * internal details (SQL errors, stack traces) never reach the client.
 */
export function errorEnvelope(error: unknown): Response {
  if (error instanceof AppError) {
    return jsonResponse(
      { error: { code: error.code, message: error.message } },
      error.status,
    );
  }
  console.error(error);
  return jsonResponse(
    { error: { code: "internal_error", message: "Unexpected server error" } },
    500,
  );
}
