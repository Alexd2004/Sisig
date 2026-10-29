import { popTabStackToRoot, type TabNavigationLike } from './pop-to-root';

function fakeNavigation(options: { focused: boolean; stackKey?: string }): {
  navigation: TabNavigationLike;
  dispatch: jest.Mock;
} {
  const dispatch = jest.fn();
  const navigation: TabNavigationLike = {
    isFocused: () => options.focused,
    getState: () => ({
      routes: [
        {
          key: 'home-route',
          state: options.stackKey === undefined ? undefined : { key: options.stackKey },
        },
        { key: 'order-route' },
      ],
    }),
    dispatch,
  };
  return { navigation, dispatch };
}

describe('popTabStackToRoot', () => {
  it('pops the active tab stack to its root', () => {
    const { navigation, dispatch } = fakeNavigation({ focused: true, stackKey: 'home-stack' });

    popTabStackToRoot(navigation, 'home-route');

    expect(dispatch).toHaveBeenCalledWith({ type: 'POP_TO_TOP', target: 'home-stack' });
  });

  it('does nothing when the tab is not the active one', () => {
    const { navigation, dispatch } = fakeNavigation({ focused: false, stackKey: 'home-stack' });

    popTabStackToRoot(navigation, 'home-route');

    expect(dispatch).not.toHaveBeenCalled();
  });

  it('does nothing when the tab has never rendered a stack', () => {
    const { navigation, dispatch } = fakeNavigation({ focused: true });

    popTabStackToRoot(navigation, 'home-route');

    expect(dispatch).not.toHaveBeenCalled();
  });
});
