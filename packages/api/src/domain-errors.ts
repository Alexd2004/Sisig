import { AppError } from './app-error';

/**
 * Domain error catalogue (DATA-13). The single TS source of truth for domain error codes.
 *
 * - `sqlstate`: the custom SQLSTATE that SQL functions raise for the code through
 *   `private.raise_app_error` (see supabase/migrations/*_create_app_error_helpers.sql).
 * - `copyKey`: stable i18n key for the UI. PLAT-09 adds the translations.
 * - `fallbackMessage`: English copy shown until PLAT-09, and the AppError `message`.
 *
 * Codes are append-only: never rename a code or reuse a SQLSTATE. The drift test
 * (error-codes-drift.test.ts) fails if this map and the SQL catalogue disagree.
 */
export const DOMAIN_ERRORS = {
  INSUFFICIENT_POINTS: {
    sqlstate: 'SS001',
    copyKey: 'errors.insufficient_points',
    fallbackMessage: "You don't have enough points for this reward",
  },
  REWARD_INACTIVE: {
    sqlstate: 'SS002',
    copyKey: 'errors.reward_inactive',
    fallbackMessage: 'This reward is not available right now',
  },
  OUT_OF_STOCK: {
    sqlstate: 'SS003',
    copyKey: 'errors.out_of_stock',
    fallbackMessage: 'This item is out of stock',
  },
  OFFER_NOT_ELIGIBLE: {
    sqlstate: 'SS004',
    copyKey: 'errors.offer_not_eligible',
    fallbackMessage: "You're not eligible for this offer",
  },
  OFFER_CAP_REACHED: {
    sqlstate: 'SS005',
    copyKey: 'errors.offer_cap_reached',
    fallbackMessage: 'This offer is no longer available',
  },
  OFFER_LIMIT_REACHED: {
    sqlstate: 'SS006',
    copyKey: 'errors.offer_limit_reached',
    fallbackMessage: "You've already used this offer the maximum number of times",
  },
  CLAIM_EXPIRED: {
    sqlstate: 'SS007',
    copyKey: 'errors.claim_expired',
    fallbackMessage: 'This has expired',
  },
  ALREADY_REDEEMED: {
    sqlstate: 'SS008',
    copyKey: 'errors.already_redeemed',
    fallbackMessage: 'This has already been redeemed',
  },
  IDEMPOTENCY_CONFLICT: {
    sqlstate: 'SS009',
    copyKey: 'errors.idempotency_conflict',
    fallbackMessage: 'This request was already sent with different details. Please start again',
  },
  RATE_LIMITED: {
    sqlstate: 'SS010',
    copyKey: 'errors.rate_limited',
    fallbackMessage: 'Too many attempts. Please wait a moment and try again',
  },
  STORE_CLOSED: {
    sqlstate: 'SS011',
    copyKey: 'errors.store_closed',
    fallbackMessage: 'This store is closed right now',
  },
  AUTH_REAUTH_REQUIRED: {
    sqlstate: 'SS012',
    copyKey: 'errors.auth_reauth_required',
    fallbackMessage: 'Please sign in again to continue',
  },
  NEGATIVE_BALANCE: {
    sqlstate: 'SS013',
    copyKey: 'errors.negative_balance',
    fallbackMessage: "This can't be done because it would leave a negative points balance",
  },
} as const satisfies Record<string, { sqlstate: string; copyKey: string; fallbackMessage: string }>;

export type DomainErrorCode = keyof typeof DOMAIN_ERRORS;

export const DOMAIN_ERROR_CODES = Object.keys(DOMAIN_ERRORS) as readonly DomainErrorCode[];

/** Safe, non-personal values a backend may attach to a domain error (e.g. required points). */
export type DomainErrorContext = Readonly<Record<string, string | number | boolean | null>>;

const CODE_BY_SQLSTATE: ReadonlyMap<string, DomainErrorCode> = new Map(
  DOMAIN_ERROR_CODES.map((code) => [DOMAIN_ERRORS[code].sqlstate, code])
);

/** A known backend domain error: stable `code`, i18n `copyKey` and a user-safe `message`. */
export class DomainError extends AppError {
  public readonly code: DomainErrorCode;
  public readonly copyKey: string;
  public readonly context: DomainErrorContext;

  constructor(code: DomainErrorCode, context: DomainErrorContext = {}, details?: unknown) {
    const entry = DOMAIN_ERRORS[code];
    super(entry.fallbackMessage, code, details);
    this.name = 'DomainError';
    this.code = code;
    this.copyKey = entry.copyKey;
    this.context = context;
  }

  toJSON() {
    return { ...super.toJSON(), copyKey: this.copyKey, context: this.context };
  }
}

export function isDomainErrorCode(value: unknown): value is DomainErrorCode {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(DOMAIN_ERRORS, value);
}

/** True for a DomainError, optionally with the given code. */
export function isDomainError(error: unknown, code?: DomainErrorCode): error is DomainError {
  return error instanceof DomainError && (code === undefined || error.code === code);
}

/**
 * Map a PostgREST error raised by `private.raise_app_error` to a DomainError.
 * The SQLSTATE decides the code. The JSON hint only supplies the context, and a missing
 * or malformed hint gives an empty context. Returns null for any other SQLSTATE.
 */
export function domainErrorFromPostgrest(err: {
  code: string;
  hint?: unknown;
}): DomainError | null {
  const code = CODE_BY_SQLSTATE.get(err.code);
  if (!code) {
    return null;
  }
  return new DomainError(code, contextFromHint(err.hint), err);
}

/**
 * Map an Edge Function error body `{ "error": { "code": "...", "message": "..." } }`
 * to a DomainError when the code is a domain code. Returns null otherwise.
 */
export function domainErrorFromEnvelope(body: unknown, details?: unknown): DomainError | null {
  const code = (body as { error?: { code?: unknown } } | null)?.error?.code;
  return isDomainErrorCode(code) ? new DomainError(code, {}, details) : null;
}

function contextFromHint(hint: unknown): DomainErrorContext {
  if (typeof hint !== 'string' || hint === '') {
    return {};
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(hint);
  } catch {
    return {};
  }
  const context = (parsed as { context?: unknown } | null)?.context;
  if (typeof context !== 'object' || context === null || Array.isArray(context)) {
    return {};
  }
  // Keep primitives only, so nested objects never reach UI copy interpolation.
  const safe: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(context)) {
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      safe[key] = value;
    }
  }
  return safe;
}
