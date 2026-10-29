/**
 * Brand token file: the single source of truth for brand colours and fonts.
 *
 * PLACEHOLDER VALUES. The final brand palette and the licensed brand fonts are
 * client inputs that have not been received yet. To rebrand, change values in
 * this file only. Components must reference semantic names (background,
 * primary, ...), never raw hex values.
 *
 * Every semantic token must exist in both themes; the contrast test in
 * contrast.test.ts enforces WCAG AA for the foreground/background pairs.
 */

export const SEMANTIC_TOKENS = [
  'background',
  'surface',
  'surfaceMuted',
  'foreground',
  'foregroundMuted',
  'placeholder',
  'border',
  'primary',
  'primaryPressed',
  'primaryForeground',
  'accent',
  'accentForeground',
  'success',
  'successForeground',
  'warning',
  'warningForeground',
  'danger',
  'dangerForeground',
  'bubble',
  'bubbleForeground',
] as const;

export type SemanticToken = (typeof SEMANTIC_TOKENS)[number];
export type SemanticTheme = Record<SemanticToken, string>;

/** Raw colour values. Only the semantic themes below reference these. */
export const palette = {
  white: '#FFFFFF',
  black: '#0A0A0A',

  gray050: '#F9F9F9',
  gray100: '#F5F5F5',
  gray200: '#E0E0E0',
  gray300: '#E5E5EA',
  gray500: '#6B6B6B',
  gray600: '#666666',
  gray800: '#333333',

  ink950: '#111111',
  ink900: '#1C1C1E',
  ink850: '#2A2A2D',
  ink700: '#3A3A3C',
  ink400: '#9A9AA0',
  ink300: '#A3A3A3',
  paper100: '#F2F2F2',

  blue600: '#0062CC',
  blue800: '#004F9F',
  blue400: '#5AA9FF',
  blue200: '#8CC4FF',

  violet700: '#6D28D9',
  violet400: '#A78BFA',

  green700: '#15803D',
  green400: '#4ADE80',

  amber700: '#B45309',
  amber400: '#FBBF24',

  red700: '#B91C1C',
  red400: '#F87171',
} as const;

export const lightTheme: SemanticTheme = {
  background: palette.gray100,
  surface: palette.white,
  surfaceMuted: palette.gray050,
  foreground: palette.gray800,
  foregroundMuted: palette.gray600,
  placeholder: palette.gray500,
  border: palette.gray200,
  primary: palette.blue600,
  primaryPressed: palette.blue800,
  primaryForeground: palette.white,
  accent: palette.violet700,
  accentForeground: palette.white,
  success: palette.green700,
  successForeground: palette.white,
  warning: palette.amber700,
  warningForeground: palette.white,
  danger: palette.red700,
  dangerForeground: palette.white,
  bubble: palette.gray300,
  bubbleForeground: palette.gray800,
};

export const darkTheme: SemanticTheme = {
  background: palette.ink950,
  surface: palette.ink900,
  surfaceMuted: palette.ink850,
  foreground: palette.paper100,
  foregroundMuted: palette.ink300,
  placeholder: palette.ink400,
  border: palette.ink700,
  primary: palette.blue400,
  primaryPressed: palette.blue200,
  primaryForeground: palette.black,
  accent: palette.violet400,
  accentForeground: palette.black,
  success: palette.green400,
  successForeground: palette.black,
  warning: palette.amber400,
  warningForeground: palette.black,
  danger: palette.red400,
  dangerForeground: palette.black,
  bubble: palette.ink850,
  bubbleForeground: palette.paper100,
};

/**
 * PLACEHOLDER: Inter from Google Fonts (via @expo-google-fonts/inter), used until
 * the client's licensed brand fonts arrive. Family names must match the names
 * registered with expo-font in apps/mobile.
 */
export const brandFonts = {
  body: 'Inter_400Regular',
  heading: 'Inter_600SemiBold',
} as const;

/**
 * Maximum OS font scale (Dynamic Type / font size setting) honoured by Text and
 * TextInput. Above this the text stops growing so key layouts keep their shape.
 */
export const FONT_SCALE_CAP = 1.5;
