import type { SupabaseClient } from '@supabase/supabase-js';
import { QueryClient } from '@tanstack/react-query';
import type { UseMutationOptions } from '@tanstack/react-query';
import { AppError } from './client';
import type { Database } from './database.types';
import { useCreateOrder, useRedeemPoints } from './mutations';
import { createQueryClient } from './query-client';
import { keys } from './query-keys';

// The hooks call useMutation, which needs a React tree. These tests run in node without one,
// so useMutation is replaced by the MutationObserver it wraps. The real TanStack mutation
// lifecycle (mutationFn, onSuccess, onError, onSettled) still runs.
//
// Known gap: real useMutation takes its QueryClient from React context, not from the hook's
// queryClient argument. The shim ignores context and always uses activeQueryClient, which
// beforeEach sets to the same instance the test passes to the hook. A hook that passed a
// different client than the context's would not be caught here.
let activeQueryClient: QueryClient;

jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useMutation: (options: UseMutationOptions<unknown, Error, unknown, unknown>) => {
      const observer = new actual.MutationObserver(activeQueryClient, options);
      return { mutateAsync: (variables: unknown) => observer.mutate(variables) };
    },
  };
});

const ORDER_ID = 'order-1';
const DUPLICATE_ERROR = {
  code: '23505',
  message: 'duplicate key value violates unique constraint "orders_pkey"',
};

const payload = {
  order: { user_id: 'user-1', total_amount: 1200 },
  // order_id is overwritten by the mutation with the id returned from the orders insert.
  items: [{ order_id: ORDER_ID, product_id: 'product-1', quantity: 2, unit_price: 600 }],
};

/** PostgREST builders are thenable (await insert(...)) and also chain select().single(). */
interface InsertBuilder extends PromiseLike<{ data: null; error: unknown }> {
  select: () => { single: () => Promise<{ data: { id: string } | null; error: unknown }> };
}

/** The only Supabase calls the mutations make. Cast to SupabaseClient once, in createSupabaseStub. */
interface SupabaseStub {
  from: (table: string) => { insert: (rows: unknown[]) => InsertBuilder };
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
}

/**
 * TanStack calls callbacks as (data | error, variables, context, mutationContext) and
 * (data, error, variables, ...) for onSettled. Only the leading arguments are asserted here.
 */
function leadingArgs(mock: jest.Mock, count: number): unknown[] {
  return mock.mock.calls[0].slice(0, count);
}

/** Inserts succeed, except into `failingTable`, which returns a PostgREST duplicate error. */
function createSupabaseStub(failingTable?: 'orders' | 'order_items') {
  const rpc = jest.fn(async () => ({ data: null, error: null }));
  const stub: SupabaseStub = {
    from: (table) => ({
      insert: () => {
        const error = table === failingTable ? DUPLICATE_ERROR : null;
        return Object.assign(Promise.resolve({ data: null, error }), {
          select: () => ({
            single: async () => ({ data: error ? null : { id: ORDER_ID }, error }),
          }),
        });
      },
    }),
    rpc,
  };
  return { client: stub as unknown as SupabaseClient<Database>, rpc };
}

let queryClient: QueryClient;

beforeEach(() => {
  queryClient = createQueryClient();
  activeQueryClient = queryClient;
  // Cached orders data. Invalidation marks it isInvalidated, which the tests observe.
  queryClient.setQueryData(keys.orders.list(), []);
});

afterEach(() => {
  queryClient.clear();
});

