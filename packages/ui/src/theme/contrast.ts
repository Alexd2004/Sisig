/**
 * WCAG 2.x contrast helpers. Inputs must be six-digit hex colours (#RRGGBB).
 * See https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */

const HEX_PATTERN = /^#([0-9a-f]{6})$/i;

const hexToRgb = (hex: string): [number, number, number] => {
  const match = HEX_PATTERN.exec(hex);
  if (!match) {
    throw new Error(`Expected a #RRGGBB colour, received "${hex}"`);
  }
  const value = parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const toLinear = (channel: number): number => {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

export const relativeLuminance = (hex: string): number => {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrastRatio = (colourA: string, colourB: string): number => {
  const [lighter, darker] = [relativeLuminance(colourA), relativeLuminance(colourB)].sort(
    (x, y) => y - x
  );
  return (lighter + 0.05) / (darker + 0.05);
};
