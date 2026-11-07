import { FunctionsHttpError } from '@supabase/supabase-js';
import { AppError, isRetryableError, normalizeError, normalizeErrorAsync } from './client';
import {
  DOMAIN_ERROR_CODES,
  DOMAIN_ERRORS,
  DomainError,
  isDomainError,
  isDomainErrorCode,
} from './domain-errors';

/**
 * What supabase-js returns in `error` for `client.rpc('raise_sample_error')`: PostgREST
 * answers HTTP 400 with the Postgres error fields, and private.raise_app_error sets
 * message = code and hint = jsonb_build_object(...)::text (note the spaces jsonb prints).
 */
const SAMPLE_RPC_ERROR = {
  code: 'SS001',
  message: 'INSUFFICIENT_POINTS',
  details: null,
  hint: '{"code": "INSUFFICIENT_POINTS", "context": {}}',
};

describe('domain errors', () => {
  describe('AC1: raise_sample_error surfaces as a typed error', () => {
    it('maps the sample RPC error to INSUFFICIENT_POINTS with its copy key', () => {
      const err = normalizeError(SAMPLE_RPC_ERROR);

      expect(err).toBeInstanceOf(DomainError);
      expect(err).toBeInstanceOf(AppError);
      expect(isDomainError(err, 'INSUFFICIENT_POINTS')).toBe(true);
      expect(err.code).toBe('INSUFFICIENT_POINTS');
      expect((err as DomainError).copyKey).toBe('errors.insufficient_points');
      expect(err.message).toBe(DOMAIN_ERRORS.INSUFFICIENT_POINTS.fallbackMessage);
      expect((err as DomainError).context).toEqual({});
    });

    it('never puts the raw Postgres text in the message', () => {
      const err = normalizeError({
        ...SAMPLE_RPC_ERROR,
        message: 'raw: balance 12 < 500',
      });

      expect(err.code).toBe('INSUFFICIENT_POINTS');
      expect(err.message).not.toContain('raw');
      expect(err.message).not.toContain('SS001');
    });
  });

  it('keeps primitive context values from the hint and drops nested ones', () => {
    const err = normalizeError({
      code: 'SS001',
      message: 'INSUFFICIENT_POINTS',
      details: null,
      hint: JSON.stringify({
        code: 'INSUFFICIENT_POINTS',
        context: {
          required: 500,
          balance: 120,
          label: 'x',
          ok: false,
          none: null,
          nested: { a: 1 },
        },
      }),
    }) as DomainError;

    expect(err.context).toEqual({
      required: 500,
      balance: 120,
      label: 'x',
      ok: false,
      none: null,
    });
  });

  it.each([null, undefined, '', 'not json', '[1,2]', '{"context": [1]}', 'null'])(
    'maps by SQLSTATE alone when the hint is %p',
    (hint) => {
      const err = normalizeError({
        code: 'SS010',
        message: 'RATE_LIMITED',
        hint,
      }) as DomainError;

      expect(err.code).toBe('RATE_LIMITED');
      expect(err.copyKey).toBe('errors.rate_limited');
      expect(err.context).toEqual({});
    }
  );

  it('lets the SQLSTATE win when the hint names another code', () => {
    const err = normalizeError({
      code: 'SS003',
      message: 'OUT_OF_STOCK',
      hint: '{"code": "INSUFFICIENT_POINTS", "context": {}}',
    });

    expect(err.code).toBe('OUT_OF_STOCK');
  });

  it('maps an unknown SS SQLSTATE to DATABASE_ERROR', () => {
    const err = normalizeError({ code: 'SS999', message: 'SOMETHING_NEW' });

    expect(err).not.toBeInstanceOf(DomainError);
    expect(err.code).toBe('DATABASE_ERROR');
  });

  it.each(DOMAIN_ERROR_CODES)('maps %s from its SQLSTATE and never retries it', (code) => {
    const err = normalizeError({
      code: DOMAIN_ERRORS[code].sqlstate,
      message: code,
    });

    expect(err.code).toBe(code);
    expect(isRetryableError(err)).toBe(false);
  });

  it('serializes copyKey and context', () => {
    const json = new DomainError('OUT_OF_STOCK', { item: 'abc' }).toJSON();

    expect(json).toMatchObject({
      code: 'OUT_OF_STOCK',
      copyKey: 'errors.out_of_stock',
      context: { item: 'abc' },
      message: DOMAIN_ERRORS.OUT_OF_STOCK.fallbackMessage,
    });
  });

  describe('catalogue', () => {
    it('has the 13 DATA-13 codes', () => {
      expect([...DOMAIN_ERROR_CODES].sort()).toEqual(
        [
          'ALREADY_REDEEMED',
          'AUTH_REAUTH_REQUIRED',
          'CLAIM_EXPIRED',
          'IDEMPOTENCY_CONFLICT',
          'INSUFFICIENT_POINTS',
          'NEGATIVE_BALANCE',
          'OFFER_CAP_REACHED',
          'OFFER_LIMIT_REACHED',
          'OFFER_NOT_ELIGIBLE',
          'OUT_OF_STOCK',
          'RATE_LIMITED',
          'REWARD_INACTIVE',
          'STORE_CLOSED',
        ].sort()
      );
    });

    it.each(DOMAIN_ERROR_CODES)('%s has a well-formed SQLSTATE, copy key and fallback', (code) => {
      const entry = DOMAIN_ERRORS[code];

      expect(entry.sqlstate).toMatch(/^SS\d{3}$/);
      expect(entry.sqlstate).not.toBe('SS000');
      expect(entry.copyKey).toBe(`errors.${code.toLowerCase()}`);
      expect(entry.fallbackMessage.length).toBeGreaterThan(0);
    });

    it('gives every code its own SQLSTATE', () => {
      const sqlstates = DOMAIN_ERROR_CODES.map((code) => DOMAIN_ERRORS[code].sqlstate);
      expect(new Set(sqlstates).size).toBe(sqlstates.length);
    });

    it('only accepts real codes in isDomainErrorCode', () => {
      expect(isDomainErrorCode('RATE_LIMITED')).toBe(true);
      expect(isDomainErrorCode('toString')).toBe(false);
      expect(isDomainErrorCode('rate_limited')).toBe(false);
    });
  });

  describe('Edge Function envelopes (normalizeErrorAsync)', () => {
    const httpError = (body: string, status: number) =>
      new FunctionsHttpError(new Response(body, { status }));

    it('maps a domain code in the envelope to a DomainError', async () => {
      const err = await normalizeErrorAsync(
        httpError(
          JSON.stringify({
            error: { code: 'RATE_LIMITED', message: 'slow down' },
          }),
          429
        )
      );

      expect(isDomainError(err, 'RATE_LIMITED')).toBe(true);
      expect(err.message).toBe(DOMAIN_ERRORS.RATE_LIMITED.fallbackMessage);
      expect(isRetryableError(err)).toBe(false);
    });

    it('falls back to the status mapping for a non-domain code or a non-JSON body', async () => {
      const lower = await normalizeErrorAsync(
        httpError(JSON.stringify({ error: { code: 'bad_request', message: 'x' } }), 400)
      );
      const notJson = await normalizeErrorAsync(httpError('<html>oops</html>', 400));
      const server = await normalizeErrorAsync(httpError('oops', 502));

      expect(lower.code).toBe('FUNCTION_ERROR');
      expect(notJson.code).toBe('FUNCTION_ERROR');
      expect(server.code).toBe('SERVER_ERROR');
    });

    it('normalizes non-function errors like normalizeError', async () => {
      expect((await normalizeErrorAsync(SAMPLE_RPC_ERROR)).code).toBe('INSUFFICIENT_POINTS');
      expect((await normalizeErrorAsync(new Error('boom'))).code).toBe('UNKNOWN_ERROR');
    });
  });
});
