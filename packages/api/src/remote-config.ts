import { queryOptions, QueryKey } from '@tanstack/react-query';
import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Database, Json } from './database.types';
import { keys } from './query-keys';
import { normalizeError } from './client';

/**
 * Remote config (PLAT-06): kill switches, the forced-update gate and a few links, read from
 * public.app_config. Keys match the table's `key` column. See docs/runbooks/remote-config.md.
 */
export interface AppConfig {
  /** Kill switch for pickup ordering. */
  ordering_enabled: boolean;
  /** Shown while ordering is off. null means the app's own default text. */
  ordering_paused_message: string | null;
  /** Kill switch for receipt scanning. */
  receipt_scan_enabled: boolean;
  uber_eats_url: string | null;
  /** x.y.z. Installs below it see the blocking update screen. */
  min_supported_version_ios: string;
  min_supported_version_android: string;
  /** x.y.z. Installs below it see the dismissible update banner. */
  recommended_version: string;
  store_url_ios: string | null;
  store_url_android: string | null;
  /** Home tab announcement banner, or null for none. */
  announcement_message: string | null;
}

export type AppConfigKey = keyof AppConfig;

/** One row of public.app_config, as the query returns it. */
export interface AppConfigRow {
  key: string;
  value: Json;
}

/**
 * Bundled defaults, identical to the baseline rows in the create_app_config migration.
 * They are fail-open: everything on, and no version blocked.
 */
export const DEFAULT_APP_CONFIG: Readonly<AppConfig> = Object.freeze({
  ordering_enabled: true,
  ordering_paused_message: null,
  receipt_scan_enabled: true,
  uber_eats_url: null,
  min_supported_version_ios: '0.0.0',
  min_supported_version_android: '0.0.0',
  recommended_version: '0.0.0',
  store_url_ios: null,
  store_url_android: 'https://play.google.com/store/apps/details?id=com.sisig.mobile',
  announcement_message: null,
});

/** A problem found while reading the remote config. The value falls back to its default. */
export interface ConfigIssue {
  kind: 'invalid_payload' | 'invalid_value' | 'unknown_key' | 'missing_store_url';
  key?: string;
  detail: string;
}

/** Receives config problems. The app plugs in its reporter (Sentry, once PLAT-04 sets it up). */
export type ConfigReporter = (issue: ConfigIssue) => void;

const MAX_MESSAGE_LENGTH = 280;

const version = z.string().regex(/^\d+\.\d+\.\d+$/, 'expected a version like 1.2.3');

/**
 * An https link on one of the given hosts (or their subdomains), or null. Links open with
 * Linking.openURL, the store links from a screen that cannot be dismissed, so a typo or a
 * hostile value must not send customers to another site. Checked with a pattern rather
 * than `new URL`, because React Native's URL implementation is incomplete.
 */
function httpsLinkOn(hosts: readonly string[]) {
  const hostPattern = hosts.map((host) => host.replace(/\./g, '\\.')).join('|');
  // Printable ASCII only after the host, starting with a path, query or fragment.
  const pattern = new RegExp(
    `^https://([a-z0-9-]+\\.)*(${hostPattern})([/?#][\\x21-\\x7e]*)?$`,
    'i'
  );
  return z
    .string()
    .regex(pattern, `expected an https link on ${hosts.join(' or ')}`)
    .nullable();
}

const message = z.string().trim().min(1).max(MAX_MESSAGE_LENGTH).nullable();

const valueSchemas: {
  [K in AppConfigKey]: z.ZodType<AppConfig[K], z.ZodTypeDef, unknown>;
} = {
  ordering_enabled: z.boolean(),
  ordering_paused_message: message,
  receipt_scan_enabled: z.boolean(),
  uber_eats_url: httpsLinkOn(['ubereats.com']),
  min_supported_version_ios: version,
  min_supported_version_android: version,
  recommended_version: version,
  store_url_ios: httpsLinkOn(['apps.apple.com']),
  store_url_android: httpsLinkOn(['play.google.com']),
  announcement_message: message,
};

const rowsSchema = z.array(z.object({ key: z.string(), value: z.unknown() }));

function isKnownKey(key: string): key is AppConfigKey {
  return Object.prototype.hasOwnProperty.call(valueSchemas, key);
}

function setValue<K extends AppConfigKey>(config: AppConfig, key: K, value: AppConfig[K]): void {
  config[key] = value;
}

/**
 * Validate app_config rows. Each key is checked on its own: a malformed value keeps that
 * key's default, an unknown key is ignored, and both are reported. A payload that is not a
 * list of { key, value } rows gives the defaults. Keys missing from the payload keep their
 * defaults without a report.
 */
export function parseAppConfig(rows: unknown, report: ConfigReporter = () => undefined): AppConfig {
  const config: AppConfig = { ...DEFAULT_APP_CONFIG };

  const parsedRows = rowsSchema.safeParse(rows);
  if (!parsedRows.success) {
    report({
      kind: 'invalid_payload',
      detail: parsedRows.error.issues[0]?.message ?? 'invalid',
    });
    return config;
  }

  for (const row of parsedRows.data) {
    if (!isKnownKey(row.key)) {
      report({
        kind: 'unknown_key',
        key: row.key,
        detail: 'not used by this app version',
      });
      continue;
    }
    const result = valueSchemas[row.key].safeParse(row.value);
    if (result.success) {
      setValue(config, row.key, result.data);
    } else {
      report({
        kind: 'invalid_value',
        key: row.key,
        detail: result.error.issues[0]?.message ?? 'invalid',
      });
    }
  }

  return config;
}

const FIVE_MINUTES = 5 * 60 * 1000;

/**
 * Query options for the raw app_config rows. Parsing happens in the app, so a cached
 * payload is always validated by the schema of the app version that reads it.
 * Refetched every 5 minutes while mounted; the app also refetches it on foreground.
 *
 * There is deliberately no useAppConfig hook here. The mobile app passes these options to its
 * own useQuery: @sisig/api resolves a different copy of React and TanStack Query (react 18.3
 * here, 18.2 in apps/mobile), so a hook from this package would fail there with an invalid
 * hook call.
 */
export function appConfigQueryOptions(client: SupabaseClient<Database>) {
  // Widened to QueryKey so the options can be merged with UseQueryOptions in the hook.
  const queryKey: QueryKey = keys.config.app();

  return queryOptions({
    queryKey,
    queryFn: async (): Promise<AppConfigRow[]> => {
      const { data, error } = await client.from('app_config').select('key, value');

      if (error) {
        throw normalizeError(error);
      }

      return data ?? [];
    },
    staleTime: FIVE_MINUTES,
    // TanStack's focusManager is not wired to AppState in the app, so this interval also
    // runs while the app is in the background, for as long as its JS is alive. One small
    // request every 5 minutes; accepted.
    refetchInterval: FIVE_MINUTES,
    gcTime: Infinity,
  });
}
