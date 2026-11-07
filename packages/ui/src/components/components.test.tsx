import React from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
} from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MIN_TOUCH_TARGET, PRESSED_OPACITY } from '../a11y';
import { brandFonts, darkTheme, lightTheme } from '../theme/brand';
import { renderWithTheme, settlePromises } from '../test-utils';
import { Badge, Chip } from './Badge';
import { Card } from './Card';
import { Divider } from './Divider';
import { Heading } from './Heading';
import { IconButton } from './IconButton';
import { ListItem } from './ListItem';
import { Points } from './Points';
import { Price } from './Price';
import { Screen } from './Screen';
import { SectionHeader } from './SectionHeader';

const pressableStyle = (node: { props: { style: unknown } }, pressed = false): object => {
  const { style } = node.props;
  return StyleSheet.flatten(typeof style === 'function' ? style({ pressed }) : style);
};

describe('Heading', () => {
  it('is announced as a header in the brand heading font', () => {
    const { getByRole } = renderWithTheme(<Heading level={2}>Rewards</Heading>);
    const heading = getByRole('header', { name: 'Rewards' });
    expect(StyleSheet.flatten(heading.props.style)).toMatchObject({
      fontFamily: brandFonts.heading,
      fontSize: 22,
    });
  });
});

describe('Screen', () => {
  it('insets the safe area, avoids the keyboard and scrolls by default', () => {
    const { UNSAFE_getByType, getByText } = renderWithTheme(
      <Screen>
        <RNText>Body</RNText>
      </Screen>,
      'dark'
    );
    const safeArea = UNSAFE_getByType(SafeAreaView);
    expect(safeArea.props.edges).toEqual(['top', 'right', 'bottom', 'left']);
    expect(StyleSheet.flatten(safeArea.props.style)).toMatchObject({
      backgroundColor: darkTheme.background,
    });
    expect(UNSAFE_getByType(KeyboardAvoidingView)).toBeTruthy();
    expect(UNSAFE_getByType(ScrollView).props.keyboardShouldPersistTaps).toBe('handled');
    expect(getByText('Body')).toBeTruthy();
  });

  it('can render without scrolling or keyboard avoidance and with custom edges', () => {
    const { UNSAFE_queryByType, UNSAFE_getByType } = renderWithTheme(
      <Screen scroll={false} keyboardAvoiding={false} edges={['bottom']}>
        <RNText>Body</RNText>
      </Screen>
    );
    expect(UNSAFE_queryByType(ScrollView)).toBeNull();
    expect(UNSAFE_queryByType(KeyboardAvoidingView)).toBeNull();
    expect(UNSAFE_getByType(SafeAreaView).props.edges).toEqual(['bottom']);
  });

  it('passes the header offset to keyboard avoidance (0 by default)', () => {
    const { UNSAFE_getByType, rerender } = renderWithTheme(
      <Screen>
        <RNText>Body</RNText>
      </Screen>
    );
    expect(UNSAFE_getByType(KeyboardAvoidingView).props.keyboardVerticalOffset).toBe(0);
    rerender(
      <Screen keyboardVerticalOffset={64}>
        <RNText>Body</RNText>
      </Screen>
    );
    expect(UNSAFE_getByType(KeyboardAvoidingView).props.keyboardVerticalOffset).toBe(64);
  });
});

