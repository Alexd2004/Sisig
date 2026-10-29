import {
  AuthApiError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';
import { AppError, isRetryableError, normalizeError } from './client';

const RAW_DB_MESSAGE = 'new row violates row-level security policy for table "orders"';

describe('normalizeError', () => {
  it('passes an AppError through unchanged', () => {
    const original = new AppError('Already normalized', 'NOT_FOUND');
    expect(normalizeError(original)).toBe(original);
  });

  describe('PostgREST errors', () => {
    it('maps RLS / insufficient privilege (42501) to PERMISSION_DENIED without leaking the raw message', () => {
      const err = normalizeError({
        code: '42501',
        message: RAW_DB_MESSAGE,
        details: null,
        hint: null,
      });

      expect(err).toBeInstanceOf(AppError);
      expect(err.code).toBe('PERMISSION_DENIED');
      expect(err.message).not.toContain('row-level security');
    });

    it('maps PGRST116 (zero rows from .single()) to NOT_FOUND', () => {
      expect(normalizeError({ code: 'PGRST116', message: 'JSON object requested' }).code).toBe(
        'NOT_FOUND'
      );
    });

    it('maps unique violations (23505) to DUPLICATE', () => {
      expect(normalizeError({ code: '23505', message: 'duplicate key value' }).code).toBe(
        'DUPLICATE'
      );
    });

    it('maps an expired JWT (PGRST301) to SESSION_EXPIRED', () => {
      expect(normalizeError({ code: 'PGRST301', message: 'JWT expired' }).code).toBe(
        'SESSION_EXPIRED'
      );
    });

    it('maps any other database error to DATABASE_ERROR with a fixed message', () => {
      const err = normalizeError({
        code: '22P02',
        message: 'invalid input syntax for type uuid: "abc"',
      });

      expect(err.code).toBe('DATABASE_ERROR');
      expect(err.message).toBe('A database error occurred');
    });

    it('maps an empty code (request never got a response) to NETWORK_ERROR', () => {
      expect(
        normalizeError({ code: '', message: 'TypeError: fetch failed', details: '' }).code
      ).toBe('NETWORK_ERROR');
    });
  });

  describe('Auth errors', () => {
    it('maps invalid_credentials to INVALID_CREDENTIALS, not DATABASE_ERROR', () => {
      const err = normalizeError(
        new AuthApiError('Invalid login credentials', 400, 'invalid_credentials')
      );

      expect(err.code).toBe('INVALID_CREDENTIALS');
      expect(err.message).toBe('Email or password is incorrect');
    });

    it('maps a missing session (session_not_found / 401) to SESSION_EXPIRED', () => {
      expect(
        normalizeError(new AuthApiError('Session not found', 401, 'session_not_found')).code
      ).toBe('SESSION_EXPIRED');
    });

    it('maps AuthSessionMissingError to UNAUTHORIZED', () => {
      expect(normalizeError(new AuthSessionMissingError()).code).toBe('UNAUTHORIZED');
    });

    it('maps AuthRetryableFetchError to NETWORK_ERROR', () => {
      expect(normalizeError(new AuthRetryableFetchError('fetch failed', 0)).code).toBe(
        'NETWORK_ERROR'
      );
    });
  });

  describe('Edge Function errors', () => {
    it('reads the HTTP status from the response, not the raw function message', () => {
      const err = normalizeError(new FunctionsHttpError({ status: 401 }));

      expect(err.code).toBe('UNAUTHORIZED');
      expect(err.message).toBe('Please sign in to continue');
    });

    it('maps 403 to FORBIDDEN', () => {
      const err = normalizeError(new FunctionsHttpError({ status: 403 }));
      expect(err.code).toBe('FORBIDDEN');
    });

    it('maps 5xx responses to SERVER_ERROR', () => {
      const err = normalizeError(new FunctionsHttpError({ status: 500 }));
      expect(err.code).toBe('SERVER_ERROR');
      expect(err.message).not.toContain('Edge Function');
    });

    it('maps other 4xx responses to FUNCTION_ERROR with a generic message', () => {
      const err = normalizeError(new FunctionsHttpError({ status: 422 }));
      expect(err.code).toBe('FUNCTION_ERROR');
      expect(err.message).toBe('We could not complete that request. Please try again');
    });

    it('maps relay failures to SERVER_ERROR and fetch failures to NETWORK_ERROR', () => {
      expect(normalizeError(new FunctionsRelayError({})).code).toBe('SERVER_ERROR');
      expect(normalizeError(new FunctionsFetchError({})).code).toBe('NETWORK_ERROR');
    });
  });

  it('falls back to UNKNOWN_ERROR with a generic message for anything else', () => {
    const err = normalizeError(new Error('boom: internal detail'));

    expect(err.code).toBe('UNKNOWN_ERROR');
    expect(err.message).toBe('An unexpected error occurred');
  });
});

describe('isRetryableError', () => {
  it('retries network failures and 5xx responses', () => {
    expect(isRetryableError(new AuthRetryableFetchError('fetch failed', 0))).toBe(true);
    expect(isRetryableError({ code: '', message: 'fetch failed' })).toBe(true);
    expect(isRetryableError(new FunctionsHttpError({ status: 503 }))).toBe(true);
  });

  it('never retries RLS, not-found, duplicate or other 4xx failures', () => {
    expect(isRetryableError({ code: '42501', message: RAW_DB_MESSAGE })).toBe(false);
    expect(isRetryableError({ code: 'PGRST116', message: 'no rows' })).toBe(false);
    expect(isRetryableError({ code: '23505', message: 'duplicate' })).toBe(false);
    expect(isRetryableError(new FunctionsHttpError({ status: 401 }))).toBe(false);
    expect(
      isRetryableError(new AuthApiError('Invalid login credentials', 400, 'invalid_credentials'))
    ).toBe(false);
  });
});
