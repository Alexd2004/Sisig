/**
 * AC3 drift test (DATA-13): the domain error codes have one source of truth per runtime,
 * and this test fails if they disagree.
 *
 * - TS: DOMAIN_ERRORS in ./domain-errors.ts (code -> SQLSTATE).
 * - SQL: private.app_error_catalog() in the LATEST migration that defines it. A new code
 *   ships as a new migration with `create or replace function private.app_error_catalog()`
 *   and the full list, so the latest definition is the one the database runs.
 * - Deno: DOMAIN_ERROR_CODES in supabase/functions/_shared/errors.ts (Edge Functions
 *   cannot import this package).
 *
 * It is a Jest test, not pgTAP, because Jest is the only runner that can read both the TS
 * map and the SQL, and it runs locally and in the lint-and-test CI job without Docker.
 */
import * as fs from 'fs';
import * as path from 'path';
import { DOMAIN_ERROR_CODES, DOMAIN_ERRORS } from './domain-errors';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'supabase/migrations');
const EDGE_ERRORS_FILE = path.join(REPO_ROOT, 'supabase/functions/_shared/errors.ts');
const CATALOG_DEFINITION = /create\s+or\s+replace\s+function\s+private\.app_error_catalog\s*\(/i;

function latestCatalogMigration(): { file: string; sql: string } {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort();
  let latest: { file: string; sql: string } | undefined;
  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    if (CATALOG_DEFINITION.test(sql)) {
      latest = { file, sql };
    }
  }
  if (!latest) {
    throw new Error(`No migration in ${MIGRATIONS_DIR} defines private.app_error_catalog()`);
  }
  return latest;
}

/** The ('CODE', 'SQLSTATE') rows inside the function body ($$ ... $$). */
function sqlCatalog(sql: string): Map<string, string> {
  const start = sql.search(CATALOG_DEFINITION);
  const bodyStart = sql.indexOf('$$', start);
  const bodyEnd = sql.indexOf('$$', bodyStart + 2);
  const body = sql.slice(bodyStart + 2, bodyEnd);
  const rows = new Map<string, string>();
  for (const match of body.matchAll(/\(\s*'([A-Z_]+)'\s*,\s*'([0-9A-Z]{5})'\s*\)/g)) {
    if (rows.has(match[1])) {
      throw new Error(`Duplicate code ${match[1]} in private.app_error_catalog()`);
    }
    rows.set(match[1], match[2]);
  }
  return rows;
}

function edgeCodes(source: string): string[] {
  const block = source.match(/export const DOMAIN_ERROR_CODES = \[([\s\S]*?)\] as const/);
  if (!block) {
    throw new Error(`DOMAIN_ERROR_CODES not found in ${EDGE_ERRORS_FILE}`);
  }
  return [...block[1].matchAll(/"([A-Z_]+)"/g)].map((m) => m[1]);
}

const tsCatalog = new Map(DOMAIN_ERROR_CODES.map((code) => [code, DOMAIN_ERRORS[code].sqlstate]));

describe('error code drift (TS <-> SQL <-> Edge Functions)', () => {
  const { file, sql } = latestCatalogMigration();
  const sqlRows = sqlCatalog(sql);

  it(`reads a non-empty catalogue from ${file}`, () => {
    expect(sqlRows.size).toBeGreaterThan(0);
  });

  it('the SQL catalogue has exactly the TS codes and SQLSTATEs', () => {
    expect(Object.fromEntries([...sqlRows].sort())).toEqual(
      Object.fromEntries([...tsCatalog].sort())
    );
  });

  it('the Edge Function list has exactly the TS codes, in the same order', () => {
    const codes = edgeCodes(fs.readFileSync(EDGE_ERRORS_FILE, 'utf8'));
    expect(codes).toEqual([...DOMAIN_ERROR_CODES]);
  });
});

describe('drift parser self-check', () => {
  const sample = `
    -- ('IGNORED', 'SS999') in a comment before the function is not read
    create or replace function private.app_error_catalog()
    returns table (code text, sqlstate text) language sql as $$
      values ('A_CODE', 'SS001'),
             ( 'B_CODE' ,'SS002' )
    $$;
    select ('AFTER', 'SS003');
  `;

  it('reads only the rows inside the function body', () => {
    expect(Object.fromEntries(sqlCatalog(sample))).toEqual({
      A_CODE: 'SS001',
      B_CODE: 'SS002',
    });
  });

  it('rejects a duplicated code', () => {
    expect(() => sqlCatalog(sample.replace("'B_CODE'", "'A_CODE'"))).toThrow(/Duplicate code/);
  });
});
