import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthChangeEvent, Session, SupabaseClient } from '@supabase/supabase-js';
import { QueryClient } from '@tanstack/react-query';
import { keys } from '@sisig/api';
import { nativeSessionStorage } from '../lib/session-storage';
import { createSupabaseSessionSource } from './supabase-source';

// In-memory keystore. The `mock` prefix lets the hoisted factories reference it.
const mockKeystore = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'afterFirstUnlockThisDeviceOnly',
  getItemAsync: jest.fn(async (key: string) => mockKeystore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockKeystore.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockKeystore.delete(key);
  }),
}));

// Test-only randomness: the production code uses expo-crypto's CSPRNG.
jest.mock('expo-crypto', () => ({
  getRandomBytes: (byteCount: number) =>
    Uint8Array.from({ length: byteCount }, () => Math.floor(Math.random() * 256)),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

type AuthListener = (event: AuthChangeEvent, session: Session | null) => void;

const USER_A = { access_token: 'user-a-token', user: { id: 'user-a' } };
const USER_A_SESSION = JSON.stringify(USER_A);
const SESSION = USER_A as unknown as Session;

interface FakeClientOptions {
  session?: Session | null;
  sessionError?: Error;
}

/**
 * A fake supabase-js auth client. Like the real client, signOut emits SIGNED_OUT to the
 * registered listener, even when there is no session to remove. It emits on the first call
 * only: a regression that re-enters sign-out then fails the call count instead of looping.
 */
function makeFakeClient(options: FakeClientOptions = {}) {
  let listener: AuthListener | null = null;
  let emitOnSignOut = true;
  const unsubscribe = jest.fn();

  const emit = (event: AuthChangeEvent, session: Session | null): void => {
    listener?.(event, session);
  };

  const auth = {
    getSession: jest.fn(() =>
      Promise.resolve({
        data: { session: options.session ?? null },
        error: options.sessionError ?? null,
      })
    ),
    onAuthStateChange: jest.fn((callback: AuthListener) => {
      listener = callback;
      return { data: { subscription: { unsubscribe } } };
    }),
    signOut: jest.fn(async () => {
      if (emitOnSignOut) {
        emitOnSignOut = false;
        emit('SIGNED_OUT', null);
      }
      return { error: null };
    }),
  };

  return {
    client: { auth } as unknown as SupabaseClient,
    auth,
    unsubscribe,
    emit,
  };
}

/** Puts user A's data in every store a sign-out must clear. */
async function seedUserAData(queryClient: QueryClient): Promise<void> {
  await nativeSessionStorage.setItem('sb-auth-token', USER_A_SESSION);
  await AsyncStorage.setItem('sisig.query-cache', '{"clientState":{}}');
  queryClient.setQueryData(keys.orders.list(), [{ id: 'user-a-order' }]);
}

/**
 * Waits for the purge and any follow-up calls to finish. A sign-out that re-enters itself
 * keeps calling auth.signOut, so counts are only meaningful after this.
 */
function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 20));
}

