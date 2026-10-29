import { createTamagui, createTokens } from '@tamagui/core';
import { createInterFont } from '@tamagui/font-inter';
import { shorthands } from '@tamagui/shorthands';
import { brandFonts, darkTheme, lightTheme, palette } from './theme/brand';

// Fonts: family names come from the brand token file (placeholder Inter until the
// client's licensed fonts arrive). Face maps tell native which font file each weight uses.
const bodyFont = createInterFont({
  family: brandFonts.body,
  face: {
    400: { normal: brandFonts.body },
    600: { normal: brandFonts.heading },
  },
});

const headingFont = createInterFont({
  family: brandFonts.heading,
  face: {
    400: { normal: brandFonts.heading },
    600: { normal: brandFonts.heading },
  },
});

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
  color: palette,
});

// Components must use these semantic theme names ($background, $primary, ...).
// Brand values live only in theme/brand.ts.
const config = createTamagui({
  tokens,
  themes: {
    light: lightTheme,
    dark: darkTheme,
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
    // The root theme class is a web-only concept (it writes to document.body).
    disableRootThemeClass: true,
  },
});

export type Conf = typeof config;

declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends Conf {}
}

export const tamaguiConfig = config;

export default config;
