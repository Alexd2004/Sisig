import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';
import { keys } from '../query-keys';
import { normalizeError } from '../client';

type Product = Database['public']['Tables']['products']['Row'];

interface UseMenuOptions
  extends Omit<UseQueryOptions, 'queryKey' | 'queryFn'> {
  category?: string;
}

/**
 * Fetch menu items with optional filtering.
 * Persisted query (safe for offline).
 */
export function useMenu(
  client: SupabaseClient<Database>,
  options?: UseMenuOptions,
) {
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
 * Fetch menu categories.
 * Persisted query (safe for offline).
 */
export function useMenuCategories(
  client: SupabaseClient<Database>,
  options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: keys.menu.categories(),
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await client
        .from('products')
        .select('category')
        .eq('is_available', true)
        .distinct();

      if (error) {
        throw normalizeError(error);
      }

      const categories = Array.from(
        new Set(data?.map((p) => p.category) || []),
      ).sort();

      return categories;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  });
}

/**
 * Fetch a single product by ID.
 */
export function useProduct(
  client: SupabaseClient<Database>,
  id: string,
  options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: keys.menu.item(id),
    queryFn: async (): Promise<Product | null> => {
      const { data, error } = await client
        .from('products')
        .select()
        .eq('id', id)
        .single();

      if (error) {
        throw normalizeError(error);
      }

      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}
