import type { ConfigIssue, ConfigReporter } from '@sisig/api';

/** Default reporter: a console warning in development builds, nothing in release builds. */
const devConsoleReporter: ConfigReporter = (issue) => {
  if (__DEV__) {
    const key = issue.key ? ` (${issue.key})` : '';
    console.warn(`Remote config ${issue.kind}${key}: ${issue.detail}`);
  }
};

let currentReporter: ConfigReporter = devConsoleReporter;

/**
 * Replace the remote-config reporter. This is the seam for Sentry: PLAT-04 calls it once
 * Sentry is initialised, for example sending each issue as a Sentry message.
 * Pass null to restore the default.
 */
export function setConfigReporter(reporter: ConfigReporter | null): void {
  currentReporter = reporter ?? devConsoleReporter;
}

/** Report a remote-config problem to the current reporter. A failing reporter is ignored. */
export function reportConfigIssue(issue: ConfigIssue): void {
  try {
    currentReporter(issue);
  } catch {
    // Reporting must never break config loading.
  }
}
