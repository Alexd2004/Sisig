import { contrastRatio } from './contrast';
import { darkTheme, lightTheme, SEMANTIC_TOKENS, SemanticTheme, SemanticToken } from './brand';

/** WCAG 2.x AA minimum for normal text. Every pair below is checked against it. */
const WCAG_AA_NORMAL_TEXT = 4.5;

/** [foreground token, background token] pairs that are drawn together in the app. */
const TEXT_PAIRS: readonly (readonly [SemanticToken, SemanticToken])[] = [
  ['foreground', 'background'],
  ['foreground', 'surface'],
  ['foreground', 'surfaceMuted'],
  ['foregroundMuted', 'background'],
  ['foregroundMuted', 'surface'],
  ['foregroundMuted', 'surfaceMuted'],
  ['placeholder', 'background'],
  ['placeholder', 'surface'],
  ['placeholder', 'surfaceMuted'],
  ['primary', 'background'],
  ['primary', 'surface'],
  ['primary', 'surfaceMuted'],
  ['primaryForeground', 'primary'],
  ['primaryForeground', 'primaryPressed'],
  ['accent', 'surface'],
  ['accentForeground', 'accent'],
  ['success', 'background'],
  ['success', 'surface'],
  ['successForeground', 'success'],
  ['warning', 'background'],
  ['warning', 'surface'],
  ['warningForeground', 'warning'],
  ['danger', 'background'],
  ['danger', 'surface'],
  ['dangerForeground', 'danger'],
  ['bubbleForeground', 'bubble'],
];

const THEMES: readonly (readonly [string, SemanticTheme])[] = [
  ['light', lightTheme],
  ['dark', darkTheme],
];

describe('brand semantic themes', () => {
  it.each(THEMES)('%s theme defines every semantic token', (_name, theme) => {
    expect(Object.keys(theme).sort()).toEqual([...SEMANTIC_TOKENS].sort());
  });

  it('contrast pairs cover every token except the decorative border', () => {
    const covered = new Set<SemanticToken>(TEXT_PAIRS.flat());
    const uncovered = SEMANTIC_TOKENS.filter((token) => !covered.has(token));
    expect(uncovered).toEqual(['border']);
  });
});

describe('WCAG AA contrast of semantic foreground/background pairs', () => {
  it.each(THEMES)('%s theme meets 4.5:1 for every pair', (_name, theme) => {
    const failures = TEXT_PAIRS.map(([foreground, background]) => ({
      pair: `${foreground} on ${background}`,
      ratio: Number(contrastRatio(theme[foreground], theme[background]).toFixed(2)),
    })).filter(({ ratio }) => ratio < WCAG_AA_NORMAL_TEXT);

    expect(failures).toEqual([]);
  });
});
