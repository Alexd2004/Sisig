import { QueryClient } from '@tanstack/react-query';
import { isRetryableError } from './client';

const MAX_QUERY_RETRIES = 3;

/**
 * Retry policy for queries. Only network failures and 5xx responses are retried
 * (TanStack applies exponential backoff between attempts). RLS and other 4xx errors fail immediately.
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  return failureCount < MAX_QUERY_RETRIES && isRetryableError(error);
}

/**
 * Shared QueryClient for the apps. Queries default to a 1 minute staleTime;
 * hooks override it per domain (for example menu data uses 5 to 10 minutes).
 * Mutations never retry automatically, because a retried write could run twice.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: shouldRetryQuery,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
