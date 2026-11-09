export { apiUrl, buildHeaders } from './utils';
export { createSupabaseClient, AppError, normalizeError, isRetryableError } from './client';
export type { StorageAdapter, SupabaseClientConfig } from './client';
export { createQueryClient, shouldRetryQuery } from './query-client';
export { keys, persistedQueryKeyPrefixes, shouldPersistQuery } from './query-keys';
export {
  useMenu,
  useMenuCategories,
  useProduct,
  menuCategoriesQueryOptions,
} from './hooks/useMenu';
export { DEFAULT_APP_CONFIG, appConfigQueryOptions, parseAppConfig } from './remote-config';
export type {
  AppConfig,
  AppConfigKey,
  AppConfigRow,
  ConfigIssue,
  ConfigReporter,
} from './remote-config';
export { useCreateOrder, useRedeemPoints, optimisticUpdate } from './mutations';
export type { OptimisticUpdateConfig } from './mutations';
export type { Database } from './database.types';
