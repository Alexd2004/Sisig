import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * Create a typed Supabase client with automatic session management.
 * Handles secure storage, token refresh, and error normalization.
 */
export function createSupabaseClient(storage: StorageAdapter): SupabaseClient<Database> {
  const url = process.env.SUPABASE_URL || 'http://localhost:54321';
  const anonKey = process.env.SUPABASE_ANON_KEY || '';

  const client = createClient<Database>(url, anonKey, {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  return client;
}

/**
 * Application-level error type with user-safe messages
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public details?: unknown,
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

/**
 * Normalize Supabase errors to AppError with user-safe messages
 */
export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;

    // Postgrest error
    if ('message' in err && 'code' in err) {
      const code = String(err.code);

      // RLS/permission errors
      if (code === '42501' || code === 'PERM') {
        return new AppError(
          'You do not have permission to perform this action',
          'PERMISSION_DENIED',
          err,
        );
      }

      // Not found
      if (code === 'PGRST116' || code === 'NTFND') {
        return new AppError('Resource not found', 'NOT_FOUND', err);
      }

      // Duplicate key
      if (code === '23505') {
        return new AppError('This record already exists', 'DUPLICATE', err);
      }

      // General database error
      return new AppError(
        'A database error occurred',
        'DATABASE_ERROR',
        err,
      );
    }

    // Auth error
    if ('error_description' in err) {
      return new AppError(
        String(err.error_description),
        String(err.error || 'AUTH_ERROR'),
        err,
      );
    }

    // Functions error
    if ('message' in err && 'status' in err) {
      const status = Number(err.status);
      if (status === 401) {
        return new AppError('Unauthorized', 'UNAUTHORIZED', err);
      }
      if (status === 403) {
        return new AppError('Forbidden', 'FORBIDDEN', err);
      }
      return new AppError(
        String(err.message || 'Function error'),
        'FUNCTION_ERROR',
        err,
      );
    }
  }

  // Generic error
  return new AppError(
    'An unexpected error occurred',
    'UNKNOWN_ERROR',
    error,
  );
}
