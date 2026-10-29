import type { SessionStatus } from '../session/session';

/** Tab paths a signed-out guest may be sent back to after signing in. */
export const TAB_PATHS: readonly string[] = ['/home', '/order', '/rewards', '/code', '/more'];

export const SIGNED_IN_HOME_PATH = '/home';

/**
 * Only in-app tab paths are accepted as a return target, so a `returnTo`
 * query param can never send the user outside the app's own tabs.
 */
export function sanitizeReturnTo(value: unknown): string | null {
  return typeof value === 'string' && TAB_PATHS.includes(value) ? value : null;
}

interface AuthRedirectInput {
  status: SessionStatus;
  segments: readonly string[];
  returnTo: unknown;
}

/**
 * Returns the path a signed-in user should be sent to, or null when no
 * redirect is needed.
 *
 * Guests may browse Home and More, and Rewards and Code show a sign-in prompt
 * from their own layouts. Signed-in users never stay on the auth stack, and
 * they land back on the tab they asked for when one was supplied.
 */
export function resolveAuthRedirect({
  status,
  segments,
  returnTo,
}: AuthRedirectInput): string | null {
  if (status !== 'signed-in') {
    return null;
  }

  if (segments[0] === '(auth)') {
    return sanitizeReturnTo(returnTo) ?? SIGNED_IN_HOME_PATH;
  }

  return null;
}
