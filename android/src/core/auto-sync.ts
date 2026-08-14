export const SYNC_INTERVAL_MS = 60_000;
export const SYNC_BACKOFF_MS = [120_000, 300_000, 600_000] as const;

export type SyncRun = () => Promise<boolean>;
export type Timer = unknown;

export function createAutoSyncLoop(
  run: SyncRun,
  setTimer: (callback: () => void, delay: number) => Timer = (
    callback,
    delay,
  ) => setTimeout(callback, delay),
  clearTimer: (timer: Timer) => void = (timer) =>
    clearTimeout(timer as ReturnType<typeof setTimeout>),
) {
  let stopped = false;
  let timer: Timer | undefined;
  let failures = 0;
  let running = false;

  const schedule = (delay: number) => {
    if (stopped) return;
    timer = setTimer(async () => {
      if (stopped || running) return;
      running = true;
      try {
        const synced = await run();
        failures = synced ? 0 : Math.min(failures + 1, SYNC_BACKOFF_MS.length);
      } catch {
        failures = Math.min(failures + 1, SYNC_BACKOFF_MS.length);
      } finally {
        running = false;
        const retryDelay =
          failures === 0
            ? SYNC_INTERVAL_MS
            : (SYNC_BACKOFF_MS[Math.max(0, failures - 1)] ??
              SYNC_BACKOFF_MS[SYNC_BACKOFF_MS.length - 1]!);
        schedule(retryDelay);
      }
    }, delay);
  };

  schedule(SYNC_INTERVAL_MS);
  return () => {
    stopped = true;
    if (timer !== undefined) clearTimer(timer);
  };
}
