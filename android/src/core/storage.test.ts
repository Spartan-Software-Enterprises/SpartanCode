import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  enqueueOperation,
  readCollaborationSessions,
  readSnapshot,
  readBiometricSetting,
  readMobileSettings,
  readMobileSettingsLayers,
  resolveMobileSettings,
  readQueuedOperations,
  removeQueuedOperation,
  updateQueuedOperation,
  writeBiometricSetting,
  writeMobileSettings,
  writeMobileSettingsLayers,
  updateMobileScopedSettings,
  writeCollaborationSessions,
  readArtifactSyncBase,
  writeArtifactSyncBase,
  readCommunityModels,
  writeCommunityModels,
  readMobileFeedback,
  writeMobileFeedback,
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
    expect(
      await AsyncStorage.getItem("spartancode.mobile.snapshot.v1"),
    ).toBeNull();
    expect(
      await AsyncStorage.getItem("spartancode.mobile.snapshot.encrypted.v1"),
    ).not.toContain("Keep me");
  });

  it("persists only valid artifact sync bases and bounds the collection", async () => {
    const valid = {
      id: "a1",
      name: "README",
      type: "document",
      status: "draft",
      createdAt: "2026-08-13T00:00:00.000Z",
    };
    await writeArtifactSyncBase([
      valid,
      { malformed: true } as never,
      ...Array.from({ length: 501 }, (_, index) => ({
        ...valid,
        id: `a-${index}`,
      })),
    ]);
    const restored = await readArtifactSyncBase();
    expect(restored).toHaveLength(500);
    expect(restored[0]).toEqual(valid);
    expect(restored.every((item) => item.id)).toBe(true);
  });

  it("persists bounded Hugging Face community model metadata", async () => {
    await writeCommunityModels([
      {
        id: "community/model",
        provider: "Community",
        license: "other",
        quantizations: ["Q4_0"],
        minimumMemoryMb: 4096,
        requiresAccelerator: false,
        source: "huggingface",
        communityModel: true,
        uncensored: true,
        distilled: true,
      },
      {
        id: "builtin",
        provider: "Built-in",
        license: "MIT",
        quantizations: ["Q4_K_M"],
        minimumMemoryMb: 512,
        requiresAccelerator: false,
        source: "builtin",
      },
    ]);
    expect(await readCommunityModels()).toEqual([
      expect.objectContaining({
        id: "community/model",
        license: "other",
        uncensored: true,
        distilled: true,
      }),
    ]);
  });

  it("persists only validated mobile feedback records", async () => {
    await writeMobileFeedback([
      {
        id: "feedback-1",
        kind: "feature",
        summary: "Add export",
        details: "Export a sanitized report.",
        client: "android",
        sanitized: true,
        createdAt: "2026-08-14T00:00:00.000Z",
      },
      { malformed: true } as never,
    ]);
    expect(await readMobileFeedback()).toHaveLength(1);
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

describe("mobile settings", () => {
  beforeEach(async () => AsyncStorage.clear());

  it("persists safe execution, model, voice, and sync preferences", async () => {
    expect(await readMobileSettings()).toMatchObject({
      model: "Qwen3-1.7B",
      defaultAgent: "leo",
      protocol: "MCP Lite",
      apiProvider: "local",
      memoryEnabled: true,
      executionMode: "guided",
      quantization: "Q4_K_M",
      voiceEnabled: false,
      autoSync: true,
      personaName: "Leo",
      wakeWord: "Leo",
      emotionMode: "explicit",
      interactionSignal: "calm",
    });
    await writeMobileSettings({
      model: "Phi-4-mini",
      defaultAgent: "researcher",
      protocol: "MCP Bridge",
      apiProvider: "openai",
      memoryEnabled: false,
      executionMode: "yolo",
      quantization: "Q4_0",
      voiceEnabled: true,
      autoSync: false,
      personaName: "Commander Leo",
      wakeWord: "Hey Spartan",
      emotionMode: "off",
      interactionSignal: "frustrated",
    });
    expect(await readMobileSettings()).toEqual({
      model: "Phi-4-mini",
      defaultAgent: "researcher",
      protocol: "MCP Bridge",
      apiProvider: "openai",
      memoryEnabled: false,
      executionMode: "yolo",
      quantization: "Q4_0",
      voiceEnabled: true,
      autoSync: false,
      personaName: "Commander Leo",
      wakeWord: "Hey Spartan",
      emotionMode: "off",
      interactionSignal: "frustrated",
    });
  });

  it("resolves persisted global, project, agent, and session overrides", async () => {
    const base = await readMobileSettings();
    await updateMobileScopedSettings("global", "default", {
      interactionSignal: "focused",
    });
    await updateMobileScopedSettings("project", "project-a", {
      emotionMode: "off",
    });
    await updateMobileScopedSettings("agent", "leo", {
      personaName: "Commander Leo",
    });
    await updateMobileScopedSettings("session", "session-1", {
      interactionSignal: "uncertain",
    });
    const layers = await readMobileSettingsLayers();
    expect(
      resolveMobileSettings(base, layers, {
        projectId: "project-a",
        agentId: "leo",
        sessionId: "session-1",
      }),
    ).toMatchObject({
      emotionMode: "off",
      personaName: "Commander Leo",
      interactionSignal: "uncertain",
    });
    await writeMobileSettingsLayers(layers);
  });

  it("migrates the legacy provider field to the parity apiProvider field", async () => {
    await AsyncStorage.setItem(
      "spartancode.mobile.settings.v1",
      JSON.stringify({ provider: "anthropic" }),
    );
    expect((await readMobileSettings()).apiProvider).toBe("anthropic");
    await writeMobileSettings({
      ...(await readMobileSettings()),
      apiProvider: "gemini",
    });
    const saved = await AsyncStorage.getItem("spartancode.mobile.settings.v1");
    expect(JSON.parse(saved || "{}")).not.toHaveProperty("provider");
  });

  it("matches desktop precedence for default and identified scope layers", async () => {
    const base = await readMobileSettings();
    await updateMobileScopedSettings("global", " default ", {
      apiProvider: "global-api",
    });
    await updateMobileScopedSettings("project", "default", {
      executionMode: "yolo",
    });
    await updateMobileScopedSettings("project", "project-a", {
      model: "project-model",
    });
    await updateMobileScopedSettings("agent", "default", {
      voiceEnabled: true,
    });
    await updateMobileScopedSettings("session", "session-1", {
      interactionSignal: "focused",
    });
    const layers = await readMobileSettingsLayers();
    expect(
      resolveMobileSettings(base, layers, {
        projectId: " project-a ",
        agentId: "missing-agent",
        sessionId: "session-1",
      }),
    ).toMatchObject({
      apiProvider: "global-api",
      executionMode: "yolo",
      model: "project-model",
      voiceEnabled: true,
      interactionSignal: "focused",
    });
  });
});
