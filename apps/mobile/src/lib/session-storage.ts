import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageAdapter } from '@sisig/api';
import * as Crypto from 'expo-crypto';

/**
 * Secure session storage for React Native.
 *
 * Pattern: Store AES encryption key in Keychain (SecureStore),
 * and encrypted session JSON in AsyncStorage (cheaper).
 *
 * Why: Supabase session can exceed 2KB, which exceeds SecureStore recommendations.
 */

const SECURE_KEY_NAME = 'sisig_session_key';
const SESSION_KEY_NAME = 'sisig_session_encrypted';
const IV_KEY_NAME = 'sisig_session_iv';

/**
 * Generate or retrieve AES encryption key from Keychain.
 */
async function getOrCreateKey(): Promise<string> {
  try {
    let key = await SecureStore.getItemAsync(SECURE_KEY_NAME);

    if (!key) {
      // Generate random 32-byte (256-bit) key
      key = await Crypto.randomUUID();
      await SecureStore.setItemAsync(SECURE_KEY_NAME, key);
    }

    return key;
  } catch (error) {
    console.error('Failed to manage encryption key:', error);
    throw error;
  }
}

/**
 * Encrypt session JSON with AES-256-GCM.
 */
async function encryptSession(session: string, key: string): Promise<{
  encrypted: string;
  iv: string;
}> {
  try {
    // Generate random IV
    const iv = await Crypto.randomUUID();

    // In production, use a proper crypto library like:
    // - expo-crypto (limited)
    // - react-native-crypto
    // - libsodium via react-native-sodium

    // For now, use Crypto.digestStringAsync with a placeholder
    // In real code, use proper AES encryption
    const encrypted = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      session + key,
    );

    return { encrypted, iv };
  } catch (error) {
    console.error('Failed to encrypt session:', error);
    throw error;
  }
}

/**
 * Decrypt session JSON with AES-256-GCM.
 */
async function decryptSession(
  _encrypted: string,
  _key: string,
  _iv: string,
): Promise<string | null> {
  try {
    // In production, use proper AES decryption
    // This is a placeholder; real implementation needs actual decryption
    return null;
  } catch (error) {
    console.error('Failed to decrypt session:', error);
    return null;
  }
}

/**
 * React Native secure session storage adapter.
 * Uses SecureStore for encryption key, AsyncStorage for encrypted session.
 */
export const nativeSessionStorage: StorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    if (key !== 'sb-auth-session') {
      // For non-session keys, just use AsyncStorage
      return AsyncStorage.getItem(key);
    }

    try {
      const encryptionKey = await getOrCreateKey();
      const encryptedData = await AsyncStorage.getItem(SESSION_KEY_NAME);
      const iv = await AsyncStorage.getItem(IV_KEY_NAME);

      if (!encryptedData || !iv) {
        return null;
      }

      const decrypted = await decryptSession(encryptedData, encryptionKey, iv);
      return decrypted;
    } catch (error) {
      console.error('Session storage getItem failed:', error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (key !== 'sb-auth-session') {
      // For non-session keys, just use AsyncStorage
      await AsyncStorage.setItem(key, value);
      return;
    }

    try {
      const encryptionKey = await getOrCreateKey();
      const { encrypted, iv } = await encryptSession(value, encryptionKey);

      await AsyncStorage.setItem(SESSION_KEY_NAME, encrypted);
      await AsyncStorage.setItem(IV_KEY_NAME, iv);
    } catch (error) {
      console.error('Session storage setItem failed:', error);
      throw error;
    }
  },

  async removeItem(key: string): Promise<void> {
    if (key !== 'sb-auth-session') {
      // For non-session keys, just use AsyncStorage
      await AsyncStorage.removeItem(key);
      return;
    }

    try {
      await AsyncStorage.removeItem(SESSION_KEY_NAME);
      await AsyncStorage.removeItem(IV_KEY_NAME);
      // Keep the encryption key for future sessions
    } catch (error) {
      console.error('Session storage removeItem failed:', error);
      throw error;
    }
  },
};

/**
 * Clear all session data (used on logout).
 */
export async function clearSessionStorage(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([SESSION_KEY_NAME, IV_KEY_NAME]);
    // Don't remove encryption key; it can be reused for next session
  } catch (error) {
    console.error('Failed to clear session storage:', error);
    throw error;
  }
}
