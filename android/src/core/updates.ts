import { Platform, Linking, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LAST_CHECK_KEY = "spartancode.updates.lastCheck.v1";
const SKIP_VERSION_KEY = "spartancode.updates.skipVersion.v1";
const REPO_OWNER = "Spartan-Software-Enterprises";
const REPO_NAME = "SpartanCode";

export type UpdateInfo = {
  version: string;
  tag: string;
  body: string;
  publishedAt: string;
  apkUrl: string | null;
  apkSize: number | null;
};

export type UpdateStatus = {
  currentVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  downloadUrl: string | null;
  releaseNotes: string | null;
};

function normalizeVersion(v: string): {
  major: number;
  minor: number;
  patch: number;
  preRelease: string;
} {
  const cleaned = v.replace(/^[vV]/, "");
  const dashIdx = cleaned.indexOf("-");
  const numeric = dashIdx >= 0 ? cleaned.slice(0, dashIdx) : cleaned;
  const preRelease = dashIdx >= 0 ? cleaned.slice(dashIdx + 1) : "";
  const parts = numeric.split(".").map(Number);
  return {
    major: parts[0] ?? 0,
    minor: parts[1] ?? 0,
    patch: parts[2] ?? 0,
    preRelease,
  };
}

export function isNewerVersion(current: string, candidate: string): boolean {
  const c = normalizeVersion(current);
  const n = normalizeVersion(candidate);
  if (n.major !== c.major) return n.major > c.major;
  if (n.minor !== c.minor) return n.minor > c.minor;
  if (n.patch !== c.patch) return n.patch > c.patch;
  // Same numeric version: pre-release is always older than release
  if (!n.preRelease && c.preRelease) return true;
  if (n.preRelease && !c.preRelease) return false;
  return n.preRelease > c.preRelease;
}

export function getCurrentVersion(): string {
  try {
    const pkg = require("../../package.json") as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

export async function fetchLatestRelease(): Promise<UpdateInfo | null> {
  try {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "SpartanCode-Android/0.1.0",
      },
    });
    if (!response.ok) return null;
    const release = await response.json();
    const tag: string = release.tag_name ?? "";
    const version = tag.replace(/^[vV]/, "");
    const apkAsset = (release.assets ?? []).find(
      (a: { name?: string }) =>
        typeof a.name === "string" && a.name.endsWith(".apk"),
    );
    return {
      version,
      tag,
      body: release.body ?? "",
      publishedAt: release.published_at ?? "",
      apkUrl: apkAsset?.browser_download_url ?? null,
      apkSize: apkAsset?.size ?? null,
    };
  } catch {
    return null;
  }
}

export async function checkForUpdate(): Promise<UpdateStatus> {
  const currentVersion = getCurrentVersion();
  const release = await fetchLatestRelease();
  if (!release) {
    return {
      currentVersion,
      latestVersion: null,
      updateAvailable: false,
      downloadUrl: null,
      releaseNotes: null,
    };
  }
  const updateAvailable = isNewerVersion(currentVersion, release.version);
  return {
    currentVersion,
    latestVersion: release.version,
    updateAvailable,
    downloadUrl: release.apkUrl,
    releaseNotes: release.body,
  };
}

export async function dismissVersion(version: string): Promise<void> {
  await AsyncStorage.setItem(SKIP_VERSION_KEY, version);
}

export async function getDismissedVersion(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(SKIP_VERSION_KEY)) ?? "";
  } catch {
    return "";
  }
}

export async function recordCheckTime(): Promise<void> {
  await AsyncStorage.setItem(LAST_CHECK_KEY, Date.now().toString());
}

export async function getLastCheckTime(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(LAST_CHECK_KEY);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

export async function shouldAutoCheck(): Promise<boolean> {
  const lastCheck = await getLastCheckTime();
  const sixHoursMs = 6 * 60 * 60 * 1000;
  return Date.now() - lastCheck > sixHoursMs;
}

export async function promptInstallUpdate(info: UpdateInfo): Promise<void> {
  if (Platform.OS !== "android") {
    Alert.alert(
      "Update available",
      `Version ${info.version} is available. Visit GitHub to download.`,
    );
    return;
  }
  if (!info.apkUrl) {
    Alert.alert(
      "Update available",
      `Version ${info.version} is available but no APK was found in the release.`,
    );
    return;
  }
  Alert.alert(
    `Update to v${info.version}`,
    "A new version is ready. Download the update now?",
    [
      { text: "Later", style: "cancel" },
      {
        text: "Download",
        onPress: () => {
          Linking.openURL(info.apkUrl!);
        },
      },
    ],
  );
}

export async function checkAndPromptUpdate(
  forcePrompt = false,
): Promise<boolean> {
  const shouldCheck = forcePrompt || (await shouldAutoCheck());
  if (!shouldCheck) return false;
  await recordCheckTime();
  const status = await checkForUpdate();
  if (!status.updateAvailable) return false;
  const dismissed = await getDismissedVersion();
  if (!forcePrompt && dismissed === status.latestVersion) return false;
  const currentVersion = status.currentVersion;
  const info: UpdateInfo = {
    version: status.latestVersion ?? "",
    tag: `v${status.latestVersion}`,
    body: status.releaseNotes ?? "",
    publishedAt: "",
    apkUrl: status.downloadUrl,
    apkSize: null,
  };
  if (forcePrompt) {
    promptInstallUpdate(info);
  } else {
    Alert.alert(
      `Update available: v${status.latestVersion}`,
      `You're on v${currentVersion}. A new version is available.\n\n${status.releaseNotes?.slice(0, 200) ?? ""}`,
      [
        {
          text: "Skip this version",
          onPress: () => {
            void dismissVersion(status.latestVersion ?? "");
          },
        },
        { text: "Not now", style: "cancel" },
        { text: "Update", onPress: () => promptInstallUpdate(info) },
      ],
    );
  }
  return true;
}
