import type { Insets } from 'react-native';

/** Minimum touch target (pt) for every interactive component, per Apple HIG and WCAG 2.5.8. */
export const MIN_TOUCH_TARGET = 44;

/**
 * Opacity of a pressed control that has no dedicated pressed token. A
 * surface -> surfaceMuted swap alone is barely visible in the light theme, so
 * pressed controls also dim to give perceivable feedback.
 */
export const PRESSED_OPACITY = 0.7;

/** Opacity of a disabled control. WCAG contrast rules exempt disabled controls. */
export const DISABLED_OPACITY = 0.5;

/**
 * Extra hit area that grows a visual box of `size` pt up to MIN_TOUCH_TARGET on
 * every side. Returns undefined when the box is already large enough.
 */
export function hitSlopFor(size: number): Insets | undefined {
  const extra = Math.max(0, Math.ceil((MIN_TOUCH_TARGET - size) / 2));
  if (extra === 0) {
    return undefined;
  }
  return { top: extra, bottom: extra, left: extra, right: extra };
}