describe('createSupabaseSessionSource', () => {
  let queryClient: QueryClient;

  beforeEach(async () => {
    mockKeystore.clear();
    await AsyncStorage.clear();
    queryClient = new QueryClient();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('restore', () => {
    it('reports signed-in when Supabase still holds a session at start-up', async () => {
      const { client } = makeFakeClient({ session: SESSION });
      const source = createSupabaseSessionSource(client, queryClient);

      await expect(source.restore()).resolves.toBe('signed-in');
    });

    it('reports signed-out when there is no session at start-up', async () => {
      const { client } = makeFakeClient({ session: null });
      const source = createSupabaseSessionSource(client, queryClient);

      await expect(source.restore()).resolves.toBe('signed-out');
    });

    it('rejects when Supabase cannot read the session', async () => {
      const { client } = makeFakeClient({ sessionError: new Error('offline') });
      const source = createSupabaseSessionSource(client, queryClient);

      await expect(source.restore()).rejects.toThrow('offline');
    });
  });

  describe('subscribe', () => {
    it('reports sign-in and token refresh with the session present', () => {
      const { client, emit } = makeFakeClient();
      const source = createSupabaseSessionSource(client, queryClient);
      const listener = jest.fn();

      source.subscribe(listener);
      emit('SIGNED_IN', SESSION);
      emit('TOKEN_REFRESHED', SESSION);

      expect(listener.mock.calls).toEqual([['signed-in'], ['signed-in']]);
    });

    it('reports signed-out for an initial session that is missing', () => {
      const { client, emit } = makeFakeClient();
      const source = createSupabaseSessionSource(client, queryClient);
      const listener = jest.fn();

      source.subscribe(listener);
      emit('INITIAL_SESSION', null);

      expect(listener).toHaveBeenCalledWith('signed-out');
    });

    it('removes the Supabase listener when unsubscribed', () => {
      const { client, unsubscribe } = makeFakeClient();
      const source = createSupabaseSessionSource(client, queryClient);

      const stop = source.subscribe(jest.fn());
      stop();

      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('purge on sign-out', () => {
    it('purges when SIGNED_OUT arrives from outside the app, once, and reports signed-out', async () => {
      const { client, auth, emit } = makeFakeClient();
      const source = createSupabaseSessionSource(client, queryClient);
      const listener = jest.fn();
      source.subscribe(listener);
      await seedUserAData(queryClient);

      emit('SIGNED_OUT', null);
      await settle();

      expect(listener).toHaveBeenLastCalledWith('signed-out');
      expect(queryClient.getQueryCache().getAll()).toEqual([]);
      expect(await nativeSessionStorage.getItem('sb-auth-token')).toBeNull();
      expect(await AsyncStorage.getAllKeys()).toEqual([]);
      // The purge's own auth call emits SIGNED_OUT again. That event must not start another purge.
      expect(auth.signOut).toHaveBeenCalledTimes(1);
    });

    it('runs one purge for repeated SIGNED_OUT events', async () => {
      const { client, auth, emit } = makeFakeClient();
      const clear = jest.spyOn(queryClient, 'clear');
      createSupabaseSessionSource(client, queryClient).subscribe(jest.fn());
      await seedUserAData(queryClient);

      emit('SIGNED_OUT', null);
      emit('SIGNED_OUT', null);
      await settle();

      expect(queryClient.getQueryCache().getAll()).toEqual([]);
      expect(clear).toHaveBeenCalledTimes(1);
      expect(auth.signOut).toHaveBeenCalledTimes(1);
    });

    it('signs out through Supabase locally and purges exactly once', async () => {
      const { client, auth } = makeFakeClient();
      const clear = jest.spyOn(queryClient, 'clear');
      const source = createSupabaseSessionSource(client, queryClient);
      const listener = jest.fn();
      source.subscribe(listener);
      await seedUserAData(queryClient);

      await source.signOut();
      await settle();

      expect(auth.signOut).toHaveBeenCalledTimes(1);
      expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
      expect(listener).toHaveBeenCalledWith('signed-out');
      expect(clear).toHaveBeenCalledTimes(1);
      expect(queryClient.getQueryCache().getAll()).toEqual([]);
      expect(await nativeSessionStorage.getItem('sb-auth-token')).toBeNull();
      expect(await AsyncStorage.getAllKeys()).toEqual([]);
    });

    it('still purges when Supabase fails to sign out, and rethrows the error', async () => {
      const { client, auth } = makeFakeClient();
      auth.signOut.mockRejectedValueOnce(new Error('network down'));
      const source = createSupabaseSessionSource(client, queryClient);
      await seedUserAData(queryClient);

      await expect(source.signOut()).rejects.toThrow('network down');

      expect(queryClient.getQueryCache().getAll()).toEqual([]);
      expect(await nativeSessionStorage.getItem('sb-auth-token')).toBeNull();
    });
  });
});
