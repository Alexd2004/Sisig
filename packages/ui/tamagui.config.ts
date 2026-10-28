import { createTamagui, createTokens } from 'tamagui';
import { createInterFont } from '@tamagui/font-inter';
import { shorthands } from '@tamagui/shorthands';

const headingFont = createInterFont();
const bodyFont = createInterFont();

const tokens = createTokens({
  size: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    true: 16,
  },
  space: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    true: 16,
  },
  radius: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    true: 8,
  },
  zIndex: {
    0: 0,
    1: 100,
    2: 200,
    3: 300,
    4: 400,
    5: 500,
  },
  color: {
    // Brand colors
    primaryLight: '#007AFF',
    primaryDark: '#0051D5',

    // Semantic colors
    successLight: '#34C759',
    successDark: '#30B0C0',
    warningLight: '#FF9500',
    warningDark: '#FF8C00',
    dangerLight: '#FF3B30',
    dangerDark: '#FF453A',

    // Neutral colors
    white: '#FFFFFF',
    black: '#000000',
    gray50: '#F9FAFB',
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    gray300: '#D1D5DB',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray600: '#4B5563',
    gray700: '#374151',
    gray800: '#1F2937',
    gray900: '#111827',
  },
});

const light = {
  background: tokens.color.white,
  backgroundHover: tokens.color.gray50,
  foreground: tokens.color.gray900,
  foregroundHover: tokens.color.gray800,

  primary: tokens.color.primaryLight,
  primaryHover: '#0051D5',
  primaryForeground: tokens.color.white,

  secondary: tokens.color.gray200,
  secondaryForeground: tokens.color.gray900,

  accent: tokens.color.successLight,
  accentForeground: tokens.color.white,

  success: tokens.color.successLight,
  successForeground: tokens.color.white,

  warning: tokens.color.warningLight,
  warningForeground: tokens.color.white,

  danger: tokens.color.dangerLight,
  dangerForeground: tokens.color.white,

  border: tokens.color.gray200,
  borderHover: tokens.color.gray300,

  placeholder: tokens.color.gray400,
};

const dark = {
  background: tokens.color.gray900,
  backgroundHover: tokens.color.gray800,
  foreground: tokens.color.gray50,
  foregroundHover: tokens.color.white,

  primary: tokens.color.primaryDark,
  primaryHover: '#0051D5',
  primaryForeground: tokens.color.white,

  secondary: tokens.color.gray800,
  secondaryForeground: tokens.color.gray50,

  accent: tokens.color.successDark,
  accentForeground: tokens.color.white,

  success: tokens.color.successDark,
  successForeground: tokens.color.white,

  warning: tokens.color.warningLight,
  warningForeground: tokens.color.white,

  danger: tokens.color.dangerDark,
  dangerForeground: tokens.color.white,

  border: tokens.color.gray700,
  borderHover: tokens.color.gray600,

  placeholder: tokens.color.gray500,
};

const config = createTamagui({
  tokens,
  themes: {
    light,
    dark,
  },
  shorthands,
  fonts: {
    heading: headingFont,
    body: bodyFont,
  },
  settings: {
    allowedStyleValues: 'somewhat-strict',
    maxDarkLuminosity: 0.3,
    fastGeneration: true,
  },
});

export type Conf = typeof config;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}

export default config;
