import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  enqueueOperation,
  readCollaborationSessions,
  readSnapshot,
  readBiometricSetting,
  readQueuedOperations,
  removeQueuedOperation,
  updateQueuedOperation,
  writeBiometricSetting,
  writeCollaborationSessions,
} from "./storage";
import { createMobileCollaborationSession } from "./collaboration";

describe("offline operation queue", () => {
  beforeEach(async () => AsyncStorage.clear());

  it("deduplicates by idempotency key and survives updates", async () => {
    const operation = {
      idempotencyKey: "mission-1",
      method: "POST" as const,
      path: "/v1/missions",
      body: { description: "Build it" },
    };
    await enqueueOperation(operation);
    await enqueueOperation(operation);
    await updateQueuedOperation("mission-1", {
      attempts: 1,
      lastError: "offline",
    });
    expect((await readQueuedOperations())[0]).toMatchObject({
      idempotencyKey: "mission-1",
      attempts: 1,
      lastError: "offline",
    });
    await removeQueuedOperation("mission-1");
    expect(await readQueuedOperations()).toEqual([]);
  });

  it("restores an in-flight mutation from a persisted queue record", async () => {
    await AsyncStorage.setItem(
      "spartancode.mobile.queue.v1",
      JSON.stringify([
        {
          idempotencyKey: "restart-1",
          method: "POST",
          path: "/v1/missions",
          body: { description: "Recover after restart" },
          queuedAt: "2026-08-13T00:00:00.000Z",
          attempts: 2,
          lastError: "bridge unavailable",
        },
      ]),
    );
    const recovered = await readQueuedOperations();
    expect(recovered).toEqual([
      expect.objectContaining({
        idempotencyKey: "restart-1",
        attempts: 2,
        lastError: "bridge unavailable",
      }),
    ]);
  });
});

describe("storage recovery", () => {
  beforeEach(async () => AsyncStorage.clear());

  it("quarantines malformed snapshots and returns an offline-safe empty state", async () => {
    await AsyncStorage.setItem("spartancode.mobile.snapshot.v1", "{broken");
    expect(await readSnapshot()).toMatchObject({
      missions: [],
      connections: [],
      offline: true,
    });
    expect(
      await AsyncStorage.getItem("spartancode.mobile.snapshot.v1"),
    ).toBeNull();
    expect(
      await AsyncStorage.getItem("spartancode.mobile.snapshot.quarantine.v1"),
    ).toContain("broken");
  });

  it("migrates older snapshots while preserving valid missions", async () => {
    await AsyncStorage.setItem(
      "spartancode.mobile.snapshot.v1",
      JSON.stringify({
        missions: [
          {
            id: "m1",
            description: "Keep me",
            status: "planning",
            updatedAt: "2026-08-13T00:00:00.000Z",
          },
        ],
      }),
    );
    expect(await readSnapshot()).toMatchObject({
      schemaVersion: 1,
      missions: [{ id: "m1" }],
    });
  });
});

describe("biometric preference", () => {
  beforeEach(async () => AsyncStorage.clear());

  it("persists only the enabled/disabled preference", async () => {
    expect(await readBiometricSetting()).toBe(false);
    await writeBiometricSetting(true);
    expect(await readBiometricSetting()).toBe(true);
    expect(
      await AsyncStorage.getItem("spartancode.mobile.biometric-unlock.v1"),
    ).toBe("enabled");
  });
});

describe("standalone collaboration storage", () => {
  beforeEach(async () => AsyncStorage.clear());

  it("persists and validates local sessions without a bridge", async () => {
    const session = createMobileCollaborationSession(
      "Offline roadmap",
      "owner",
      "2026-08-13T00:00:00.000Z",
    );
    await writeCollaborationSessions([session]);
    await AsyncStorage.setItem(
      "spartancode.mobile.collaboration.v1",
      JSON.stringify([session, { malformed: true }]),
    );
    expect(await readCollaborationSessions()).toEqual([session]);
  });
});
