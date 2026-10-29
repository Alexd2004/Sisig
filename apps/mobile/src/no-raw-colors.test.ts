import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

/**
 * Components must reference semantic theme names, never raw colour literals.
 * Brand values live only in packages/ui/src/theme/brand.ts.
 */
const APP_ROOT = join(__dirname, '..');
const SCANNED_DIRS = [join(APP_ROOT, 'app'), join(APP_ROOT, 'src')];
const RAW_COLOUR_LITERAL = /['"`]#[0-9a-fA-F]{3,8}['"`]/;
const SOURCE_FILE = /\.(ts|tsx)$/;

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return listSourceFiles(path);
    }
    return SOURCE_FILE.test(entry) && !entry.endsWith('.test.tsx') && !entry.endsWith('.test.ts')
      ? [path]
      : [];
  });
}

describe('mobile app colours', () => {
  it('uses semantic theme names instead of raw hex colours', () => {
    const offenders = SCANNED_DIRS.flatMap(listSourceFiles).filter((file) =>
      RAW_COLOUR_LITERAL.test(readFileSync(file, 'utf8'))
    );

    expect(offenders.map((file) => relative(APP_ROOT, file))).toEqual([]);
  });
});
