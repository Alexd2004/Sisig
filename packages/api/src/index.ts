export { apiUrl, buildHeaders } from './utils';
export {
  createSupabaseClient,
  AppError,
  normalizeError,
  normalizeErrorAsync,
  isRetryableError,
} from './client';
export {
  DOMAIN_ERRORS,
  DOMAIN_ERROR_CODES,
  DomainError,
  isDomainError,
  isDomainErrorCode,
} from './domain-errors';
export type { DomainErrorCode, DomainErrorContext } from './domain-errors';
export type { StorageAdapter, SupabaseClientConfig } from './client';
export { createQueryClient, shouldRetryQuery } from './query-client';
export { keys, persistedQueryKeyPrefixes, shouldPersistQuery } from './query-keys';
export {
  useMenu,
  useMenuCategories,
  useProduct,
  menuCategoriesQueryOptions,
} from './hooks/useMenu';
export { useCreateOrder, useRedeemPoints, optimisticUpdate } from './mutations';
export type { OptimisticUpdateConfig } from './mutations';
export type { Database } from './database.types';
