import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import type {
  ConnectionProfile,
  Artifact,
  MobileSnapshot,
  QueuedOperation,
} from "./types";
import type { MobileCollaborationSession } from "./collaboration";
import type { MobileProject } from "./project-release";
import { normalizeProject } from "./project-release";
import { normalizeCollaborationSessions } from "./collaboration";
import {
  getOfflineCryptoStatus,
  readEncryptedOfflineValue,
  writeEncryptedOfflineValue,
} from "./secure-offline-store";
import {
  isActivity,
  isApproval,
  isArtifact,
  isAuditEvent,
  isConnectionProfile,
  isMission,
  isQueuedOperation,
} from "./types";

const SNAPSHOT_KEY = "spartancode.mobile.snapshot.v1";
const ENCRYPTED_SNAPSHOT_KEY = "spartancode.mobile.snapshot.encrypted.v1";
const QUEUE_KEY = "spartancode.mobile.queue.v1";
const BRIDGE_TOKEN_KEY = "spartancode.mobile.bridge-token.v1";
const BRIDGE_TOKEN_INDEX_KEY = "spartancode.mobile.bridge-token-index.v1";
const SNAPSHOT_QUARANTINE_KEY = "spartancode.mobile.snapshot.quarantine.v1";
const QUEUE_QUARANTINE_KEY = "spartancode.mobile.queue.quarantine.v1";
const BIOMETRIC_SETTING_KEY = "spartancode.mobile.biometric-unlock.v1";
const MOBILE_SETTINGS_KEY = "spartancode.mobile.settings.v1";
const MOBILE_SETTINGS_LAYERS_KEY = "spartancode.mobile.settings-layers.v1";
const COLLABORATION_KEY = "spartancode.mobile.collaboration.v1";
const PROJECTS_KEY = "spartancode.mobile.projects.v1";
const ARTIFACT_SYNC_BASE_KEY = "spartancode.mobile.artifact-sync-base.v1";
const CURRENT_SNAPSHOT_VERSION = 1;

export type MobileSettings = {
  model: string;
  defaultAgent: string;
  protocol: "MCP Lite" | "MCP Bridge" | "Full MCP";
  provider: string;
  memoryEnabled: boolean;
  executionMode: "guided" | "yolo";
  quantization: "Q4_K_M" | "Q4_0" | "Q3_K_S";
  voiceEnabled: boolean;
  autoSync: boolean;
  personaName: string;
  wakeWord: string;
  emotionMode: "off" | "explicit";
  interactionSignal:
    "calm" | "focused" | "frustrated" | "uncertain" | "excited" | "tired";
};

export type MobileSettingsLayers = {
  global: Partial<MobileSettings>;
  project: Record<string, Partial<MobileSettings>>;
  agent: Record<string, Partial<MobileSettings>>;
  session: Record<string, Partial<MobileSettings>>;
};

export type MobileSettingsContext = {
  projectId?: string;
  agentId?: string;
  sessionId?: string;
};

const defaultMobileSettings: MobileSettings = {
  model: "Qwen3-1.7B",
  defaultAgent: "leo",
  protocol: "MCP Lite",
  provider: "local",
  memoryEnabled: true,
  executionMode: "guided",
  quantization: "Q4_K_M",
  voiceEnabled: false,
  autoSync: true,
  personaName: "Leo",
  wakeWord: "Leo",
  emotionMode: "explicit",
  interactionSignal: "calm",
};

const emptyMobileSettingsLayers = (): MobileSettingsLayers => ({
  global: {},
  project: {},
  agent: {},
  session: {},
});

