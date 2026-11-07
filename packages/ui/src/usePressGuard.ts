import { useCallback, useRef, useState } from 'react';

export type PressHandler = () => void | Promise<unknown>;

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function'
  );
}

/**
 * Wraps a press handler so an async handler cannot run twice at once.
 *
 * While the promise returned by `onPress` is pending, `pending` is true and
 * further presses are ignored. The guard is a ref, so two presses delivered in
 * the same frame (before React re-renders) are still blocked.
 *
 * A rejected promise clears the pending state and is not swallowed: it
 * surfaces as an unhandled rejection, exactly as if the handler had been passed
 * to a plain Pressable (a LogBox warning in dev; in release it is only reported
 * if a crash reporter is installed). Handlers must catch their own errors to
 * show error UI. `handlePress` returns that
 * settled-state promise (Pressable ignores it), which lets tests observe it.
 */
export function usePressGuard(
  onPress: PressHandler | undefined,
  /** Runs just before an accepted press calls `onPress` (used for haptics). */
  onAccepted?: () => void
): {
  pending: boolean;
  handlePress: () => Promise<unknown> | undefined;
} {
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);

  const handlePress = useCallback(() => {
    if (pendingRef.current || !onPress) {
      return undefined;
    }
    onAccepted?.();
    const result = onPress();
    if (!isThenable(result)) {
      return undefined;
    }
    pendingRef.current = true;
    setPending(true);
    // React 18 ignores a state update after unmount, so no mounted check is needed.
    return Promise.resolve(result).finally(() => {
      pendingRef.current = false;
      setPending(false);
    });
  }, [onPress, onAccepted]);

  return { pending, handlePress };
}
