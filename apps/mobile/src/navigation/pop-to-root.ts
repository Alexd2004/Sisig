/**
 * The subset of a tab screen's navigation object needed to pop that tab's
 * stack back to its root. Matches React Navigation's screen navigation API.
 */
export interface TabNavigationLike {
  isFocused: () => boolean;
  getState: () => {
    routes: { key: string; state?: { key: string } }[];
  };
  dispatch: (action: { type: 'POP_TO_TOP'; target: string }) => void;
}

/**
 * Tapping the already-active tab pops its nested stack to the root screen.
 * Inactive tabs are left alone, so their own stacks are kept when the user
 * switches to them.
 */
export function popTabStackToRoot(navigation: TabNavigationLike, tabRouteKey: string): void {
  if (!navigation.isFocused()) {
    return;
  }

  const tabRoute = navigation.getState().routes.find((route) => route.key === tabRouteKey);
  const stackKey = tabRoute?.state?.key;
  if (stackKey === undefined) {
    return;
  }

  // Targeting the nested stack by key keeps the action away from other tabs' stacks.
  navigation.dispatch({ type: 'POP_TO_TOP', target: stackKey });
}