function normalizeMobileSettings(
  parsed: Partial<MobileSettings>,
): MobileSettings {
  return {
    ...defaultMobileSettings,
    model:
      typeof parsed.model === "string" && parsed.model.trim()
        ? parsed.model.trim().slice(0, 160)
        : "Qwen3-1.7B",
    defaultAgent:
      typeof parsed.defaultAgent === "string" &&
      [
        "leo",
        "researcher",
        "implementer",
        "verifier",
        "sync-guardian",
      ].includes(parsed.defaultAgent)
        ? parsed.defaultAgent
        : "leo",
    protocol:
      parsed.protocol === "MCP Bridge" || parsed.protocol === "Full MCP"
        ? parsed.protocol
        : "MCP Lite",
    provider:
      typeof parsed.provider === "string" && parsed.provider.trim()
        ? parsed.provider.trim().slice(0, 48)
        : "local",
    memoryEnabled: parsed.memoryEnabled !== false,
    executionMode: parsed.executionMode === "yolo" ? "yolo" : "guided",
    quantization:
      parsed.quantization === "Q4_0" || parsed.quantization === "Q3_K_S"
        ? parsed.quantization
        : "Q4_K_M",
    voiceEnabled: parsed.voiceEnabled === true,
    autoSync: parsed.autoSync !== false,
    personaName:
      typeof parsed.personaName === "string" && parsed.personaName.trim()
        ? parsed.personaName.trim().slice(0, 48)
        : "Leo",
    wakeWord:
      typeof parsed.wakeWord === "string" && parsed.wakeWord.trim()
        ? parsed.wakeWord.trim().slice(0, 48)
        : "Leo",
    emotionMode: parsed.emotionMode === "off" ? "off" : "explicit",
    interactionSignal:
      parsed.interactionSignal === "focused" ||
      parsed.interactionSignal === "frustrated" ||
      parsed.interactionSignal === "uncertain" ||
      parsed.interactionSignal === "excited" ||
      parsed.interactionSignal === "tired"
        ? parsed.interactionSignal
        : "calm",
  };
}

function normalizeMobileSettingsOverride(
  parsed: Partial<MobileSettings>,
): Partial<MobileSettings> {
  const normalized = normalizeMobileSettings(parsed);
  const allowed = new Set<keyof MobileSettings>([
    "model",
    "defaultAgent",
    "protocol",
    "provider",
    "memoryEnabled",
    "executionMode",
    "quantization",
    "voiceEnabled",
    "autoSync",
    "personaName",
    "wakeWord",
    "emotionMode",
    "interactionSignal",
  ]);
  return Object.fromEntries(
    Object.keys(parsed)
      .filter((key): key is keyof MobileSettings =>
        allowed.has(key as keyof MobileSettings),
      )
      .map((key) => [key, normalized[key]]),
  ) as Partial<MobileSettings>;
}

function normalizeMobileSettingsLayers(value: unknown): MobileSettingsLayers {
  if (!value || typeof value !== "object") return emptyMobileSettingsLayers();
  const parsed = value as Partial<MobileSettingsLayers>;
  const normalizeMap = (map: unknown) => {
    if (!map || typeof map !== "object") return {};
    return Object.fromEntries(
      Object.entries(map).map(([key, settings]) => [
        key.slice(0, 160),
        normalizeMobileSettingsOverride(
          (settings || {}) as Partial<MobileSettings>,
        ),
      ]),
    );
  };
  return {
    global: normalizeMobileSettingsOverride(
      (parsed.global || {}) as Partial<MobileSettings>,
    ),
    project: normalizeMap(parsed.project),
    agent: normalizeMap(parsed.agent),
    session: normalizeMap(parsed.session),
  };
}

function emptySnapshot(): MobileSnapshot {
  return {
    schemaVersion: CURRENT_SNAPSHOT_VERSION,
    missions: [],
    connections: [],
    pendingApprovals: 0,
    offline: true,
  };
}

function normalizeSnapshot(parsed: Partial<MobileSnapshot>): MobileSnapshot {
  return {
    ...emptySnapshot(),
    schemaVersion: CURRENT_SNAPSHOT_VERSION,
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
    syncedAt:
      typeof parsed.syncedAt === "string" &&
      Number.isFinite(Date.parse(parsed.syncedAt))
        ? parsed.syncedAt
        : undefined,
    artifacts: Array.isArray(parsed.artifacts)
      ? parsed.artifacts.filter(isArtifact)
      : [],
    approvals: Array.isArray(parsed.approvals)
      ? parsed.approvals.filter(isApproval)
      : [],
    activity: Array.isArray(parsed.activity)
      ? parsed.activity.filter(isActivity)
      : [],
    auditLog: Array.isArray(parsed.auditLog)
      ? parsed.auditLog.filter(isAuditEvent)
      : [],
  };
}

