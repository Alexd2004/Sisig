import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';
import { Button, ButtonVariant } from './Button';
import { MIN_TOUCH_TARGET, PRESSED_OPACITY } from './a11y';
import { HapticsProvider } from './haptics/HapticsProvider';
import { darkTheme, lightTheme } from './theme/brand';
import { renderWithTheme, settlePromises } from './test-utils';

function deferred(): {
  promise: Promise<void>;
  resolve: () => void;
  reject: (e: Error) => void;
} {
  let resolve!: () => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const never = (): Promise<void> => new Promise<void>(() => undefined);

describe('Button variants', () => {
  const fill = (variant: ButtonVariant, scheme: 'light' | 'dark', pressed = false): object => {
    const { UNSAFE_getByType } = renderWithTheme(
      <Button title="Go" variant={variant} onPress={jest.fn()} />,
      scheme
    );
    return StyleSheet.flatten(UNSAFE_getByType(Pressable).props.style({ pressed }));
  };

  it.each([
    ['light', lightTheme],
    ['dark', darkTheme],
  ] as const)('maps each variant to semantic tokens in the %s theme', (scheme, theme) => {
    expect(fill('primary', scheme)).toMatchObject({
      backgroundColor: theme.primary,
    });
    expect(fill('secondary', scheme)).toMatchObject({
      backgroundColor: theme.surface,
      borderColor: theme.primary,
    });
    expect(fill('secondary', scheme, true)).toMatchObject({
      backgroundColor: theme.surfaceMuted,
    });
    expect(fill('ghost', scheme)).toMatchObject({
      backgroundColor: 'transparent',
    });
    expect(fill('ghost', scheme, true)).toMatchObject({
      backgroundColor: theme.surfaceMuted,
    });
    expect(fill('destructive', scheme)).toMatchObject({
      backgroundColor: theme.danger,
    });
  });

  it.each([
    ['secondary', 'primary'],
    ['ghost', 'primary'],
    ['destructive', 'dangerForeground'],
  ] as const)('%s label uses the %s token', (variant, token) => {
    const { getByText } = renderWithTheme(
      <Button title="Go" variant={variant} onPress={jest.fn()} />,
      'dark'
    );
    expect(StyleSheet.flatten(getByText('Go').props.style)).toMatchObject({
      color: darkTheme[token],
    });
  });

  it('dims variants without a pressed token while pressed, but not primary', () => {
    expect(fill('secondary', 'light', true)).toMatchObject({ opacity: PRESSED_OPACITY });
    expect(fill('ghost', 'light', true)).toMatchObject({ opacity: PRESSED_OPACITY });
    expect(fill('destructive', 'light', true)).toMatchObject({ opacity: PRESSED_OPACITY });
    expect(fill('primary', 'light', true)).not.toHaveProperty('opacity');
    expect(fill('secondary', 'light', false)).not.toHaveProperty('opacity');
  });

  it('has a minimum 44x44pt touch target', () => {
    const { UNSAFE_getByType } = renderWithTheme(<Button title="Go" onPress={jest.fn()} />);
    expect(
      StyleSheet.flatten(UNSAFE_getByType(Pressable).props.style({ pressed: false }))
    ).toMatchObject({
      minHeight: MIN_TOUCH_TARGET,
      minWidth: MIN_TOUCH_TARGET,
    });
  });
});

describe('Button loading and double submit', () => {
  it('shows the busy state and ignores presses while an async onPress is pending', async () => {
    const pending = deferred();
    const onPress = jest.fn(() => pending.promise);
    const { getByRole, getByTestId, queryByTestId } = renderWithTheme(
      <Button title="Pay" testID="pay" onPress={onPress} />
    );

    fireEvent.press(getByRole('button', { name: 'Pay' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(getByRole('button', { name: 'Pay' }).props.accessibilityState).toMatchObject({
      busy: true,
      disabled: true,
    });
    expect(getByTestId('pay-spinner')).toBeTruthy();

    fireEvent.press(getByRole('button', { name: 'Pay' }));
    expect(onPress).toHaveBeenCalledTimes(1);

    pending.resolve();
    await settlePromises();

    expect(getByRole('button', { name: 'Pay' }).props.accessibilityState).toMatchObject({
      busy: false,
      disabled: false,
    });
    expect(queryByTestId('pay-spinner')).toBeNull();
    // The guard re-arms once the first call settles.
    // The user can retry.
    fireEvent.press(getByRole('button', { name: 'Pay' }));
    expect(onPress).toHaveBeenCalledTimes(2);
    await settlePromises();
  });

  it('blocks a second press delivered before React re-renders', () => {
    const onPress = jest.fn(never);
    const { UNSAFE_getByType } = renderWithTheme(<Button title="Pay" onPress={onPress} />);
    // Both calls hit the same handler closure, like two taps in one frame.
    const handler = UNSAFE_getByType(Pressable).props.onPress;
    act(() => {
      handler();
      handler();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('clears the busy state when the async onPress rejects, without swallowing the error', async () => {
    const pending = deferred();
    const onPress = jest
      .fn<Promise<void>, []>()
      .mockImplementationOnce(() => pending.promise)
      .mockImplementation(() => Promise.resolve());
    const { getByRole, UNSAFE_getByType } = renderWithTheme(
      <Button title="Pay" onPress={onPress} />
    );

    let settled: Promise<unknown> | undefined;
    act(() => {
      settled = UNSAFE_getByType(Pressable).props.onPress();
    });
    // The rejection still propagates (Pressable ignores it, so it reaches global reporting).
    await act(async () => {
      pending.reject(new Error('network'));
      await expect(settled).rejects.toThrow('network');
    });

    expect(getByRole('button', { name: 'Pay' }).props.accessibilityState).toMatchObject({
      busy: false,
      disabled: false,
    });
    // The user can retry.
    fireEvent.press(getByRole('button', { name: 'Pay' }));
    expect(onPress).toHaveBeenCalledTimes(2);
    await settlePromises();
  });

  it('stays enabled after a synchronous onPress', () => {
    const onPress = jest.fn();
    const { getByRole } = renderWithTheme(<Button title="Go" onPress={onPress} />);
    fireEvent.press(getByRole('button', { name: 'Go' }));
    fireEvent.press(getByRole('button', { name: 'Go' }));
    expect(onPress).toHaveBeenCalledTimes(2);
    expect(getByRole('button', { name: 'Go' }).props.accessibilityState).toMatchObject({
      busy: false,
      disabled: false,
    });
  });

  it('shows the busy state and blocks presses when loading is set', () => {
    const onPress = jest.fn();
    const { getByRole } = renderWithTheme(<Button title="Go" loading onPress={onPress} />);
    const button = getByRole('button', { name: 'Go' });
    expect(button.props.accessibilityState).toMatchObject({
      busy: true,
      disabled: true,
    });
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Button haptics', () => {
  it('fires a light impact on primary presses only', () => {
    const haptics = { impactLight: jest.fn() };
    const { getByRole } = renderWithTheme(
      <HapticsProvider value={haptics}>
        <Button title="Primary" onPress={jest.fn()} />
        <Button title="Secondary" variant="secondary" onPress={jest.fn()} />
      </HapticsProvider>
    );
    fireEvent.press(getByRole('button', { name: 'Secondary' }));
    expect(haptics.impactLight).not.toHaveBeenCalled();
    fireEvent.press(getByRole('button', { name: 'Primary' }));
    expect(haptics.impactLight).toHaveBeenCalledTimes(1);
  });

  it('does not fire for a press ignored while pending', () => {
    const haptics = { impactLight: jest.fn() };
    const { UNSAFE_getByType } = renderWithTheme(
      <HapticsProvider value={haptics}>
        <Button title="Pay" onPress={never} />
      </HapticsProvider>
    );
    const handler = UNSAFE_getByType(Pressable).props.onPress;
    act(() => {
      handler();
      handler();
    });
    expect(haptics.impactLight).toHaveBeenCalledTimes(1);
  });

  it('is a no-op without a HapticsProvider', () => {
    const { getByRole } = renderWithTheme(<Button title="Go" onPress={jest.fn()} />);
    expect(() => fireEvent.press(getByRole('button', { name: 'Go' }))).not.toThrow();
  });
});
