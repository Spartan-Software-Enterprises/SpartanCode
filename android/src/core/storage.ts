import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import type { ConnectionProfile, MobileSnapshot } from "./types";

const SNAPSHOT_KEY = "spartancode.mobile.snapshot.v1";
const BRIDGE_TOKEN_KEY = "spartancode.mobile.bridge-token.v1";

const emptySnapshot: MobileSnapshot = {
  missions: [],
  connections: [],
  pendingApprovals: 0,
  offline: true,
};

export async function readSnapshot(): Promise<MobileSnapshot> {
  const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
  if (!raw) return emptySnapshot;
  try {
    const parsed = JSON.parse(raw) as Partial<MobileSnapshot>;
    return {
      ...emptySnapshot,
      ...parsed,
      missions: Array.isArray(parsed.missions) ? parsed.missions : [],
      connections: Array.isArray(parsed.connections) ? parsed.connections : [],
    };
  } catch {
    return emptySnapshot;
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

export async function saveBridgeToken(token: string) {
  await SecureStore.setItemAsync(BRIDGE_TOKEN_KEY, token, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
}

export function readBridgeToken() {
  return SecureStore.getItemAsync(BRIDGE_TOKEN_KEY);
}
