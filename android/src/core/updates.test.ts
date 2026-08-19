jest.mock("react-native", () => ({
  Platform: { OS: "android" },
  Alert: { alert: jest.fn() },
  Linking: { openURL: jest.fn() },
}));

jest.mock("@react-native-async-storage/async-storage", () => {
  const store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => store[key] ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: jest.fn(async (key: string) => {
        delete store[key];
      }),
      clear: jest.fn(async () => {
        Object.keys(store).forEach((k) => delete store[k]);
      }),
    },
  };
});

import {
  isNewerVersion,
  getCurrentVersion,
  checkForUpdate,
  fetchLatestRelease,
  checkAndPromptUpdate,
} from "./updates";
import { Alert, Linking } from "react-native";

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("updates", () => {
  describe("isNewerVersion", () => {
    it("returns true when candidate is newer", () => {
      expect(isNewerVersion("0.1.0", "0.1.1")).toBe(true);
      expect(isNewerVersion("0.1.0", "0.2.0")).toBe(true);
      expect(isNewerVersion("0.1.0", "1.0.0")).toBe(true);
    });

    it("returns false when candidate is same or older", () => {
      expect(isNewerVersion("0.1.0", "0.1.0")).toBe(false);
      expect(isNewerVersion("0.1.1", "0.1.0")).toBe(false);
      expect(isNewerVersion("1.0.0", "0.1.0")).toBe(false);
    });

    it("handles v prefix", () => {
      expect(isNewerVersion("0.1.0", "v0.1.1")).toBe(true);
      expect(isNewerVersion("v0.1.0", "0.1.0")).toBe(false);
    });

    it("handles pre-release suffixes", () => {
      expect(isNewerVersion("0.1.0-alpha.1", "0.1.0")).toBe(true);
      expect(isNewerVersion("0.1.0", "0.1.0-alpha.1")).toBe(false);
    });
  });

  describe("getCurrentVersion", () => {
    it("returns a version string", () => {
      const version = getCurrentVersion();
      expect(version).toMatch(/^\d+\.\d+\.\d+/);
    });
  });

  describe("fetchLatestRelease", () => {
    it("returns null on fetch failure", async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });
      const result = await fetchLatestRelease();
      expect(result).toBeNull();
    });

    it("parses release with APK asset", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          tag_name: "v0.2.0",
          body: "New features",
          published_at: "2026-08-19T00:00:00Z",
          assets: [
            {
              name: "SpartanCode-v0.2.0-release.apk",
              browser_download_url: "https://example.com/apk",
              size: 1024000,
            },
          ],
        }),
      });
      const result = await fetchLatestRelease();
      expect(result).toEqual({
        version: "0.2.0",
        tag: "v0.2.0",
        body: "New features",
        publishedAt: "2026-08-19T00:00:00Z",
        apkUrl: "https://example.com/apk",
        apkSize: 1024000,
      });
    });

    it("returns release info when no APK in release", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          tag_name: "v0.2.0",
          body: "No APK",
          published_at: "2026-08-19T00:00:00Z",
          assets: [],
        }),
      });
      const result = await fetchLatestRelease();
      expect(result).not.toBeNull();
      expect(result!.apkUrl).toBeNull();
    });
  });

  describe("checkForUpdate", () => {
    it("returns update available when newer version exists", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          tag_name: "v9.0.0",
          body: "Major update",
          published_at: "2026-08-19T00:00:00Z",
          assets: [
            {
              name: "SpartanCode-v9.0.0-release.apk",
              browser_download_url: "https://example.com/apk",
              size: 1024000,
            },
          ],
        }),
      });
      const status = await checkForUpdate();
      expect(status.updateAvailable).toBe(true);
      expect(status.latestVersion).toBe("9.0.0");
      expect(status.downloadUrl).toBe("https://example.com/apk");
    });

    it("returns no update when on latest", async () => {
      const current = getCurrentVersion();
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          tag_name: `v${current}`,
          body: "Current",
          published_at: "2026-08-19T00:00:00Z",
          assets: [
            {
              name: `SpartanCode-v${current}-release.apk`,
              browser_download_url: "https://example.com/apk",
              size: 1024000,
            },
          ],
        }),
      });
      const status = await checkForUpdate();
      expect(status.updateAvailable).toBe(false);
    });
  });

  describe("checkAndPromptUpdate", () => {
    it("prompts when update available and forced", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          tag_name: "v9.0.0",
          body: "Major",
          published_at: "2026-08-19T00:00:00Z",
          assets: [
            {
              name: "SpartanCode-v9.0.0-release.apk",
              browser_download_url: "https://example.com/apk",
              size: 1024000,
            },
          ],
        }),
      });
      const result = await checkAndPromptUpdate(true);
      expect(result).toBe(true);
      expect(Alert.alert).toHaveBeenCalled();
    });

    it("skips when no update available", async () => {
      const current = getCurrentVersion();
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          tag_name: `v${current}`,
          body: "Same",
          published_at: "2026-08-19T00:00:00Z",
          assets: [
            {
              name: `SpartanCode-v${current}-release.apk`,
              browser_download_url: "https://example.com/apk",
              size: 1024000,
            },
          ],
        }),
      });
      const result = await checkAndPromptUpdate(true);
      expect(result).toBe(false);
    });
  });
});
