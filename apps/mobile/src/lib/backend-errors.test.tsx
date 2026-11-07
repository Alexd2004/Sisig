import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider, useMutation } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createQueryClient, isDomainError, normalizeError, type AppError } from '@sisig/api';

// DATA-13 AC1 integration check: a backend domain error reaches a mobile mutation hook as a
// typed DomainError through the built @sisig/api package. There is no module under test in
// src/lib; the hook below is the pattern RPC hooks follow (LOY-01 adds the real ones).
//
// What supabase-js resolves for `supabase.rpc('raise_sample_error')`.
// PostgREST returns the Postgres error fields; the raw message must never reach the UI.
const rpc = jest.fn(async (_fn: 'raise_sample_error') => ({
  data: null,
  error: {
    code: 'SS001',
    message: 'INSUFFICIENT_POINTS',
    details: null,
    hint: '{"code": "INSUFFICIENT_POINTS", "context": {}}',
  },
}));

// The pattern every RPC mutation follows: throw normalizeError(error).
function useRaiseSampleError() {
  return useMutation<void, AppError>({
    // No cache timer left running after the test (TanStack's default gcTime is 5 minutes).
    gcTime: 0,
    mutationFn: async () => {
      const { error } = await rpc('raise_sample_error');
      if (error) {
        throw normalizeError(error);
      }
    },
  });
}

describe('backend domain errors in the mobile client', () => {
  it('surfaces INSUFFICIENT_POINTS from an RPC as a typed error with a copy key', async () => {
    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result, unmount } = renderHook(() => useRaiseSampleError(), { wrapper });

    act(() => {
      result.current.mutate();
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    const error = result.current.error;
    expect(isDomainError(error, 'INSUFFICIENT_POINTS')).toBe(true);
    if (!isDomainError(error)) {
      throw new Error('expected a DomainError');
    }
    expect(error.code).toBe('INSUFFICIENT_POINTS');
    expect(error.copyKey).toBe('errors.insufficient_points');
    expect(error.message).toBe("You don't have enough points for this reward");
    expect(error.message).not.toContain('SS001');
    expect(rpc).toHaveBeenCalledTimes(1); // mutations never retry
    unmount();
    queryClient.clear();
  });
});
