import {
  useMutation,
  UseMutationOptions,
  QueryClient,
} from '@tanstack/react-query';
import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { keys } from './query-keys';
import { normalizeError, AppError } from './client';

type Order = Database['public']['Tables']['orders']['Insert'];
type OrderItem = Database['public']['Tables']['order_items']['Insert'];

/**
 * Create a new order and line items.
 */
export function useCreateOrder(
  client: SupabaseClient<Database>,
  queryClient: QueryClient,
  options?: Omit<UseMutationOptions, 'mutationFn'>,
) {
  return useMutation({
    mutationFn: async (payload: {
      order: Order;
      items: OrderItem[];
    }): Promise<{ orderId: string }> => {
      // Insert order
      const { data: orderData, error: orderError } = await client
        .from('orders')
        .insert([payload.order])
        .select()
        .single();

      if (orderError) {
        throw normalizeError(orderError);
      }

      const orderId = orderData.id;

      // Insert order items
      const itemsWithOrderId = payload.items.map((item) => ({
        ...item,
        order_id: orderId,
      }));

      const { error: itemsError } = await client
        .from('order_items')
        .insert(itemsWithOrderId);

      if (itemsError) {
        throw normalizeError(itemsError);
      }

      return { orderId };
    },
    onSuccess: () => {
      // Invalidate orders query
      queryClient.invalidateQueries({
        queryKey: keys.orders.all(),
      });
    },
    ...options,
  });
}

/**
 * Redeem loyalty points.
 */
export function useRedeemPoints(
  client: SupabaseClient<Database>,
  queryClient: QueryClient,
  options?: Omit<UseMutationOptions, 'mutationFn'>,
) {
  return useMutation({
    mutationFn: async (payload: {
      rewardId: string;
      points: number;
    }): Promise<void> => {
      // Call RPC to redeem
      const { error } = await client.rpc('redeem_loyalty_reward', {
        p_reward_id: payload.rewardId,
        p_points: payload.points,
      });

      if (error) {
        throw normalizeError(error);
      }
    },
    onSuccess: () => {
      // Invalidate loyalty queries
      queryClient.invalidateQueries({
        queryKey: keys.loyalty.all(),
      });
    },
    ...options,
  });
}

/**
 * Helper for optimistic updates with automatic rollback on error.
 */
export interface OptimisticUpdateConfig<T> {
  queryKey: (string | object)[];
  updateFn: (old: T) => T;
  rollbackFn?: (old: T) => void;
}

export function optimisticUpdate<T>(
  queryClient: QueryClient,
  config: OptimisticUpdateConfig<T>,
  mutationFn: () => Promise<void>,
): Promise<void> {
  // Save old data
  const oldData = queryClient.getQueryData<T>(config.queryKey);

  // Update UI optimistically
  queryClient.setQueryData(config.queryKey, (old: T) =>
    config.updateFn(old),
  );

  // Execute mutation
  return mutationFn().catch((error) => {
    // Rollback on error
    if (oldData !== undefined) {
      queryClient.setQueryData(config.queryKey, oldData);
      if (config.rollbackFn) {
        config.rollbackFn(oldData);
      }
    }
    throw error;
  });
}
