import type { AppConfig, ConfigReporter } from '@sisig/api';
import { compareVersions, parseVersion } from './versions';

/** Where the config came from: this session's fetch, the disk cache, or the bundled defaults. */
export type ConfigSource = 'server' | 'cache' | 'defaults';

export type UpdateGate =
  | { status: 'none' }
  | { status: 'blocked'; storeUrl: string }
  | { status: 'soft'; storeUrl: string | null };

export interface UpdateGateInput {
  installedVersion: string | null;
  platform: string;
  config: AppConfig;
  source: ConfigSource;
}

const NONE: UpdateGate = { status: 'none' };

/**
 * Decide whether the installed version must update (blocking screen) or should update
 * (soft banner). Fail-open: the bundled defaults, an unknown installed version, a platform
 * other than iOS or Android, and a missing store URL never block.
 */
export function evaluateUpdateGate(
  { installedVersion, platform, config, source }: UpdateGateInput,
  report: ConfigReporter = () => undefined
): UpdateGate {
  if (source === 'defaults' || (platform !== 'ios' && platform !== 'android')) {
    return NONE;
  }
  const installed = parseVersion(installedVersion);
  if (installed === null) {
    return NONE;
  }

  const isIos = platform === 'ios';
  const storeUrl = isIos ? config.store_url_ios : config.store_url_android;
  const minimum = parseVersion(
    isIos ? config.min_supported_version_ios : config.min_supported_version_android
  );

  if (minimum !== null && compareVersions(installed, minimum) < 0) {
    if (storeUrl !== null) {
      return { status: 'blocked', storeUrl };
    }
    // A blocking screen without a store link would trap the user, so fail open.
    report({
      kind: 'missing_store_url',
      key: isIos ? 'store_url_ios' : 'store_url_android',
      detail:
        'the installed version is below the minimum but there is no store URL, so the app is not blocked',
    });
  }

  const recommended = parseVersion(config.recommended_version);
  if (recommended !== null && compareVersions(installed, recommended) < 0) {
    return { status: 'soft', storeUrl };
  }
  return NONE;
}
