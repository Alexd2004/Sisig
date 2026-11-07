import Constants from 'expo-constants';

/**
 * The installed app version (x.y.z), or null when it is unknown.
 *
 * Seam for the forced-update gate. expo-application (the true native version) is not
 * installed, and adding it needs a dev client rebuild, so this reads the version from the
 * app config embedded at build time (app.json "version") through expo-constants.
 * Without expo-updates that is the version of the installed build. When expo-updates is
 * added (DEVOPS-05), an update could carry a different "version", so switch this to
 * expo-application's nativeApplicationVersion at the same time.
 */
export function getInstalledVersion(): string | null {
  const version = Constants.expoConfig?.version;
  return typeof version === 'string' && version.length > 0 ? version : null;
}
