import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';
import { AppError } from '../client';
import { createQueryClient } from '../query-client';
import { keys, shouldPersistQuery } from '../query-keys';
import { menuCategoriesQueryOptions } from './useMenu';

interface QueryResult {
  data: unknown;
  error: unknown;
}

/** Minimal PostgREST chain: from('products').select('category').eq('is_available', true) */
function mockSupabase(result: QueryResult) {
  const eq = jest.fn().mockResolvedValue(result);
  const select = jest.fn().mockReturnValue({ eq });
  const from = jest.fn().mockReturnValue({ select });
  const client = { from } as unknown as SupabaseClient<Database>;
  return { client, from, select, eq };
}

describe('menuCategoriesQueryOptions (useMenuCategories)', () => {
  it('uses the menu categories key, a 10 minute staleTime, and a persisted (menu) key', () => {
    const { client } = mockSupabase({ data: [], error: null });
    const options = menuCategoriesQueryOptions(client);

    expect(options.queryKey).toEqual(keys.menu.categories());
    expect(options.staleTime).toBe(10 * 60 * 1000);
    expect(shouldPersistQuery(options.queryKey)).toBe(true);
  });

  it('returns the unique, sorted categories of available products', async () => {
    const { client, from, select, eq } = mockSupabase({
      data: [{ category: 'side' }, { category: 'burger' }, { category: 'side' }],
      error: null,
    });

    const categories = await createQueryClient().fetchQuery(menuCategoriesQueryOptions(client));

    expect(categories).toEqual(['burger', 'side']);
    expect(from).toHaveBeenCalledWith('products');
    expect(select).toHaveBeenCalledWith('category');
    expect(eq).toHaveBeenCalledWith('is_available', true);
  });

  it('rejects with a normalized AppError when RLS denies the read, without retrying', async () => {
    const { client, eq } = mockSupabase({
      data: null,
      error: {
        code: '42501',
        message: 'permission denied for table products',
        details: null,
        hint: null,
      },
    });

    const error = await createQueryClient()
      .fetchQuery(menuCategoriesQueryOptions(client))
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ code: 'PERMISSION_DENIED' });
    expect(eq).toHaveBeenCalledTimes(1);
  });
});
