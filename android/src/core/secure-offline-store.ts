import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { AES } from "@stablelib/aes";
import { GCM } from "@stablelib/gcm";
import { randomBytes } from "@stablelib/random";

const KEY_PREFIX = "spartancode.mobile.offline-key.v1.";
const MAX_VALUE_BYTES = 512 * 1024;
const KEY_BYTES = 32;
const NONCE_BYTES = 12;

type SecureKeyStore = Pick<typeof SecureStore, "getItemAsync" | "setItemAsync">;

export type OfflineCryptoStatus = {
  enabled: boolean;
  reason: "available" | "secure-storage-unavailable" | "runtime-unavailable";
};

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function fromHex(value: string) {
  if (!/^(?:[0-9a-f]{2})+$/.test(value)) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index++) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function canEncodeText() {
  return (
    typeof TextEncoder !== "undefined" && typeof TextDecoder !== "undefined"
  );
}

function keyName(storageKey: string) {
  return `${KEY_PREFIX}${storageKey.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 96)}`;
}

async function getOrCreateKey(secureStore: SecureKeyStore, storageKey: string) {
  const name = keyName(storageKey);
  const existing = await secureStore.getItemAsync(name);
  if (existing) {
    const decoded = fromHex(existing);
    if (decoded?.length === KEY_BYTES) return decoded;
    throw new Error("Stored offline encryption key is invalid");
  }
  const key = randomBytes(KEY_BYTES);
  await secureStore.setItemAsync(name, toHex(key));
  return key;
}

export function getOfflineCryptoStatus(
  secureStore: SecureKeyStore = SecureStore,
): OfflineCryptoStatus {
  if (!canEncodeText())
    return { enabled: false, reason: "runtime-unavailable" };
  if (!secureStore?.getItemAsync || !secureStore?.setItemAsync)
    return { enabled: false, reason: "secure-storage-unavailable" };
  return { enabled: true, reason: "available" };
}

export async function writeEncryptedOfflineValue(
  storageKey: string,
  value: unknown,
  secureStore: SecureKeyStore = SecureStore,
) {
  if (!getOfflineCryptoStatus(secureStore).enabled)
    throw new Error("Encrypted offline storage is unavailable");
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  if (plaintext.byteLength > MAX_VALUE_BYTES)
    throw new Error("Encrypted offline value exceeds the 512KB limit");
  const key = await getOrCreateKey(secureStore, storageKey);
  const nonce = randomBytes(NONCE_BYTES);
  const sealed = new GCM(new AES(key)).seal(nonce, plaintext);
  await AsyncStorage.setItem(
    storageKey,
    JSON.stringify({ version: 1, nonce: toHex(nonce), sealed: toHex(sealed) }),
  );
}

export async function readEncryptedOfflineValue<T>(
  storageKey: string,
  secureStore: SecureKeyStore = SecureStore,
): Promise<T | null> {
  if (!getOfflineCryptoStatus(secureStore).enabled)
    throw new Error("Encrypted offline storage is unavailable");
  const raw = await AsyncStorage.getItem(storageKey);
  if (!raw) return null;
  try {
    const envelope = JSON.parse(raw) as {
      version?: number;
      nonce?: string;
      sealed?: string;
    };
    if (envelope.version !== 1 || !envelope.nonce || !envelope.sealed)
      return null;
    const nonce = fromHex(envelope.nonce);
    const sealed = fromHex(envelope.sealed);
    if (!nonce || nonce.length !== NONCE_BYTES || !sealed) return null;
    const key = await getOrCreateKey(secureStore, storageKey);
    const plaintext = new GCM(new AES(key)).open(nonce, sealed);
    if (!plaintext || plaintext.byteLength > MAX_VALUE_BYTES) return null;
    return JSON.parse(new TextDecoder().decode(plaintext)) as T;
  } catch {
    return null;
  }
}

export async function removeEncryptedOfflineValue(
  storageKey: string,
  secureStore: SecureKeyStore = SecureStore,
) {
  await AsyncStorage.removeItem(storageKey);
  await secureStore.setItemAsync(keyName(storageKey), "");
}
