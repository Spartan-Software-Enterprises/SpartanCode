import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getOfflineCryptoStatus,
  readEncryptedOfflineValue,
  removeEncryptedOfflineValue,
  writeEncryptedOfflineValue,
} from "./secure-offline-store";

const secureStore = new Map<string, string>();
const secureStoreAdapter = {
  getItemAsync: async (key: string) => secureStore.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => {
    secureStore.set(key, value);
  },
};

describe("encrypted Android offline content", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    secureStore.clear();
  });

  it("encrypts content with a SecureStore-backed device key", async () => {
    expect(getOfflineCryptoStatus(secureStoreAdapter)).toEqual({
      enabled: true,
      reason: "available",
    });
    await writeEncryptedOfflineValue(
      "spartancode.mobile.offline.test.v1",
      { mission: "Keep private", count: 2 },
      secureStoreAdapter,
    );
    const raw = await AsyncStorage.getItem(
      "spartancode.mobile.offline.test.v1",
    );
    expect(raw).not.toContain("Keep private");
    await expect(
      readEncryptedOfflineValue(
        "spartancode.mobile.offline.test.v1",
        secureStoreAdapter,
      ),
    ).resolves.toEqual({ mission: "Keep private", count: 2 });
  });

  it("fails closed when ciphertext is tampered with", async () => {
    const key = "spartancode.mobile.offline.tamper.v1";
    await writeEncryptedOfflineValue(
      key,
      { secret: "value" },
      secureStoreAdapter,
    );
    const raw = await AsyncStorage.getItem(key);
    await AsyncStorage.setItem(key, `${raw?.slice(0, -3)}fff`);
    await expect(
      readEncryptedOfflineValue(key, secureStoreAdapter),
    ).resolves.toBeNull();
  });

  it("removes ciphertext and rotates the stored key on cleanup", async () => {
    const key = "spartancode.mobile.offline.remove.v1";
    await writeEncryptedOfflineValue(key, { value: true }, secureStoreAdapter);
    await removeEncryptedOfflineValue(key, secureStoreAdapter);
    expect(await AsyncStorage.getItem(key)).toBeNull();
    await expect(
      readEncryptedOfflineValue(key, secureStoreAdapter),
    ).resolves.toBeNull();
  });
});
