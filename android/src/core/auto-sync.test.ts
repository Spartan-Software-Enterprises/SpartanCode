import {
  createAutoSyncLoop,
  SYNC_BACKOFF_MS,
  SYNC_INTERVAL_MS,
} from "./auto-sync";

describe("continuous sync loop", () => {
  it("schedules normal polling after a successful run", async () => {
    const scheduled: Array<{ callback: () => void; delay: number }> = [];
    const run = jest.fn().mockResolvedValue(true);
    const stop = createAutoSyncLoop(
      run,
      (callback, delay) => {
        scheduled.push({ callback, delay });
        return scheduled.length;
      },
      () => undefined,
    );
    expect(scheduled[0]?.delay).toBe(SYNC_INTERVAL_MS);
    scheduled.shift()?.callback();
    await Promise.resolve();
    await Promise.resolve();
    expect(run).toHaveBeenCalledTimes(1);
    expect(scheduled[0]?.delay).toBe(SYNC_INTERVAL_MS);
    stop();
  });

  it("backs off boundedly when the bridge is unavailable and never overlaps", async () => {
    const scheduled: Array<{ callback: () => void; delay: number }> = [];
    let resolveRun: (() => void) | undefined;
    const run = jest.fn(
      () =>
        new Promise<boolean>((resolve) => (resolveRun = () => resolve(false))),
    );
    const stop = createAutoSyncLoop(
      run,
      (callback, delay) => {
        scheduled.push({ callback, delay });
        return scheduled.length;
      },
      () => undefined,
    );
    scheduled.shift()?.callback();
    scheduled[0]?.callback();
    expect(run).toHaveBeenCalledTimes(1);
    resolveRun?.();
    await Promise.resolve();
    await Promise.resolve();
    expect(scheduled[0]?.delay).toBe(SYNC_BACKOFF_MS[0]);
    stop();
  });
});
