import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  enqueueOperation,
  readQueuedOperations,
  removeQueuedOperation,
  updateQueuedOperation,
} from "./storage";

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
});
