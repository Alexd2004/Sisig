import { formatPoints, formatPointsSpoken, formatPointsValue, formatPrice } from './format';

describe('formatPoints', () => {
  it.each([
    [0, '0 pts'],
    [1, '1 pt'],
    [2, '2 pts'],
    [999, '999 pts'],
    [1250, '1,250 pts'],
    [1000000, '1,000,000 pts'],
    [-1, '-1 pt'],
    [-1250, '-1,250 pts'],
  ])('formats %p as %p', (points, expected) => {
    expect(formatPoints(points)).toBe(expected);
  });

  it('spells out the unit for screen readers', () => {
    expect(formatPointsSpoken(1250)).toBe('1,250 points');
    expect(formatPointsSpoken(1)).toBe('1 point');
  });

  it('formats the bare value with en-CA grouping', () => {
    expect(formatPointsValue(12500)).toBe('12,500');
  });

  it.each([1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejects %p', (points) => {
    expect(() => formatPoints(points)).toThrow(RangeError);
  });
});

describe('formatPrice', () => {
  it.each([
    [0, '$0.00'],
    [5, '$0.05'],
    [1499, '$14.99'],
    [1500, '$15.00'],
    [123456, '$1,234.56'],
    [-1499, '-$14.99'],
  ])('formats %p cents as %p', (cents, expected) => {
    expect(formatPrice(cents)).toBe(expected);
  });

  it('uses the bare $ symbol, not CA$', () => {
    expect(formatPrice(1499)).not.toContain('CA');
  });

  it.each([14.99, NaN, -Infinity])('rejects non-integer cents %p', (cents) => {
    expect(() => formatPrice(cents)).toThrow(RangeError);
  });
});
