import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearSessionStorage, nativeSessionStorage } from './session-storage';

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

const SESSION_JSON = JSON.stringify({
  access_token: 'eyJhbGciOi.SECRET-ACCESS-TOKEN.sig',
  refresh_token: 'SECRET-REFRESH-TOKEN',
  user: { email: 'customer@example.com' },
});

/** Everything the app ever wrote to AsyncStorage, as one string. */
async function asyncStorageDump(): Promise<string> {
  const keys = await AsyncStorage.getAllKeys();
  const pairs = await AsyncStorage.multiGet(keys);
  return JSON.stringify(pairs);
}

describe('nativeSessionStorage', () => {
  beforeEach(async () => {
    mockKeystore.clear();
    await AsyncStorage.clear();
  });

  it('restores the session it was given (survives an app restart)', async () => {
    await nativeSessionStorage.setItem('sb-auth-token', SESSION_JSON);

    expect(await nativeSessionStorage.getItem('sb-auth-token')).toBe(SESSION_JSON);
  });

  it('never leaves the session or tokens in AsyncStorage in plaintext', async () => {
    await nativeSessionStorage.setItem('sb-auth-token', SESSION_JSON);

    const dump = await asyncStorageDump();
    expect(dump).not.toContain('SECRET');
    expect(dump).not.toContain('customer@example.com');
    expect(dump).not.toContain('refresh_token');
  });

  it('keeps the AES key in the keystore, not in AsyncStorage', async () => {
    await nativeSessionStorage.setItem('sb-auth-token', SESSION_JSON);

    const key = mockKeystore.get('sisig_session_key');
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(await asyncStorageDump()).not.toContain(key);
  });

  it('uses a fresh nonce for every write', async () => {
    await nativeSessionStorage.setItem('sb-auth-token', SESSION_JSON);
    const first = await AsyncStorage.getItem('sisig.secure.v1:sb-auth-token');

    await nativeSessionStorage.setItem('sb-auth-token', SESSION_JSON);
    const second = await AsyncStorage.getItem('sisig.secure.v1:sb-auth-token');

    expect(second).not.toEqual(first);
  });

  it('returns null and drops the entry when the ciphertext has been tampered with', async () => {
    await nativeSessionStorage.setItem('sb-auth-token', SESSION_JSON);
    const sealed = JSON.parse(
      (await AsyncStorage.getItem('sisig.secure.v1:sb-auth-token')) ?? '{}'
    );
    const flipped = sealed.ct.slice(0, -1) + (sealed.ct.endsWith('0') ? '1' : '0');
    await AsyncStorage.setItem(
      'sisig.secure.v1:sb-auth-token',
      JSON.stringify({ ...sealed, ct: flipped })
    );

    expect(await nativeSessionStorage.getItem('sb-auth-token')).toBeNull();
    expect(await AsyncStorage.getItem('sisig.secure.v1:sb-auth-token')).toBeNull();
  });

  it('returns null when the keystore key has been reset', async () => {
    await nativeSessionStorage.setItem('sb-auth-token', SESSION_JSON);
    mockKeystore.delete('sisig_session_key');

    expect(await nativeSessionStorage.getItem('sb-auth-token')).toBeNull();
  });

  it('does not drop the entry when the keystore read itself fails', async () => {
    const SecureStore = jest.requireMock('expo-secure-store');
    await nativeSessionStorage.setItem('sb-auth-token', SESSION_JSON);
    SecureStore.getItemAsync.mockRejectedValueOnce(new Error('keychain locked'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(await nativeSessionStorage.getItem('sb-auth-token')).toBeNull();
    expect(await AsyncStorage.getItem('sisig.secure.v1:sb-auth-token')).not.toBeNull();

    errorSpy.mockRestore();
  });

  it('removeItem deletes only the requested entry', async () => {
    await nativeSessionStorage.setItem('sb-auth-token', SESSION_JSON);
    await nativeSessionStorage.setItem('other-key', 'other-value');

    await nativeSessionStorage.removeItem('sb-auth-token');

    expect(await nativeSessionStorage.getItem('sb-auth-token')).toBeNull();
    expect(await nativeSessionStorage.getItem('other-key')).toBe('other-value');
  });

  it('gives two concurrent first writes the same key', async () => {
    const SecureStore = jest.requireMock('expo-secure-store');
    SecureStore.setItemAsync.mockClear();

    // Neither write finds a key yet. Both must share one key creation, not generate two.
    await Promise.all([
      nativeSessionStorage.setItem('sb-auth-token', SESSION_JSON),
      nativeSessionStorage.setItem('other-key', 'other-value'),
    ]);

    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);
    // Both entries open, so both were sealed under the key that is now in the keystore.
    expect(await nativeSessionStorage.getItem('sb-auth-token')).toBe(SESSION_JSON);
    expect(await nativeSessionStorage.getItem('other-key')).toBe('other-value');
  });

  it('retries key creation after a failed first write', async () => {
    const SecureStore = jest.requireMock('expo-secure-store');
    SecureStore.setItemAsync.mockRejectedValueOnce(new Error('keychain write failed'));

    await expect(nativeSessionStorage.setItem('sb-auth-token', SESSION_JSON)).rejects.toThrow(
      'keychain write failed'
    );

    await nativeSessionStorage.setItem('sb-auth-token', SESSION_JSON);
    expect(await nativeSessionStorage.getItem('sb-auth-token')).toBe(SESSION_JSON);
  });

  describe('clearSessionStorage', () => {
    it('deletes every sealed entry, the legacy entries and the AES key', async () => {
      await nativeSessionStorage.setItem('sb-auth-token', SESSION_JSON);
      await AsyncStorage.setItem('sisig_session_encrypted', 'legacy');

      await clearSessionStorage();

      expect(await AsyncStorage.getAllKeys()).toEqual([]);
      expect(mockKeystore.has('sisig_session_key')).toBe(false);
      expect(await nativeSessionStorage.getItem('sb-auth-token')).toBeNull();
    });

    it('still removes the sealed entries when deleting the key rejects', async () => {
      const SecureStore = jest.requireMock('expo-secure-store');
      await nativeSessionStorage.setItem('sb-auth-token', SESSION_JSON);
      SecureStore.deleteItemAsync.mockRejectedValueOnce(new Error('keychain unavailable'));

      await expect(clearSessionStorage()).rejects.toThrow('keychain unavailable');

      expect(await AsyncStorage.getItem('sisig.secure.v1:sb-auth-token')).toBeNull();
    });

    it('leaves unrelated AsyncStorage keys alone', async () => {
      await AsyncStorage.setItem('app:onboarding-seen', 'true');
      await nativeSessionStorage.setItem('sb-auth-token', SESSION_JSON);

      await clearSessionStorage();

      expect(await AsyncStorage.getItem('app:onboarding-seen')).toBe('true');
    });
  });
});
