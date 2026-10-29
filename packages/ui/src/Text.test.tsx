import React from 'react';
import { StyleSheet } from 'react-native';
import { brandFonts, FONT_SCALE_CAP, lightTheme } from './theme/brand';
import { Text } from './Text';
import { TextInput } from './TextInput';
import { renderWithTheme } from './test-utils';

describe('Text and TextInput font scaling cap', () => {
  it('caps OS font scaling at FONT_SCALE_CAP by default', () => {
    expect(FONT_SCALE_CAP).toBe(1.5);
    const { getByText } = renderWithTheme(<Text>Hello</Text>);
    expect(getByText('Hello').props.maxFontSizeMultiplier).toBe(FONT_SCALE_CAP);
  });

  it('never allows a caller to exceed the cap', () => {
    const { getByText } = renderWithTheme(<Text maxFontSizeMultiplier={3}>Hello</Text>);
    expect(getByText('Hello').props.maxFontSizeMultiplier).toBe(FONT_SCALE_CAP);
  });

  it('keeps a stricter caller limit', () => {
    const { getByText } = renderWithTheme(<Text maxFontSizeMultiplier={1.2}>Hello</Text>);
    expect(getByText('Hello').props.maxFontSizeMultiplier).toBe(1.2);
  });

  it('applies the same cap to TextInput', () => {
    const { getByPlaceholderText } = renderWithTheme(<TextInput placeholder="Type" />);
    expect(getByPlaceholderText('Type').props.maxFontSizeMultiplier).toBe(FONT_SCALE_CAP);
  });
});

describe('Text brand defaults', () => {
  it('use the brand body font and the semantic foreground colour', () => {
    const { getByText } = renderWithTheme(<Text>Hello</Text>, 'light');
    expect(StyleSheet.flatten(getByText('Hello').props.style)).toMatchObject({
      fontFamily: brandFonts.body,
      color: lightTheme.foreground,
    });
  });
});