describe('useCreateOrder', () => {
  it('invalidates cached orders when the caller passes onSuccess', async () => {
    const { client } = createSupabaseStub();

    await useCreateOrder(client, queryClient, { onSuccess: jest.fn() }).mutateAsync(payload);

    expect(queryClient.getQueryState(keys.orders.list())?.isInvalidated).toBe(true);
  });

  it('calls the caller onSuccess with the new order id, after the invalidation', async () => {
    const { client } = createSupabaseStub();
    let invalidatedWhenCalled = false;
    const onSuccess = jest.fn(() => {
      invalidatedWhenCalled = queryClient.getQueryState(keys.orders.list())?.isInvalidated === true;
    });

    await useCreateOrder(client, queryClient, { onSuccess }).mutateAsync(payload);

    expect(leadingArgs(onSuccess, 2)).toEqual([{ orderId: ORDER_ID }, payload]);
    expect(invalidatedWhenCalled).toBe(true);
  });

  it('still calls the caller onError and onSettled when the insert fails, and does not invalidate', async () => {
    const { client } = createSupabaseStub('orders');
    const onSuccess = jest.fn();
    const onError = jest.fn();
    const onSettled = jest.fn();

    const error = await useCreateOrder(client, queryClient, { onSuccess, onError, onSettled })
      .mutateAsync(payload)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ code: 'DUPLICATE' });
    expect(leadingArgs(onError, 2)).toEqual([error, payload]);
    expect(leadingArgs(onSettled, 3)).toEqual([undefined, error, payload]);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(queryClient.getQueryState(keys.orders.list())?.isInvalidated).toBe(false);
  });

  it('resolves mutateAsync only after an async caller onSuccess has finished', async () => {
    const { client } = createSupabaseStub();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const onSuccess = jest.fn(async () => {
      await gate;
    });
    let resolved = false;

    const pending = useCreateOrder(client, queryClient, { onSuccess }).mutateAsync(payload);
    pending.then(() => {
      resolved = true;
    });

    // One macrotask lets the mutation reach the caller's onSuccess, which is now waiting on the gate.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(resolved).toBe(false);

    release();
    await expect(pending).resolves.toEqual({ orderId: ORDER_ID });
    expect(resolved).toBe(true);
  });

  it('sends a rejecting async caller onSuccess to onError', async () => {
    const { client } = createSupabaseStub();
    const failure = new Error('side effect failed');
    const onError = jest.fn();

    const error = await useCreateOrder(client, queryClient, {
      onSuccess: async () => {
        throw failure;
      },
      onError,
    })
      .mutateAsync(payload)
      .catch((e: unknown) => e);

    expect(error).toBe(failure);
    expect(leadingArgs(onError, 1)).toEqual([failure]);
  });
});

describe('useRedeemPoints', () => {
  // The default mutationFn always throws until redeem_loyalty_reward exists. The type omits
  // mutationFn, so the override below works only at runtime: options are spread after the
  // default mutationFn, which replaces it and reaches the success path.
  type RedeemOptions = NonNullable<Parameters<typeof useRedeemPoints>[2]>;
  const redeem = { rewardId: 'reward-1', points: 50 };

  it('invalidates loyalty and calls the caller onSuccess when the redeem succeeds', async () => {
    queryClient.setQueryData(keys.loyalty.points(), { total_points: 100 });
    const { client } = createSupabaseStub();
    const onSuccess = jest.fn();
    // Omit<..., 'mutationFn'> excludes mutationFn from the type, so the override is cast.
    const options = { mutationFn: async () => undefined, onSuccess } as RedeemOptions;

    await useRedeemPoints(client, queryClient, options).mutateAsync(redeem);

    expect(queryClient.getQueryState(keys.loyalty.points())?.isInvalidated).toBe(true);
    expect(leadingArgs(onSuccess, 2)).toEqual([undefined, redeem]);
  });

  it('still calls the caller onError on failure, without invalidating loyalty', async () => {
    queryClient.setQueryData(keys.loyalty.points(), { total_points: 100 });
    const { client } = createSupabaseStub();
    const onSuccess = jest.fn();
    const onError = jest.fn();

    const error = await useRedeemPoints(client, queryClient, { onSuccess, onError })
      .mutateAsync(redeem)
      .catch((e: unknown) => e);

    expect(error).toEqual(new Error('redeem_loyalty_reward RPC is not implemented yet'));
    expect(leadingArgs(onError, 2)).toEqual([error, redeem]);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(queryClient.getQueryState(keys.loyalty.points())?.isInvalidated).toBe(false);
  });
});
