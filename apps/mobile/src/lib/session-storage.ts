import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { gcm } from '@noble/ciphers/aes';
import { bytesToHex, bytesToUtf8, hexToBytes, utf8ToBytes } from '@noble/ciphers/utils';
import type { StorageAdapter } from '@sisig/api';

/**
 * Encrypted session storage for React Native (Supabase `auth.storage`).
 *
 * - A random 256-bit AES key lives in the device keystore (expo-secure-store).
 * - Every value is sealed with AES-256-GCM under a fresh 96-bit nonce and stored as
 *   ciphertext in AsyncStorage. Tokens never reach AsyncStorage in plaintext.
 *
 * SecureStore is not used for the session itself: a Supabase session can exceed the
 * ~2KB value size SecureStore is meant for, so only the small key is stored there.
 */

const KEY_NAME = 'sisig_session_key';
const SECURE_OPTIONS = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

/** AsyncStorage namespace for sealed entries. */
const ENTRY_PREFIX = 'sisig.secure.v1:';
/** Entries written by an earlier placeholder implementation. Purged on logout. */
const LEGACY_ENTRY_KEYS = ['sisig_session_encrypted', 'sisig_session_iv'];

const KEY_BYTES = 32;
const NONCE_BYTES = 12;

interface SealedEntry {
  v: 1;
  iv: string;
  ct: string;
}

function entryName(key: string): string {
  return `${ENTRY_PREFIX}${key}`;
}

function isSealedEntry(value: unknown): value is SealedEntry {
  const entry = value as Partial<SealedEntry> | null;
  return (
    typeof entry === 'object' &&
    entry !== null &&
    entry.v === 1 &&
    typeof entry.iv === 'string' &&
    typeof entry.ct === 'string'
  );
}

/** Returns the stored AES key, or null when none exists or the stored value is malformed. */
async function loadKey(): Promise<Uint8Array | null> {
  const stored = await SecureStore.getItemAsync(KEY_NAME, SECURE_OPTIONS);
  if (!stored) {
    return null;
  }
  try {
    const key = hexToBytes(stored);
    return key.length === KEY_BYTES ? key : null;
  } catch {
    return null;
  }
}

async function getOrCreateKey(): Promise<Uint8Array> {
  const existing = await loadKey();
  if (existing) {
    return existing;
  }
  const key = Crypto.getRandomBytes(KEY_BYTES);
  await SecureStore.setItemAsync(KEY_NAME, bytesToHex(key), SECURE_OPTIONS);
  return key;
}

async function seal(plaintext: string): Promise<string> {
  const key = await getOrCreateKey();
  const nonce = Crypto.getRandomBytes(NONCE_BYTES);
  const ciphertext = gcm(key, nonce).encrypt(utf8ToBytes(plaintext));
  const entry: SealedEntry = { v: 1, iv: bytesToHex(nonce), ct: bytesToHex(ciphertext) };
  return JSON.stringify(entry);
}

/**
 * Returns the plaintext, or null when the entry cannot be authenticated
 * (key was reset, entry was tampered with, or the data is corrupt).
 */
async function open(sealed: string): Promise<string | null> {
  const key = await loadKey();
  if (!key) {
    return null;
  }

  let entry: unknown;
  try {
    entry = JSON.parse(sealed);
  } catch {
    return null;
  }
  if (!isSealedEntry(entry)) {
    return null;
  }

  try {
    // GCM verifies the auth tag and throws on any mismatch.
    const plaintext = gcm(key, hexToBytes(entry.iv)).decrypt(hexToBytes(entry.ct));
    return bytesToUtf8(plaintext);
  } catch {
    return null;
  }
}

/**
 * Supabase storage adapter backed by AES-256-GCM. Every key is sealed, not only the session.
 */
export const nativeSessionStorage: StorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    try {
      const sealed = await AsyncStorage.getItem(entryName(key));
      if (sealed === null) {
        return null;
      }

      const value = await open(sealed);
      if (value === null) {
        // Unreadable entries are dropped so the user signs in again instead of looping.
        await AsyncStorage.removeItem(entryName(key));
      }
      return value;
    } catch (error) {
      // Keychain errors (for example, the device is locked) must not wipe the entry.
      console.error('Session storage read failed:', error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(entryName(key), await seal(value));
  },

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(entryName(key));
  },
};

/**
 * Purge all encrypted session data (called on logout).
 * The AES key is deleted first: once it is gone, any ciphertext left behind is unreadable.
 */
export async function clearSessionStorage(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_NAME, SECURE_OPTIONS);

  const allKeys = await AsyncStorage.getAllKeys();
  const entries = allKeys.filter(
    (key) => key.startsWith(ENTRY_PREFIX) || LEGACY_ENTRY_KEYS.includes(key)
  );
  if (entries.length > 0) {
    await AsyncStorage.multiRemove(entries);
  }
}