function tokenKey(endpoint: string) {
  return `${BRIDGE_TOKEN_KEY}.${new URL(endpoint).origin.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
}

async function quarantineCorruptValue(key: string, raw: string | null) {
  if (!raw) return;
  try {
    await AsyncStorage.setItem(
      key,
      JSON.stringify({
        quarantinedAt: new Date().toISOString(),
        raw: raw.slice(0, 1_000_000),
      }),
    );
  } catch {
    // Recovery must never prevent the app from starting offline.
  }
}

async function recoverCorruptValue(sourceKey: string, quarantineKey: string) {
  try {
    const raw = await AsyncStorage.getItem(sourceKey);
    await quarantineCorruptValue(quarantineKey, raw);
    await AsyncStorage.removeItem(sourceKey);
  } catch {
    // Recovery must never prevent the app from starting offline.
  }
}

export async function readSnapshot(): Promise<MobileSnapshot> {
  let encrypted: Partial<MobileSnapshot> | null = null;
  try {
    encrypted = await readEncryptedOfflineValue<Partial<MobileSnapshot>>(
      ENCRYPTED_SNAPSHOT_KEY,
    );
  } catch {
    // A platform without the crypto runtime may still read legacy data so it
    // can be migrated when encryption becomes available.
  }
  if (encrypted) return normalizeSnapshot(encrypted);
  try {
    const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return emptySnapshot();
    const normalized = normalizeSnapshot(JSON.parse(raw));
    if (getOfflineCryptoStatus().enabled) {
      await writeEncryptedOfflineValue(ENCRYPTED_SNAPSHOT_KEY, normalized);
      await AsyncStorage.removeItem(SNAPSHOT_KEY);
    }
    return normalized;
  } catch {
    await recoverCorruptValue(SNAPSHOT_KEY, SNAPSHOT_QUARANTINE_KEY);
    return emptySnapshot();
  }
}

export async function writeSnapshot(snapshot: MobileSnapshot) {
  try {
    await writeEncryptedOfflineValue(ENCRYPTED_SNAPSHOT_KEY, snapshot);
    await AsyncStorage.removeItem(SNAPSHOT_KEY);
  } catch (error) {
    if (getOfflineCryptoStatus().enabled) throw error;
    await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  }
}

export async function readArtifactSyncBase(): Promise<Artifact[]> {
  try {
    const raw = await AsyncStorage.getItem(ARTIFACT_SYNC_BASE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isArtifact) : [];
  } catch {
    return [];
  }
}

export async function writeArtifactSyncBase(artifacts: Artifact[]) {
  await AsyncStorage.setItem(
    ARTIFACT_SYNC_BASE_KEY,
    JSON.stringify(artifacts.filter(isArtifact).slice(0, 500)),
  );
}

export async function readCollaborationSessions(): Promise<
  MobileCollaborationSession[]
> {
  try {
    const raw = await AsyncStorage.getItem(COLLABORATION_KEY);
    return normalizeCollaborationSessions(raw ? JSON.parse(raw) : []);
  } catch {
    await recoverCorruptValue(
      COLLABORATION_KEY,
      "spartancode.mobile.collaboration.quarantine.v1",
    );
    return [];
  }
}

export async function writeCollaborationSessions(
  sessions: MobileCollaborationSession[],
) {
  await AsyncStorage.setItem(COLLABORATION_KEY, JSON.stringify(sessions));
}

export async function readMobileProjects(): Promise<MobileProject[]> {
  try {
    const raw = await AsyncStorage.getItem(PROJECTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed
          .map(normalizeProject)
          .filter((item): item is MobileProject => !!item)
      : [];
  } catch {
    return [];
  }
}

export async function writeMobileProjects(projects: MobileProject[]) {
  await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export async function readBiometricSetting() {
  return (await AsyncStorage.getItem(BIOMETRIC_SETTING_KEY)) === "enabled";
}

export async function writeBiometricSetting(enabled: boolean) {
  await AsyncStorage.setItem(
    BIOMETRIC_SETTING_KEY,
    enabled ? "enabled" : "disabled",
  );
}

export async function readMobileSettings(): Promise<MobileSettings> {
  try {
    const raw = await AsyncStorage.getItem(MOBILE_SETTINGS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<MobileSettings>) : {};
    return normalizeMobileSettings(parsed);
  } catch {
    return { ...defaultMobileSettings };
  }
}

export async function writeMobileSettings(settings: MobileSettings) {
  await AsyncStorage.setItem(MOBILE_SETTINGS_KEY, JSON.stringify(settings));
}

export async function readMobileSettingsLayers(): Promise<MobileSettingsLayers> {
  try {
    const raw = await AsyncStorage.getItem(MOBILE_SETTINGS_LAYERS_KEY);
    return normalizeMobileSettingsLayers(raw ? JSON.parse(raw) : null);
  } catch {
    return emptyMobileSettingsLayers();
  }
}

export async function writeMobileSettingsLayers(layers: MobileSettingsLayers) {
  await AsyncStorage.setItem(
    MOBILE_SETTINGS_LAYERS_KEY,
    JSON.stringify(normalizeMobileSettingsLayers(layers)),
  );
}

export async function updateMobileScopedSettings(
  scope: keyof MobileSettingsLayers,
  id: string,
  update: Partial<MobileSettings>,
) {
  if (!["global", "project", "agent", "session"].includes(scope))
    throw new Error("Unknown mobile settings scope");
  const layers = await readMobileSettingsLayers();
  if (scope === "global") layers.global = { ...layers.global, ...update };
  else {
    const key = id.trim().slice(0, 160);
    if (!key) throw new Error("Settings scope id is required");
    layers[scope][key] = { ...(layers[scope][key] || {}), ...update };
  }
  await writeMobileSettingsLayers(layers);
  return layers;
}

export function resolveMobileSettings(
  base: MobileSettings,
  layers: MobileSettingsLayers,
  context: MobileSettingsContext = {},
) {
  const result = normalizeMobileSettings({ ...base, ...layers.global });
  for (const [scope, id] of [
    ["project", context.projectId],
    ["agent", context.agentId],
    ["session", context.sessionId],
  ] as const) {
    if (id && layers[scope][id])
      Object.assign(result, normalizeMobileSettingsOverride(layers[scope][id]));
  }
  return normalizeMobileSettings(result);
}

export async function readQueuedOperations(): Promise<QueuedOperation[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isQueuedOperation) : [];
  } catch {
    await recoverCorruptValue(QUEUE_KEY, QUEUE_QUARANTINE_KEY);
    return [];
  }
}

export async function enqueueOperation(
  operation: Omit<QueuedOperation, "attempts" | "queuedAt">,
) {
  const queue = await readQueuedOperations();
  if (queue.some((item) => item.idempotencyKey === operation.idempotencyKey))
    return queue;
  const next = [
    ...queue,
    { ...operation, attempts: 0, queuedAt: new Date().toISOString() },
  ];
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(next));
  return next;
}

export async function updateQueuedOperation(
  idempotencyKey: string,
  update: Partial<
    Pick<QueuedOperation, "attempts" | "lastError" | "acknowledgedAt">
  >,
) {
  const next = (await readQueuedOperations()).map((item) =>
    item.idempotencyKey === idempotencyKey ? { ...item, ...update } : item,
  );
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(next));
  return next;
}

export async function removeQueuedOperation(idempotencyKey: string) {
  const next = (await readQueuedOperations()).filter(
    (item) => item.idempotencyKey !== idempotencyKey,
  );
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(next));
  return next;
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

export async function saveBridgeToken(
  endpoint: string,
  token: string,
  expiresAt?: string,
) {
  await SecureStore.setItemAsync(
    tokenKey(endpoint),
    JSON.stringify({ endpoint: new URL(endpoint).origin, token, expiresAt }),
    {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    },
  );
  const origins = await readBridgeTokenOrigins();
  if (!origins.includes(new URL(endpoint).origin)) {
    await AsyncStorage.setItem(
      BRIDGE_TOKEN_INDEX_KEY,
      JSON.stringify([...origins, new URL(endpoint).origin]),
    );
  }
}

async function readBridgeTokenOrigins() {
  try {
    const raw = await AsyncStorage.getItem(BRIDGE_TOKEN_INDEX_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
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
    const saved = JSON.parse(raw) as {
      endpoint?: string;
      token?: string;
      expiresAt?: string;
    };
    if (
      saved.expiresAt &&
      (!Number.isFinite(Date.parse(saved.expiresAt)) ||
        Date.parse(saved.expiresAt) <= Date.now())
    ) {
      await SecureStore.deleteItemAsync(scopedKey);
      return null;
    }
    return saved.endpoint === origin && saved.token ? saved.token : null;
  } catch {
    return null;
  }
}

export async function clearBridgeToken(endpoint: string) {
  await SecureStore.deleteItemAsync(tokenKey(endpoint));
  await SecureStore.deleteItemAsync(BRIDGE_TOKEN_KEY);
  const origin = new URL(endpoint).origin;
  await AsyncStorage.setItem(
    BRIDGE_TOKEN_INDEX_KEY,
    JSON.stringify(
      (await readBridgeTokenOrigins()).filter((item) => item !== origin),
    ),
  );
}

export async function clearAllBridgeTokens() {
  for (const origin of await readBridgeTokenOrigins()) {
    await SecureStore.deleteItemAsync(tokenKey(origin));
  }
  await SecureStore.deleteItemAsync(BRIDGE_TOKEN_KEY);
  await AsyncStorage.removeItem(BRIDGE_TOKEN_INDEX_KEY);
}