describe('IconButton', () => {
  it('exposes role, required label and a 44pt target even when drawn smaller', () => {
    const { getByRole } = renderWithTheme(
      <IconButton
        icon={<RNText>x</RNText>}
        accessibilityLabel="Close"
        size={24}
        onPress={jest.fn()}
      />
    );
    const button = getByRole('button', { name: 'Close' });
    expect(button.props.hitSlop).toEqual({
      top: 10,
      bottom: 10,
      left: 10,
      right: 10,
    });
    expect(button.props.accessibilityState).toMatchObject({
      disabled: false,
      busy: false,
    });
  });

  it('has no hitSlop at the default 44pt size', () => {
    const { getByRole } = renderWithTheme(
      <IconButton icon={<RNText>x</RNText>} accessibilityLabel="Close" onPress={jest.fn()} />
    );
    const button = getByRole('button', { name: 'Close' });
    expect(button.props.hitSlop).toBeUndefined();
    expect(pressableStyle(button)).toMatchObject({
      width: MIN_TOUCH_TARGET,
      height: MIN_TOUCH_TARGET,
    });
  });

  it('blocks presses when disabled', () => {
    const onPress = jest.fn();
    const { getByRole } = renderWithTheme(
      <IconButton icon={<RNText>x</RNText>} accessibilityLabel="Close" disabled onPress={onPress} />
    );
    fireEvent.press(getByRole('button', { name: 'Close', disabled: true }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('is busy and ignores presses while an async onPress is pending', async () => {
    let resolve!: () => void;
    const onPress = jest.fn(() => new Promise<void>((res) => (resolve = res)));
    const { getByRole, queryByText } = renderWithTheme(
      <IconButton icon={<RNText>x</RNText>} accessibilityLabel="Refresh" onPress={onPress} />
    );
    fireEvent.press(getByRole('button', { name: 'Refresh' }));
    fireEvent.press(getByRole('button', { name: 'Refresh' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(getByRole('button', { name: 'Refresh' }).props.accessibilityState).toMatchObject({
      busy: true,
    });
    expect(queryByText('x')).toBeNull();
    resolve();
    await settlePromises();
    expect(getByRole('button', { name: 'Refresh' }).props.accessibilityState).toMatchObject({
      busy: false,
    });
  });
});

describe('IconButton secondary', () => {
  it('draws its edge in foregroundMuted (3:1 non-text contrast) and dims while pressed', () => {
    const { UNSAFE_getByType } = renderWithTheme(
      <IconButton
        icon={<RNText>x</RNText>}
        accessibilityLabel="Close"
        variant="secondary"
        onPress={jest.fn()}
      />,
      'dark'
    );
    const pressable = UNSAFE_getByType(Pressable);
    expect(pressableStyle(pressable)).toMatchObject({ borderColor: darkTheme.foregroundMuted });
    expect(pressableStyle(pressable, true)).toMatchObject({ opacity: PRESSED_OPACITY });
  });
});

describe('Card', () => {
  it('is a plain container without onPress', () => {
    const { queryByRole, getByTestId } = renderWithTheme(
      <Card testID="card">
        <RNText>Body</RNText>
      </Card>,
      'dark'
    );
    expect(queryByRole('button')).toBeNull();
    expect(StyleSheet.flatten(getByTestId('card').props.style)).toMatchObject({
      backgroundColor: darkTheme.surface,
    });
  });

  it('becomes one labelled 44pt button with onPress', () => {
    const onPress = jest.fn();
    const { getByRole, UNSAFE_getByType } = renderWithTheme(
      <Card accessibilityLabel="Free coffee reward" onPress={onPress}>
        <RNText>Free coffee</RNText>
      </Card>
    );
    const card = getByRole('button', { name: 'Free coffee reward' });
    expect(pressableStyle(card)).toMatchObject({ minHeight: MIN_TOUCH_TARGET });
    expect(pressableStyle(UNSAFE_getByType(Pressable), true)).toMatchObject({
      backgroundColor: lightTheme.surfaceMuted,
      opacity: PRESSED_OPACITY,
    });
    fireEvent.press(card);
    expect(onPress).toHaveBeenCalled();
  });

  it('exposes and enforces the disabled state', () => {
    const onPress = jest.fn();
    const { getByRole } = renderWithTheme(
      <Card accessibilityLabel="Reward" disabled onPress={onPress}>
        <RNText>Reward</RNText>
      </Card>
    );
    fireEvent.press(getByRole('button', { name: 'Reward', disabled: true }));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('ListItem', () => {
  it('labels a pressable row with its title and subtitle', () => {
    const onPress = jest.fn();
    const { getByRole } = renderWithTheme(
      <ListItem title="Queen St" subtitle="Open until 9 pm" onPress={onPress} />
    );
    const row = getByRole('button', { name: 'Queen St, Open until 9 pm' });
    expect(pressableStyle(row)).toMatchObject({ minHeight: MIN_TOUCH_TARGET });
    fireEvent.press(row);
    expect(onPress).toHaveBeenCalled();
  });

  it('includes meaningful trailing content in the spoken label', () => {
    const { getByRole, getByLabelText } = renderWithTheme(
      <>
        <ListItem
          title="Latte"
          trailing={<Points value={1250} />}
          trailingAccessibilityLabel="1,250 points"
          onPress={jest.fn()}
        />
        <ListItem
          title="Order 42"
          trailing={<Badge label="Ready" />}
          trailingAccessibilityLabel="Ready"
        />
      </>
    );
    expect(getByRole('button', { name: 'Latte, 1,250 points' })).toBeTruthy();
    expect(getByLabelText('Order 42, Ready')).toBeTruthy();
  });

  it('exposes and enforces the disabled state', () => {
    const onPress = jest.fn();
    const { getByRole } = renderWithTheme(<ListItem title="Row" disabled onPress={onPress} />);
    fireEvent.press(getByRole('button', { name: 'Row', disabled: true }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('is not a button without onPress', () => {
    const { queryByRole, getByText } = renderWithTheme(
      <ListItem title="Row" trailing={<RNText>Trailing</RNText>} />
    );
    expect(queryByRole('button')).toBeNull();
    expect(getByText('Trailing')).toBeTruthy();
  });
});

describe('Badge and Chip', () => {
  it.each([
    ['neutral', 'surfaceMuted', 'foreground'],
    ['accent', 'accent', 'accentForeground'],
    ['success', 'success', 'successForeground'],
    ['warning', 'warning', 'warningForeground'],
    ['danger', 'danger', 'dangerForeground'],
  ] as const)('%s tone uses its token pair', (tone, bg, fg) => {
    const { getByTestId, getByText } = renderWithTheme(
      <Badge testID="badge" tone={tone} label="New" />,
      'dark'
    );
    expect(StyleSheet.flatten(getByTestId('badge').props.style)).toMatchObject({
      backgroundColor: darkTheme[bg],
    });
    expect(StyleSheet.flatten(getByText('New').props.style)).toMatchObject({
      color: darkTheme[fg],
    });
  });

  it('is display-only and Chip is the same component', () => {
    const { queryByRole, getByLabelText } = renderWithTheme(<Chip label="Ready" tone="success" />);
    expect(queryByRole('button')).toBeNull();
    expect(getByLabelText('Ready')).toBeTruthy();
    expect(Chip).toBe(Badge);
  });
});

describe('Divider', () => {
  it('is a hairline in the border colour, hidden from screen readers', () => {
    const { getByTestId } = renderWithTheme(<Divider testID="divider" inset={16} />);
    const divider = getByTestId('divider', { includeHiddenElements: true });
    expect(divider.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(divider.props.accessibilityElementsHidden).toBe(true);
    expect(StyleSheet.flatten(divider.props.style)).toMatchObject({
      backgroundColor: lightTheme.border,
      marginLeft: 16,
    });
  });
});

describe('SectionHeader', () => {
  it('renders a header and an optional action button', () => {
    const onActionPress = jest.fn();
    const { getByRole } = renderWithTheme(
      <SectionHeader
        title="Rewards"
        actionLabel="See all"
        actionAccessibilityLabel="See all rewards"
        onActionPress={onActionPress}
      />
    );
    expect(getByRole('header', { name: 'Rewards' })).toBeTruthy();
    fireEvent.press(getByRole('button', { name: 'See all rewards' }));
    expect(onActionPress).toHaveBeenCalled();
  });

  it('omits the action without a handler', () => {
    const { queryByRole } = renderWithTheme(
      <SectionHeader title="Rewards" actionLabel="See all" />
    );
    expect(queryByRole('button')).toBeNull();
  });
});

describe('Points', () => {
  it('shows the abbreviated amount and speaks the full word', () => {
    const { getByText } = renderWithTheme(<Points value={1250} />);
    expect(getByText('1,250 pts').props.accessibilityLabel).toBe('1,250 points');
  });

  it('can render as an accent badge', () => {
    const { getByLabelText, getByText } = renderWithTheme(
      <Points value={1} badge testID="pts" />,
      'dark'
    );
    expect(getByLabelText('1 point')).toBeTruthy();
    expect(StyleSheet.flatten(getByText('1 pt').props.style)).toMatchObject({
      color: darkTheme.accentForeground,
    });
  });

  it('applies style to the badge container in badge form', () => {
    const { getByTestId } = renderWithTheme(
      <Points value={300} badge testID="pts" style={{ marginTop: 4 }} />
    );
    expect(StyleSheet.flatten(getByTestId('pts').props.style)).toMatchObject({ marginTop: 4 });
  });
});

describe('Price', () => {
  it('shows CAD from integer cents', () => {
    const { getByText } = renderWithTheme(<Price cents={1499} />);
    expect(getByText('$14.99').props.accessibilityLabel).toBe('$14.99');
  });

  it('announces a struck-through price as the previous price', () => {
    const { getByText } = renderWithTheme(<Price cents={1999} strikethrough />);
    const price = getByText('$19.99');
    expect(price.props.accessibilityLabel).toBe('Was $19.99');
    expect(StyleSheet.flatten(price.props.style)).toMatchObject({
      textDecorationLine: 'line-through',
      color: lightTheme.foregroundMuted,
    });
  });
});

describe('Card props', () => {
  it('requires an accessibilityLabel on a pressable card (type check)', () => {
    // @ts-expect-error a pressable card is one button, so it must have a label
    const missingLabel = <Card onPress={jest.fn()}>x</Card>;
    expect(missingLabel).toBeTruthy();
  });
});
