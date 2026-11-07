import { compareVersions, parseVersion } from './versions';

describe('parseVersion', () => {
  it('parses x.y.z versions', () => {
    expect(parseVersion('1.2.3')).toEqual([1, 2, 3]);
    expect(parseVersion(' 10.0.12 ')).toEqual([10, 0, 12]);
  });

  it.each([[null], [undefined], [''], ['1.2'], ['1.2.3.4'], ['v1.2.3'], ['1.2.3-beta'], ['a.b.c']])(
    'rejects %p',
    (value) => {
      expect(parseVersion(value)).toBeNull();
    }
  );
});

describe('compareVersions', () => {
  const v = (value: string) => {
    const parsed = parseVersion(value);
    if (parsed === null) {
      throw new Error(`bad version ${value}`);
    }
    return parsed;
  };

  it('compares each part as a number, not as text', () => {
    expect(compareVersions(v('1.10.0'), v('1.9.0'))).toBeGreaterThan(0);
    expect(compareVersions(v('1.2.3'), v('1.2.10'))).toBeLessThan(0);
    expect(compareVersions(v('2.0.0'), v('1.99.99'))).toBeGreaterThan(0);
  });

  it('treats equal versions as equal', () => {
    expect(compareVersions(v('1.2.3'), v('1.2.3'))).toBe(0);
  });
});
