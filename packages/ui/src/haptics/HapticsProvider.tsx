import React, { createContext, useContext } from 'react';

/**
 * Haptic feedback seam. expo-haptics is not installed yet (it is a native module
 * and would force a dev client rebuild), so the default implementation does
 * nothing. UXQ-08 wires the real implementation by wrapping the app in
 * HapticsProvider, for example:
 *
 *   // Module level (or memoized), so the context value is stable across renders.
 *   const haptics = {
 *     impactLight: () => {
 *       // impactAsync returns a promise; never let a haptics failure surface as an error.
 *       Haptics.impactAsync(ImpactFeedbackStyle.Light).catch(() => undefined);
 *     },
 *   };
 *   <HapticsProvider value={haptics}>
 */
export interface Haptics {
  /** Light impact, used on primary actions per the haptics convention. */
  impactLight(): void;
}

const noopHaptics: Haptics = {
  impactLight: () => undefined,
};

const HapticsContext = createContext<Haptics>(noopHaptics);

interface HapticsProviderProps {
  value: Haptics;
  children: React.ReactNode;
}

export function HapticsProvider({ value, children }: HapticsProviderProps): JSX.Element {
  return <HapticsContext.Provider value={value}>{children}</HapticsContext.Provider>;
}

/** The active haptics implementation (a no-op unless a HapticsProvider is mounted). */
export function useHaptics(): Haptics {
  return useContext(HapticsContext);
}
