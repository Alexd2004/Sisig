import { createClient, isAuthError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface SupabaseClientConfig {
  /** Defaults to process.env.SUPABASE_URL, then the local Supabase stack. */
  url?: string;
  /** Public anon key only. Defaults to process.env.SUPABASE_ANON_KEY. */
  anonKey?: string;
}

/**
 * Create a typed Supabase client with automatic session management.
 * Sessions are persisted through `storage` (mobile passes its encrypted adapter).
 * detectSessionInUrl is off because the apps never receive auth redirects in the URL.
 */
export function createSupabaseClient(
  storage: StorageAdapter,
  config: SupabaseClientConfig = {}
): SupabaseClient<Database> {
  const url = config.url || process.env.SUPABASE_URL || 'http://localhost:54321';
  const anonKey = config.anonKey || process.env.SUPABASE_ANON_KEY || '';

  return createClient<Database>(url, anonKey, {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Application-level error type with user-safe messages
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }

  toJSON() {
    return {
      message: this.message,
      code: this.code,
      details: this.details,
    };
  }
}

const NETWORK_MESSAGE = 'Check your connection and try again';
const SERVER_MESSAGE = 'Something went wrong on our side. Please try again';
const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again';
const GENERIC_MESSAGE = 'An unexpected error occurred';

/** Codes that describe a transient failure. Everything else (4xx, RLS, validation) is final. */
const RETRYABLE_CODES: ReadonlySet<string> = new Set(['NETWORK_ERROR', 'SERVER_ERROR']);

/**
 * True only for network failures and 5xx responses.
 * Permission (RLS), not-found, duplicate and other 4xx errors must never be retried.
 */
export function isRetryableError(error: unknown): boolean {
  return RETRYABLE_CODES.has(normalizeError(error).code);
}

/**
 * Normalize Supabase errors (PostgrestError, AuthError, FunctionsError) to AppError.
 * The AppError message is always a fixed, user-safe string. Raw server text stays in `details`.
 */
export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  // Checked first: AuthError objects also carry `code` and `message`.
  if (isAuthError(error)) {
    return normalizeAuthError(error);
  }

  if (hasErrorName(error, 'FunctionsHttpError')) {
    return normalizeFunctionsHttpError(error);
  }
  if (hasErrorName(error, 'FunctionsRelayError')) {
    return new AppError(SERVER_MESSAGE, 'SERVER_ERROR', error);
  }
  if (hasErrorName(error, 'FunctionsFetchError')) {
    return new AppError(NETWORK_MESSAGE, 'NETWORK_ERROR', error);
  }

  if (isPostgrestError(error)) {
    return normalizePostgrestError(error);
  }

  return new AppError(GENERIC_MESSAGE, 'UNKNOWN_ERROR', error);
}

function hasErrorName(error: unknown, name: string): error is { name: string; context?: unknown } {
  return typeof error === 'object' && error !== null && (error as { name?: unknown }).name === name;
}

function isPostgrestError(
  error: unknown
): error is { code: string; message: string; details?: unknown } {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const err = error as { code?: unknown; message?: unknown };
  return typeof err.code === 'string' && typeof err.message === 'string';
}

function normalizePostgrestError(err: { code: string; details?: unknown }): AppError {
  switch (err.code) {
    // An empty code means the request never got an HTTP response (offline, timeout).
    case '':
      return new AppError(NETWORK_MESSAGE, 'NETWORK_ERROR', err);
    // Insufficient privilege: RLS denied the row or table.
    case '42501':
    case 'PERM':
      return new AppError(
        'You do not have permission to perform this action',
        'PERMISSION_DENIED',
        err
      );
    // JWT expired or rejected by PostgREST.
    case 'PGRST301':
      return new AppError(SESSION_EXPIRED_MESSAGE, 'SESSION_EXPIRED', err);
    // Zero rows returned by .single().
    case 'PGRST116':
    case 'NTFND':
      return new AppError('Resource not found', 'NOT_FOUND', err);
    // unique_violation
    case '23505':
      return new AppError('This record already exists', 'DUPLICATE', err);
    default:
      return new AppError('A database error occurred', 'DATABASE_ERROR', err);
  }
}

function normalizeAuthError(err: { name: string; status?: number; code?: string }): AppError {
  if (err.name === 'AuthRetryableFetchError') {
    return new AppError(NETWORK_MESSAGE, 'NETWORK_ERROR', err);
  }
  if (err.name === 'AuthSessionMissingError') {
    return new AppError('Please sign in to continue', 'UNAUTHORIZED', err);
  }
  if (err.code === 'invalid_credentials') {
    return new AppError('Email or password is incorrect', 'INVALID_CREDENTIALS', err);
  }
  if (err.code === 'session_not_found' || err.status === 401) {
    return new AppError(SESSION_EXPIRED_MESSAGE, 'SESSION_EXPIRED', err);
  }
  if (typeof err.status === 'number' && err.status >= 500) {
    return new AppError(SERVER_MESSAGE, 'SERVER_ERROR', err);
  }
  return new AppError('We could not complete that request. Please try again', 'AUTH_ERROR', err);
}

function normalizeFunctionsHttpError(err: { context?: unknown }): AppError {
  // FunctionsHttpError keeps the HTTP status on its `context` Response.
  const status = (err.context as { status?: unknown } | undefined)?.status;
  if (status === 401) {
    return new AppError('Please sign in to continue', 'UNAUTHORIZED', err);
  }
  if (status === 403) {
    return new AppError('You do not have permission to perform this action', 'FORBIDDEN', err);
  }
  if (typeof status === 'number' && status >= 500) {
    return new AppError(SERVER_MESSAGE, 'SERVER_ERROR', err);
  }
  return new AppError(
    'We could not complete that request. Please try again',
    'FUNCTION_ERROR',
    err
  );
}
