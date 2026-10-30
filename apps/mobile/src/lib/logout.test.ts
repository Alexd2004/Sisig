import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';
import { QueryClient } from '@tanstack/react-query';
import { keys } from '@sisig/api';
import { signOutAndPurge } from './logout';
import { queryPersister } from './query-persistence';
import { nativeSessionStorage } from './session-storage';

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

const USER_A_SESSION = JSON.stringify({ access_token: 'user-a-token', user: { id: 'user-a' } });

function makeSupabase(signOut: jest.Mock) {
  return { auth: { signOut } } as unknown as SupabaseClient;
}

describe('signOutAndPurge', () => {
  let queryClient: QueryClient;

  beforeEach(async () => {
    mockKeystore.clear();
    await AsyncStorage.clear();
    queryClient = new QueryClient();
  });

  it('clears the session, encrypted entries, AES key, query cache and persisted cache', async () => {
    await nativeSessionStorage.setItem('sb-auth-token', USER_A_SESSION);
    queryClient.setQueryData(keys.menu.categories(), ['burger']);
    queryClient.setQueryData(keys.orders.list(), [{ id: 'user-a-order' }]);
    await AsyncStorage.setItem('sisig.query-cache', '{"clientState":{}}');

    const signOut = jest.fn(async () => ({ error: null }));
    await signOutAndPurge(makeSupabase(signOut), queryClient);

    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(await nativeSessionStorage.getItem('sb-auth-token')).toBeNull();
    expect(mockKeystore.has('sisig_session_key')).toBe(false);
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
    expect(queryClient.getQueryData(keys.menu.categories())).toBeUndefined();
    expect(queryClient.getQueryData(keys.orders.list())).toBeUndefined();
  });

  it('gives a second user on the same device none of the first user data', async () => {
    await nativeSessionStorage.setItem('sb-auth-token', USER_A_SESSION);
    queryClient.setQueryData(keys.orders.list(), [{ id: 'user-a-order' }]);

    await signOutAndPurge(makeSupabase(jest.fn(async () => ({ error: null }))), queryClient);

    // User B signs in: the session slot is empty and the cache has nothing from user A.
    expect(await nativeSessionStorage.getItem('sb-auth-token')).toBeNull();
    expect(queryClient.getQueryData(keys.orders.list())).toBeUndefined();
    expect(queryClient.getQueryCache().getAll()).toEqual([]);
  });

  it('still purges everything when sign-out fails, and rethrows the error', async () => {
    await nativeSessionStorage.setItem('sb-auth-token', USER_A_SESSION);
    queryClient.setQueryData(keys.orders.list(), [{ id: 'user-a-order' }]);
    const signOut = jest.fn(async () => {
      throw new Error('network down');
    });

    await expect(signOutAndPurge(makeSupabase(signOut), queryClient)).rejects.toThrow(
      'network down'
    );

    expect(await nativeSessionStorage.getItem('sb-auth-token')).toBeNull();
    expect(mockKeystore.has('sisig_session_key')).toBe(false);
    expect(queryClient.getQueryData(keys.orders.list())).toBeUndefined();
  });

  it('removes the persisted cache from disk', async () => {
    await AsyncStorage.setItem('sisig.query-cache', '{"clientState":{}}');

    await signOutAndPurge(makeSupabase(jest.fn(async () => ({ error: null }))), queryClient);

    expect(await queryPersister.restoreClient()).toBeUndefined();
    expect(await AsyncStorage.getItem('sisig.query-cache')).toBeNull();
  });

  it('signs out, then clears the in-memory cache, then purges the persisted data', async () => {
    const SecureStore = jest.requireMock('expo-secure-store');
    SecureStore.deleteItemAsync.mockClear();
    const signOut = jest.fn(async () => ({ error: null }));
    const clearMemory = jest.spyOn(queryClient, 'clear');
    const removePersisted = jest.spyOn(queryPersister, 'removeClient');

    await signOutAndPurge(makeSupabase(signOut), queryClient);

    const signedOutAt = signOut.mock.invocationCallOrder[0];
    const memoryClearedAt = clearMemory.mock.invocationCallOrder[0];
    const keyDeletedAt = SecureStore.deleteItemAsync.mock.invocationCallOrder[0];
    const persistedClearedAt = removePersisted.mock.invocationCallOrder[0];
    expect(signedOutAt).toBeLessThan(memoryClearedAt);
    expect(memoryClearedAt).toBeLessThan(keyDeletedAt);
    expect(keyDeletedAt).toBeLessThan(persistedClearedAt);

    clearMemory.mockRestore();
    removePersisted.mockRestore();
  });

  it('still clears the in-memory cache and the persisted cache when clearSessionStorage rejects', async () => {
    const SecureStore = jest.requireMock('expo-secure-store');
    SecureStore.deleteItemAsync.mockRejectedValueOnce(new Error('keychain unavailable'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await AsyncStorage.setItem('sisig.query-cache', '{"clientState":{}}');
    queryClient.setQueryData(keys.orders.list(), [{ id: 'user-a-order' }]);

    // Sign-out succeeded, so the purge failure is logged and does not reject the call.
    await expect(
      signOutAndPurge(makeSupabase(jest.fn(async () => ({ error: null }))), queryClient)
    ).resolves.toBeUndefined();

    expect(queryClient.getQueryData(keys.orders.list())).toBeUndefined();
    expect(queryClient.getQueryCache().getAll()).toEqual([]);
    expect(await AsyncStorage.getItem('sisig.query-cache')).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ message: 'keychain unavailable' })
    );

    errorSpy.mockRestore();
  });

  it('runs the other purge steps when clearPersistedQueries rejects', async () => {
    const SecureStore = jest.requireMock('expo-secure-store');
    SecureStore.deleteItemAsync.mockClear();
    await nativeSessionStorage.setItem('sb-auth-token', USER_A_SESSION);
    queryClient.setQueryData(keys.orders.list(), [{ id: 'user-a-order' }]);
    const removePersisted = jest
      .spyOn(queryPersister, 'removeClient')
      .mockRejectedValueOnce(new Error('disk full'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(
      signOutAndPurge(makeSupabase(jest.fn(async () => ({ error: null }))), queryClient)
    ).resolves.toBeUndefined();

    expect(removePersisted).toHaveBeenCalledTimes(1);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(1);
    expect(await nativeSessionStorage.getItem('sb-auth-token')).toBeNull();
    expect(mockKeystore.has('sisig_session_key')).toBe(false);
    expect(queryClient.getQueryData(keys.orders.list())).toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ message: 'disk full' })
    );

    removePersisted.mockRestore();
    errorSpy.mockRestore();
  });

  it('rethrows the sign-out error, not a purge error, when both fail', async () => {
    const SecureStore = jest.requireMock('expo-secure-store');
    SecureStore.deleteItemAsync.mockRejectedValueOnce(new Error('keychain unavailable'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    // auth-js reports API and transport failures as { error }; it does not throw for them.
    const signOut = jest.fn(async () => ({ error: new Error('network down') }));

    await expect(signOutAndPurge(makeSupabase(signOut), queryClient)).rejects.toThrow(
      'network down'
    );

    expect(errorSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ message: 'keychain unavailable' })
    );
    errorSpy.mockRestore();
  });

  it('rethrows a sign-out error that auth-js returns, and still purges everything', async () => {
    await nativeSessionStorage.setItem('sb-auth-token', USER_A_SESSION);
    queryClient.setQueryData(keys.orders.list(), [{ id: 'user-a-order' }]);
    const signOut = jest.fn(async () => ({ error: new Error('network down') }));

    await expect(signOutAndPurge(makeSupabase(signOut), queryClient)).rejects.toThrow(
      'network down'
    );

    expect(await nativeSessionStorage.getItem('sb-auth-token')).toBeNull();
    expect(mockKeystore.has('sisig_session_key')).toBe(false);
    expect(queryClient.getQueryData(keys.orders.list())).toBeUndefined();
  });
});
