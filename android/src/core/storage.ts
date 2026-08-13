import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import type { ConnectionProfile, MobileSnapshot } from "./types";
import { isConnectionProfile, isMission } from "./types";

const SNAPSHOT_KEY = "spartancode.mobile.snapshot.v1";
const BRIDGE_TOKEN_KEY = "spartancode.mobile.bridge-token.v1";

function emptySnapshot(): MobileSnapshot {
  return { missions: [], connections: [], pendingApprovals: 0, offline: true };
}

function tokenKey(endpoint: string) {
  return `${BRIDGE_TOKEN_KEY}.${new URL(endpoint).origin.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
}

export async function readSnapshot(): Promise<MobileSnapshot> {
  try {
    const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return emptySnapshot();
    const parsed = JSON.parse(raw) as Partial<MobileSnapshot>;
    return {
      ...emptySnapshot(),
      missions: Array.isArray(parsed.missions)
        ? parsed.missions.filter(isMission)
        : [],
      connections: Array.isArray(parsed.connections)
        ? parsed.connections.filter(isConnectionProfile)
        : [],
      pendingApprovals:
        typeof parsed.pendingApprovals === "number" &&
        Number.isInteger(parsed.pendingApprovals) &&
        parsed.pendingApprovals >= 0
          ? parsed.pendingApprovals
          : 0,
      offline: true,
    };
  } catch {
    return emptySnapshot();
  }
}

export async function writeSnapshot(snapshot: MobileSnapshot) {
  await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
}

export async function addConnection(connection: ConnectionProfile) {
  const snapshot = await readSnapshot();
  await writeSnapshot({
    ...snapshot,
    connections: [
      ...snapshot.connections.filter((item) => item.id !== connection.id),
      connection,
    ],
  });
}

export async function saveBridgeToken(endpoint: string, token: string) {
  await SecureStore.setItemAsync(
    tokenKey(endpoint),
    JSON.stringify({ endpoint: new URL(endpoint).origin, token }),
    {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    },
  );
}

export async function readBridgeToken(endpoint: string) {
  const origin = new URL(endpoint).origin;
  const scopedKey = tokenKey(endpoint);
  let raw = await SecureStore.getItemAsync(scopedKey);
  if (!raw) {
    raw = await SecureStore.getItemAsync(BRIDGE_TOKEN_KEY);
    if (raw) await SecureStore.setItemAsync(scopedKey, raw);
  }
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw) as { endpoint?: string; token?: string };
    return saved.endpoint === origin && saved.token ? saved.token : null;
  } catch {
    return null;
  }
}
