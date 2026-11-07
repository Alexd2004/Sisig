import { jsonResponse } from "./cors.ts";

/**
 * Domain error codes (DATA-13). Must match DOMAIN_ERRORS in
 * packages/api/src/domain-errors.ts; Deno cannot import that package, so
 * packages/api/src/error-codes-drift.test.ts checks this list instead.
 * Append-only: never rename or remove a code.
 */
export const DOMAIN_ERROR_CODES = [
  "INSUFFICIENT_POINTS",
  "REWARD_INACTIVE",
  "OUT_OF_STOCK",
  "OFFER_NOT_ELIGIBLE",
  "OFFER_CAP_REACHED",
  "OFFER_LIMIT_REACHED",
  "CLAIM_EXPIRED",
  "ALREADY_REDEEMED",
  "IDEMPOTENCY_CONFLICT",
  "RATE_LIMITED",
  "STORE_CLOSED",
  "AUTH_REAUTH_REQUIRED",
  "NEGATIVE_BALANCE",
] as const;

export type DomainErrorCode = typeof DOMAIN_ERROR_CODES[number];

/** HTTP status an Edge Function returns for each domain code. */
export const DOMAIN_ERROR_STATUS: Readonly<Record<DomainErrorCode, number>> = {
  INSUFFICIENT_POINTS: 422,
  REWARD_INACTIVE: 422,
  OUT_OF_STOCK: 422,
  OFFER_NOT_ELIGIBLE: 422,
  OFFER_CAP_REACHED: 422,
  OFFER_LIMIT_REACHED: 422,
  CLAIM_EXPIRED: 422,
  ALREADY_REDEEMED: 409,
  IDEMPOTENCY_CONFLICT: 409,
  RATE_LIMITED: 429,
  STORE_CLOSED: 422,
  AUTH_REAUTH_REQUIRED: 401,
  NEGATIVE_BALANCE: 422,
};

export type ErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "method_not_allowed"
  | "internal_error"
  | DomainErrorCode;

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
 * A domain error with its standard status. The client maps on `code` and shows
 * its own copy, so `message` is for logs and API consumers, never personal data.
 */
export function domainError(code: DomainErrorCode, message?: string): AppError {
  return new AppError(DOMAIN_ERROR_STATUS[code], code, message ?? code);
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
