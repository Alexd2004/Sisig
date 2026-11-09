/** A parsed x.y.z version. */
export type Version = readonly [number, number, number];

const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

/** Parse an x.y.z version. Anything else (pre-release tags, two parts) gives null. */
export function parseVersion(value: string | null | undefined): Version | null {
  const match = typeof value === 'string' ? VERSION_PATTERN.exec(value.trim()) : null;
  if (!match) {
    return null;
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Negative when a < b, 0 when equal, positive when a > b. Compares each part as a number. */
export function compareVersions(a: Version, b: Version): number {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) {
      return a[i] - b[i];
    }
  }
  return 0;
}
