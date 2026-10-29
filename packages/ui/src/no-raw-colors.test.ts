import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

/**
 * UI components must reference semantic theme names, never raw colour literals.
 * Brand values live only in src/theme/brand.ts.
 */
const SRC_ROOT = join(__dirname);
const BRAND_FILE = join(SRC_ROOT, 'theme', 'brand.ts');
const RAW_COLOUR_LITERAL = /['"`]#[0-9a-fA-F]{3,8}['"`]/;

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return listSourceFiles(path);
    }
    return /\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [path] : [];
  });
}

describe('ui component colours', () => {
  it('uses semantic theme names instead of raw hex colours outside the brand file', () => {
    const offenders = listSourceFiles(SRC_ROOT)
      .filter((file) => file !== BRAND_FILE)
      .filter((file) => RAW_COLOUR_LITERAL.test(readFileSync(file, 'utf8')));

    expect(offenders.map((file) => relative(SRC_ROOT, file))).toEqual([]);
  });
});
