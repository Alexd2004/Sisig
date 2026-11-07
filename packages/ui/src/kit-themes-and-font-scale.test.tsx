import React from 'react';
import { readFileSync } from 'fs';
import { relative } from 'path';
import {
  ActivityIndicator,
  StyleSheet,
  Switch as RNSwitch,
  Text as RNText,
  TextInput as RNTextInput,
} from 'react-native';
import { Badge } from './components/Badge';
import { Card } from './components/Card';
import { Divider } from './components/Divider';
import { Heading } from './components/Heading';
import { IconButton } from './components/IconButton';
import { ListItem } from './components/ListItem';
import { Points } from './components/Points';
import { Price } from './components/Price';
import { Screen } from './components/Screen';
import { SectionHeader } from './components/SectionHeader';
import { Button } from './Button';
import { Checkbox } from './forms/Checkbox';
import { FormField } from './forms/FormField';
import { Input } from './forms/Input';
import { Switch } from './forms/Switch';
import { TextArea } from './forms/TextArea';
import { Text } from './Text';
import { darkTheme, FONT_SCALE_CAP, lightTheme, SemanticTheme } from './theme/brand';
import { listSourceFiles, renderWithTheme, TestScheme } from './test-utils';

/** Every kit component in its main states, as a screen would use them. */
function KitFixture(): JSX.Element {
  return (
    <Screen>
      <Heading>Rewards</Heading>
      <Text tone="muted">Earn points on every order</Text>
      <SectionHeader title="Featured" actionLabel="See all" onActionPress={jest.fn()} />
      <Card onPress={jest.fn()} accessibilityLabel="Free coffee, 1,250 points">
        <Heading level={3}>Free coffee</Heading>
        <Points value={1250} />
        <Price cents={1499} />
        <Price cents={1999} strikethrough />
        <Badge tone="accent" label="New" />
        <Points value={300} badge />
      </Card>
      <Card variant="muted">
        <Badge tone="success" label="Ready" />
        <Badge tone="warning" label="Preparing" />
        <Badge tone="danger" label="Cancelled" />
        <Badge label="Pickup" />
      </Card>
      <ListItem
        title="Queen St"
        subtitle="Open until 9 pm"
        trailing={<Badge label="0.4 km" />}
        trailingAccessibilityLabel="0.4 km away"
        onPress={jest.fn()}
      />
      <Divider />
      <ListItem title="King St" disabled onPress={jest.fn()} />
      <FormField label="Email" helper="We send receipts here">
        <Input preset="email" placeholder="you@example.com" />
      </FormField>
      <FormField label="Password" error="Enter your password" required>
        <Input preset="password" />
      </FormField>
      <FormField label="Code">
        <Input preset="oneTimeCode" />
      </FormField>
      <FormField label="Notes">
        <TextArea placeholder="Anything else?" />
      </FormField>
      <Switch label="Promotions" description="Offers by push" value onValueChange={jest.fn()} />
      <Checkbox
        label="I agree to the terms"
        checked={false}
        error="Required"
        onValueChange={jest.fn()}
      />
      <Checkbox label="Email me offers" checked onValueChange={jest.fn()} />
      <Button title="Place order" onPress={jest.fn()} />
      <Button title="Edit" variant="secondary" onPress={jest.fn()} />
      <Button title="Skip" variant="ghost" onPress={jest.fn()} />
      <Button title="Delete account" variant="destructive" onPress={jest.fn()} />
      <Button title="Saving" loading onPress={jest.fn()} />
      <Button title="Unavailable" disabled onPress={jest.fn()} />
      <IconButton icon={<Text>+</Text>} accessibilityLabel="Add item" onPress={jest.fn()} />
    </Screen>
  );
}

// react-test-renderer has no type package here; take the node type from the render result.
type ReactTestInstance = ReturnType<typeof renderWithTheme>['UNSAFE_root'];

const THEMES: readonly (readonly [TestScheme, SemanticTheme])[] = [
  ['light', lightTheme],
  ['dark', darkTheme],
];

const COLOR_KEYS = [
  'color',
  'backgroundColor',
  'borderColor',
  'borderRightColor',
  'borderBottomColor',
];

const hostNodes = (root: ReactTestInstance): ReactTestInstance[] =>
  root.findAll((node: ReactTestInstance) => typeof node.type === 'string');

describe.each(THEMES)('UI kit in the %s theme', (scheme, theme) => {
  it('renders every component', () => {
    const { getByText, getAllByRole } = renderWithTheme(<KitFixture />, scheme);
    expect(getByText('Free coffee')).toBeTruthy();
    expect(getAllByRole('alert')).toHaveLength(2);
    expect(getAllByRole('button').length).toBeGreaterThanOrEqual(10);
  });

  it('styles use only colours from the active theme', () => {
    const { UNSAFE_root } = renderWithTheme(<KitFixture />, scheme);
    const allowed = new Set<string>([...Object.values(theme), 'transparent']);
    const offenders: string[] = [];
    for (const node of hostNodes(UNSAFE_root)) {
      const style = StyleSheet.flatten(node.props.style) as Record<string, unknown> | undefined;
      for (const key of COLOR_KEYS) {
        const value = style?.[key];
        if (typeof value === 'string' && !allowed.has(value)) {
          offenders.push(`${String(node.type)}.${key}=${value}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('colour props (switch track and thumb, spinners) come from the active theme', () => {
    const { UNSAFE_root } = renderWithTheme(<KitFixture />, scheme);
    const allowed = new Set<string>(Object.values(theme));
    const propColours = [
      ...UNSAFE_root.findAllByType(RNSwitch).flatMap((node: ReactTestInstance) => [
        node.props.trackColor.false,
        node.props.trackColor.true,
        node.props.thumbColor,
        node.props.ios_backgroundColor,
      ]),
      ...UNSAFE_root.findAllByType(ActivityIndicator).map(
        (node: ReactTestInstance) => node.props.color
      ),
    ];
    expect(propColours.length).toBeGreaterThan(4);
    expect(propColours.filter((colour) => !allowed.has(colour))).toEqual([]);
  });

  it('lets every text node scale with the OS font size, up to FONT_SCALE_CAP', () => {
    const { UNSAFE_root } = renderWithTheme(<KitFixture />, scheme);
    const textNodes = UNSAFE_root.findAll(
      (node: ReactTestInstance) => node.type === RNText || node.type === RNTextInput
    );
    expect(textNodes.length).toBeGreaterThan(20);
    const offenders = textNodes
      .filter(
        (node: ReactTestInstance) =>
          node.props.allowFontScaling === false ||
          node.props.maxFontSizeMultiplier !== FONT_SCALE_CAP
      )
      .map((node: ReactTestInstance) => String(node.props.children ?? node.props.placeholder));
    expect(offenders).toEqual([]);
  });

  it('gives text no fixed height, so larger text grows its container instead of clipping', () => {
    const { UNSAFE_root } = renderWithTheme(<KitFixture />, scheme);
    const fixed = UNSAFE_root.findAll(
      (node: ReactTestInstance) =>
        (node.type === RNText || node.type === RNTextInput) &&
        StyleSheet.flatten(node.props.style)?.height !== undefined
    );
    expect(fixed).toHaveLength(0);
  });
});

describe('font scaling is never disabled in source', () => {
  it('has no allowFontScaling={false} or allowFontScaling: false', () => {
    const offenders = listSourceFiles(__dirname)
      .filter((file) =>
        /allowFontScaling\s*(=\s*\{\s*false|:\s*false)/.test(readFileSync(file, 'utf8'))
      )
      .map((file) => relative(__dirname, file));
    expect(offenders).toEqual([]);
  });
});
