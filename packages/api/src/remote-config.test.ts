import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { AppError } from './client';
import { createQueryClient } from './query-client';
import { keys } from './query-keys';
import {
  appConfigQueryOptions,
  DEFAULT_APP_CONFIG,
  parseAppConfig,
  type ConfigIssue,
} from './remote-config';

function collect(): {
  issues: ConfigIssue[];
  report: (issue: ConfigIssue) => void;
} {
  const issues: ConfigIssue[] = [];
  return { issues, report: (issue) => issues.push(issue) };
}

describe('parseAppConfig', () => {
  it('returns the bundled defaults for an empty payload, without reports', () => {
    const { issues, report } = collect();

    expect(parseAppConfig([], report)).toEqual(DEFAULT_APP_CONFIG);
    expect(issues).toEqual([]);
  });

  it('bundles fail-open defaults: everything on, no version blocked', () => {
    expect(DEFAULT_APP_CONFIG.ordering_enabled).toBe(true);
    expect(DEFAULT_APP_CONFIG.receipt_scan_enabled).toBe(true);
    expect(DEFAULT_APP_CONFIG.min_supported_version_ios).toBe('0.0.0');
    expect(DEFAULT_APP_CONFIG.min_supported_version_android).toBe('0.0.0');
    expect(DEFAULT_APP_CONFIG.recommended_version).toBe('0.0.0');
  });

  it('reads every valid value', () => {
    const { issues, report } = collect();
    const config = parseAppConfig(
      [
        { key: 'ordering_enabled', value: false },
        { key: 'ordering_paused_message', value: '  Back at 5 pm  ' },
        { key: 'receipt_scan_enabled', value: false },
        { key: 'uber_eats_url', value: 'https://www.ubereats.com/store/sisig' },
        { key: 'min_supported_version_ios', value: '1.2.0' },
        { key: 'min_supported_version_android', value: '1.3.0' },
        { key: 'recommended_version', value: '1.4.0' },
        { key: 'store_url_ios', value: 'https://apps.apple.com/app/id123' },
        { key: 'store_url_android', value: null },
        { key: 'announcement_message', value: 'New menu!' },
      ],
      report
    );

    expect(config).toEqual({
      ordering_enabled: false,
      ordering_paused_message: 'Back at 5 pm',
      receipt_scan_enabled: false,
      uber_eats_url: 'https://www.ubereats.com/store/sisig',
      min_supported_version_ios: '1.2.0',
      min_supported_version_android: '1.3.0',
      recommended_version: '1.4.0',
      store_url_ios: 'https://apps.apple.com/app/id123',
      store_url_android: null,
      announcement_message: 'New menu!',
    });
    expect(issues).toEqual([]);
  });

  it.each([
    ['ordering_enabled', 'false'],
    ['ordering_enabled', null],
    ['ordering_paused_message', '   '],
    ['ordering_paused_message', 'x'.repeat(281)],
    ['uber_eats_url', 'http://insecure.example.com'],
    ['uber_eats_url', 'not a url'],
    ['min_supported_version_ios', '1.2'],
    ['min_supported_version_android', 2],
    ['recommended_version', 'v1.0.0'],
    ['store_url_ios', 'javascript:alert(1)'],
    ['store_url_ios', 'https://apps.apple.com.evil.example/app'],
    ['store_url_android', 'https://evil.example.com/details?id=com.sisig.mobile'],
    ['store_url_android', 'https://play.google.com/store apps'],
    ['uber_eats_url', 'https://notubereats.com/store'],
    ['store_url_android', 'https://play.google.com/store\u0000x'],
    ['announcement_message', { text: 'hi' }],
  ])('keeps the default and reports when %s is %p', (key, value) => {
    const { issues, report } = collect();
    const config = parseAppConfig(
      [
        { key, value },
        { key: 'receipt_scan_enabled', value: false },
      ],
      report
    );

    expect(config).toEqual({
      ...DEFAULT_APP_CONFIG,
      receipt_scan_enabled: false,
    });
    expect(issues).toEqual([expect.objectContaining({ kind: 'invalid_value', key })]);
  });

  it('accepts its own default store link', () => {
    const { issues, report } = collect();
    parseAppConfig(
      [{ key: 'store_url_android', value: DEFAULT_APP_CONFIG.store_url_android }],
      report
    );

    expect(issues).toEqual([]);
  });

  it('ignores and reports an unknown key', () => {
    const { issues, report } = collect();
    const config = parseAppConfig([{ key: 'loyalty_double_points', value: true }], report);

    expect(config).toEqual(DEFAULT_APP_CONFIG);
    expect(issues).toEqual([
      expect.objectContaining({
        kind: 'unknown_key',
        key: 'loyalty_double_points',
      }),
    ]);
  });

  it('does not treat inherited object properties as keys', () => {
    const { issues, report } = collect();
    parseAppConfig([{ key: 'toString', value: true }], report);

    expect(issues).toEqual([expect.objectContaining({ kind: 'unknown_key', key: 'toString' })]);
  });

  it.each([[null], [undefined], ['rows'], [{ key: 'ordering_enabled' }], [[{ value: true }]]])(
    'gives the defaults and reports a malformed payload (%p)',
    (payload) => {
      const { issues, report } = collect();

      expect(parseAppConfig(payload, report)).toEqual(DEFAULT_APP_CONFIG);
      expect(issues).toEqual([expect.objectContaining({ kind: 'invalid_payload' })]);
    }
  );

  it('works without a reporter', () => {
    expect(parseAppConfig([{ key: 'ordering_enabled', value: 'no' }])).toEqual(DEFAULT_APP_CONFIG);
  });
});

describe('appConfigQueryOptions', () => {
  function mockSupabase(result: { data: unknown; error: unknown }) {
    const select = jest.fn().mockResolvedValue(result);
    const from = jest.fn().mockReturnValue({ select });
    const client = { from } as unknown as SupabaseClient<Database>;
    return { client, from, select };
  }

  it('uses the config key, a 5 minute staleTime and refetchInterval, and is never collected', () => {
    const options = appConfigQueryOptions(mockSupabase({ data: [], error: null }).client);

    expect(options.queryKey).toEqual(keys.config.app());
    expect(options.staleTime).toBe(5 * 60 * 1000);
    expect(options.refetchInterval).toBe(5 * 60 * 1000);
    expect(options.gcTime).toBe(Infinity);
  });

  it('returns the raw key and value rows', async () => {
    const rows = [{ key: 'ordering_enabled', value: false }];
    const { client, from, select } = mockSupabase({ data: rows, error: null });

    const data = await createQueryClient().fetchQuery(appConfigQueryOptions(client));

    expect(data).toEqual(rows);
    expect(from).toHaveBeenCalledWith('app_config');
    expect(select).toHaveBeenCalledWith('key, value');
  });

  it('rejects with a normalized AppError', async () => {
    const { client } = mockSupabase({
      data: null,
      error: {
        code: '42501',
        message: 'permission denied for table app_config',
        details: '',
        hint: '',
      },
    });

    await expect(
      createQueryClient().fetchQuery({
        ...appConfigQueryOptions(client),
        retry: false,
      })
    ).rejects.toBeInstanceOf(AppError);
  });
});
