import { DEFAULT_APP_CONFIG, type AppConfig, type ConfigIssue } from '@sisig/api';
import { evaluateUpdateGate, type ConfigSource } from './update-gate';

const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.sisig.mobile';
const APP_STORE_URL = 'https://apps.apple.com/app/id123';

function config(overrides: Partial<AppConfig>): AppConfig {
  return { ...DEFAULT_APP_CONFIG, store_url_ios: APP_STORE_URL, ...overrides };
}

function gate(
  installedVersion: string | null,
  overrides: Partial<AppConfig>,
  { platform = 'android', source = 'server' }: { platform?: string; source?: ConfigSource } = {}
) {
  const issues: ConfigIssue[] = [];
  const result = evaluateUpdateGate(
    { installedVersion, platform, config: config(overrides), source },
    (issue) => issues.push(issue)
  );
  return { result, issues };
}

describe('evaluateUpdateGate', () => {
  it('blocks an Android install below the Android minimum, with the Play link', () => {
    expect(gate('1.0.0', { min_supported_version_android: '1.1.0' }).result).toEqual({
      status: 'blocked',
      storeUrl: PLAY_URL,
    });
  });

  it('blocks an iOS install below the iOS minimum, with the App Store link', () => {
    expect(
      gate('1.0.0', { min_supported_version_ios: '2.0.0' }, { platform: 'ios' }).result
    ).toEqual({ status: 'blocked', storeUrl: APP_STORE_URL });
  });

  it('uses only the minimum of the running platform', () => {
    expect(gate('1.0.0', { min_supported_version_ios: '9.0.0' }).result).toEqual({
      status: 'none',
    });
  });

  it('does not block at exactly the minimum version', () => {
    expect(gate('1.1.0', { min_supported_version_android: '1.1.0' }).result).toEqual({
      status: 'none',
    });
  });

  it('blocks from a cached config too (it came from the server earlier)', () => {
    expect(
      gate('1.0.0', { min_supported_version_android: '1.1.0' }, { source: 'cache' }).result.status
    ).toBe('blocked');
  });

  it('never blocks on the bundled defaults, whatever they say', () => {
    expect(
      gate(
        '1.0.0',
        {
          min_supported_version_android: '9.0.0',
          recommended_version: '9.0.0',
        },
        {
          source: 'defaults',
        }
      ).result
    ).toEqual({ status: 'none' });
  });

  it('the real bundled defaults block nothing', () => {
    const result = evaluateUpdateGate({
      installedVersion: '0.0.1',
      platform: 'android',
      config: DEFAULT_APP_CONFIG,
      source: 'server',
    });
    expect(result).toEqual({ status: 'none' });
  });

  it.each([[null], ['dev'], ['1.0']])(
    'fails open when the installed version is %p',
    (installed) => {
      expect(gate(installed, { min_supported_version_android: '9.0.0' }).result).toEqual({
        status: 'none',
      });
    }
  );

  it('fails open on web', () => {
    expect(
      gate('1.0.0', { min_supported_version_android: '9.0.0' }, { platform: 'web' }).result
    ).toEqual({
      status: 'none',
    });
  });

  it('fails open and reports when the store URL is missing', () => {
    const { result, issues } = gate('1.0.0', {
      min_supported_version_android: '2.0.0',
      store_url_android: null,
    });

    expect(result).toEqual({ status: 'none' });
    expect(issues).toEqual([
      expect.objectContaining({
        kind: 'missing_store_url',
        key: 'store_url_android',
      }),
    ]);
  });

  it('falls back to the soft banner when blocking is impossible but an update is recommended', () => {
    const { result } = gate('1.0.0', {
      min_supported_version_android: '2.0.0',
      recommended_version: '2.0.0',
      store_url_android: null,
    });

    expect(result).toEqual({ status: 'soft', storeUrl: null });
  });

  it('shows the soft banner below the recommended version only', () => {
    expect(gate('1.0.0', { recommended_version: '1.2.0' }).result).toEqual({
      status: 'soft',
      storeUrl: PLAY_URL,
    });
    expect(gate('1.2.0', { recommended_version: '1.2.0' }).result).toEqual({
      status: 'none',
    });
  });

  it('prefers the blocking screen when both thresholds apply', () => {
    expect(
      gate('1.0.0', {
        min_supported_version_android: '1.1.0',
        recommended_version: '1.5.0',
      }).result.status
    ).toBe('blocked');
  });
});
