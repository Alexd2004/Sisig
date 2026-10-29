import { AppError } from './client';
import { createQueryClient, shouldRetryQuery } from './query-client';

describe('shouldRetryQuery', () => {
  const networkError = { code: '', message: 'TypeError: fetch failed' };

  it('retries network failures up to three times', () => {
    expect(shouldRetryQuery(0, networkError)).toBe(true);
    expect(shouldRetryQuery(2, networkError)).toBe(true);
    expect(shouldRetryQuery(3, networkError)).toBe(false);
  });

  it('never retries RLS, not-found or other 4xx failures', () => {
    expect(shouldRetryQuery(0, { code: '42501', message: 'permission denied' })).toBe(false);
    expect(shouldRetryQuery(0, { code: 'PGRST116', message: 'no rows' })).toBe(false);
    expect(shouldRetryQuery(0, new AppError('Please sign in', 'UNAUTHORIZED'))).toBe(false);
  });
});

describe('createQueryClient', () => {
  it('does not retry mutations automatically', () => {
    expect(createQueryClient().getDefaultOptions().mutations?.retry).toBe(false);
  });

  it('retries a failing query on network errors', async () => {
    const queryFn = jest.fn().mockRejectedValue(new AppError('offline', 'NETWORK_ERROR'));

    await expect(
      createQueryClient().fetchQuery({ queryKey: ['retry-network'], queryFn, retryDelay: 0 })
    ).rejects.toMatchObject({ code: 'NETWORK_ERROR' });

    // 1 attempt + 3 retries
    expect(queryFn).toHaveBeenCalledTimes(4);
  });

  it('does not retry a permission error', async () => {
    const queryFn = jest.fn().mockRejectedValue(new AppError('denied', 'PERMISSION_DENIED'));

    await expect(
      createQueryClient().fetchQuery({ queryKey: ['retry-permission'], queryFn, retryDelay: 0 })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });

    expect(queryFn).toHaveBeenCalledTimes(1);
  });
});
