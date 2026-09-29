import { randomUUID } from "expo-crypto"
import * as Keychain from "react-native-keychain"
import { MMKV } from "react-native-mmkv"

// secure-key.ts

export const storage = new MMKV() // bare RN dùng react-native-get-random-values
export let mmkv: MMKV

const KEYCHAIN_SERVICE = "mmkv-encryption-key"

export async function getOrCreateEncryptionKey(): Promise<string> {
  const stored = await Keychain.getGenericPassword({
    service: KEYCHAIN_SERVICE,
  })

  if (stored) {
    return stored.password
  }

  // Tạo key mới (random, không đoán được)
  const newKey = randomUUID()

  await Keychain.setGenericPassword("mmkv", newKey, {
    service: KEYCHAIN_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
  })

  return newKey
}

export async function initSecureStorage() {
  const encryptionKey = await getOrCreateEncryptionKey()

  mmkv = new MMKV({
    id: "secure-storage",
    encryptionKey,
  })
}

/**
 * Loads a string from storage.
 *
 * @param key The key to fetch.
 */
export function loadString(key: string): string | null {
  try {
    return storage.getString(key) ?? null
  } catch {
    // not sure why this would fail... even reading the RN docs I'm unclear
    return null
  }
}

/**
 * Saves a string to storage.
 *
 * @param key The key to fetch.
 * @param value The value to store.
 */
export function saveString(key: string, value: string): boolean {
  try {
    storage.set(key, value)
    return true
  } catch {
    return false
  }
}

/**
 * Loads something from storage and runs it thru JSON.parse.
 *
 * @param key The key to fetch.
 */
export function load<T>(key: string): T | null {
  let almostThere: string | null = null
  try {
    almostThere = loadString(key)
    return JSON.parse(almostThere ?? "") as T
  } catch {
    return (almostThere as T) ?? null
  }
}

/**
 * Saves an object to storage.
 *
 * @param key The key to fetch.
 * @param value The value to store.
 */
export function save(key: string, value: unknown): boolean {
  try {
    saveString(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

/**
 * Removes something from storage.
 *
 * @param key The key to kill.
 */
export function remove(key: string): void {
  try {
    storage.delete(key)
  } catch {}
}

/**
 * Burn it all to the ground.
 */
export function clear(): void {
  try {
    storage.clearAll()
  } catch {}
}

/**
 * Secure Storage Functions
 * Use these for storing sensitive data like tokens, credentials, etc.
 */

/**
 * Loads a string from secure storage.
 *
 * @param key The key to fetch.
 */
export function loadSecureString(key: string): string | null {
  try {
    return mmkv.getString(key) ?? null
  } catch {
    return null
  }
}

/**
 * Saves a string to secure storage.
 *
 * @param key The key to store.
 * @param value The value to store.
 */
export function saveSecureString(key: string, value: string): boolean {
  try {
    mmkv.set(key, value)
    return true
  } catch {
    return false
  }
}

/**
 * Loads something from secure storage and runs it thru JSON.parse.
 *
 * @param key The key to fetch.
 */
export function loadSecure<T>(key: string): T | null {
  let almostThere: string | null = null
  try {
    almostThere = loadSecureString(key)
    return JSON.parse(almostThere ?? "") as T
  } catch {
    return (almostThere as T) ?? null
  }
}

/**
 * Saves an object to secure storage.
 *
 * @param key The key to store.
 * @param value The value to store.
 */
export function saveSecure(key: string, value: unknown): boolean {
  try {
    saveSecureString(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

/**
 * Removes something from secure storage.
 *
 * @param key The key to remove.
 */
export function removeSecure(key: string): void {
  try {
    mmkv.delete(key)
  } catch {}
}

/**
 * Clears all secure storage.
 */
export function clearSecure(): void {
  try {
    mmkv.clearAll()
  } catch {}
}

/**
 * Token Storage Helpers
 * Convenience functions for storing and retrieving authentication tokens.
 */

const TOKEN_KEY = "auth_token"

/**
 * Saves an authentication token to secure storage.
 *
 * @param token The token to store.
 */
export function saveToken(token: string): boolean {
  return saveSecureString(TOKEN_KEY, token)
}

/**
 * Loads the authentication token from secure storage.
 *
 * @returns The token or null if not found.
 */
export function loadToken(): string | null {
  return loadSecureString(TOKEN_KEY)
}

/**
 * Removes the authentication token from secure storage.
 */
export function removeToken(): void {
  removeSecure(TOKEN_KEY)
}
