/**
 * Points and price formatting for display.
 *
 * TODO(PLAT-09): PLAT-09 will centralise app-wide formatters. Until then these
 * live here so the Points and Price components format consistently. Keep the
 * signatures (integer points, integer cents) when moving them.
 */

const LOCALE = 'en-CA';

const pointsFormat = new Intl.NumberFormat(LOCALE, {
  maximumFractionDigits: 0,
});

const priceFormat = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'CAD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function assertInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${name} must be a safe integer, received ${value}`);
  }
}

/** Grouped number without the unit, for example 1250 -> '1,250'. */
export function formatPointsValue(points: number): string {
  assertInteger(points, 'points');
  return pointsFormat.format(points);
}

/** Points balance, for example 1250 -> '1,250 pts' and 1 -> '1 pt'. */
export function formatPoints(points: number): string {
  return `${formatPointsValue(points)} ${Math.abs(points) === 1 ? 'pt' : 'pts'}`;
}

/** Spoken form of a points balance, for example 1250 -> '1,250 points'. */
export function formatPointsSpoken(points: number): string {
  return `${formatPointsValue(points)} ${Math.abs(points) === 1 ? 'point' : 'points'}`;
}

/** Price in Canadian dollars from integer cents, for example 1499 -> '$14.99'. */
export function formatPrice(cents: number): string {
  assertInteger(cents, 'cents');
  return priceFormat.format(cents / 100);
}
