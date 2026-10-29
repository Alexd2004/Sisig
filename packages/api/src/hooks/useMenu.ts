import { queryOptions, QueryKey, useQuery, UseQueryOptions } from '@tanstack/react-query';
import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';
import { keys } from '../query-keys';
import { normalizeError } from '../client';

type Product = Database['public']['Tables']['products']['Row'];

interface UseMenuOptions extends Omit<UseQueryOptions, 'queryKey' | 'queryFn'> {
  category?: string;
}

/**
 * Fetch menu items with optional filtering.
 * Persisted query (safe for offline).
 */
export function useMenu(client: SupabaseClient<Database>, options?: UseMenuOptions) {
  const { category, ...queryOptions } = options || {};

  return useQuery({
    queryKey: keys.menu.list({ category }),
    queryFn: async (): Promise<Product[]> => {
      let query = client.from('products').select('*');

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query.eq('is_available', true);

      if (error) {
        throw normalizeError(error);
      }

      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...queryOptions,
  });
}

/**
 * Query options for the distinct category list of available products.
 * Separate from the hook so tests and prefetching can use the same definition.
 * Persisted query (menu prefix, safe for offline).
 */
export function menuCategoriesQueryOptions(client: SupabaseClient<Database>) {
  // Widened to QueryKey so the options can be merged with UseQueryOptions in the hook.
  const queryKey: QueryKey = keys.menu.categories();

  return queryOptions({
    queryKey,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await client
        .from('products')
        .select('category')
        .eq('is_available', true);

      if (error) {
        throw normalizeError(error);
      }

      const categories = Array.from(new Set(data?.map((p) => p.category) || [])).sort();

      return categories;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Fetch menu categories.
 * Persisted query (safe for offline).
 */
export function useMenuCategories(
  client: SupabaseClient<Database>,
  options?: Omit<UseQueryOptions<string[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    ...menuCategoriesQueryOptions(client),
    ...options,
  });
}

/**
 * Fetch a single product by ID.
 */
export function useProduct(
  client: SupabaseClient<Database>,
  id: string,
  options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: keys.menu.item(id),
    queryFn: async (): Promise<Product | null> => {
      const { data, error } = await client.from('products').select().eq('id', id).single();

      if (error) {
        throw normalizeError(error);
      }

      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}
