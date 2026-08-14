import { StatusBar } from "expo-status-bar";
import * as Speech from "expo-speech";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  AccessibilityInfo,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  Platform,
  useWindowDimensions,
} from "react-native";
import {
  type ArtifactSyncResult,
  BridgeError,
  bridgeRequest,
  normalizeBridgeEndpoint,
  normalizeBridgeSnapshot,
  syncArtifactSets,
} from "./src/core/bridge";
import { decodePairingPayload } from "./src/core/pairing";
import {
  addConnection,
  clearBridgeToken,
  clearAllBridgeTokens,
  enqueueOperation,
  readQueuedOperations,
  removeQueuedOperation,
  updateQueuedOperation,
  readSnapshot,
  readBiometricSetting,
  readMobileSettings,
  readMobileSettingsLayers,
  readArtifactSyncBase,
  resolveMobileSettings,
  updateMobileScopedSettings,
  readCollaborationSessions,
  readMobileProjects,
  saveBridgeToken,
  writeSnapshot,
  writeBiometricSetting,
  writeMobileSettings,
  writeCollaborationSessions,
  writeMobileProjects,
  writeArtifactSyncBase,
} from "./src/core/storage";
import type { MobileSnapshot } from "./src/core/types";
import type { MobileSettings } from "./src/core/storage";
import { chooseWorkloadRoute, workloadLabel } from "./src/core/runtime";
import { availableAgents, bundledAgents } from "./src/core/agents";
import {
  buildSetupPlan,
  estimateRemoteCost,
  remoteProviders,
  routerGuidance,
  serverTemplates,
} from "./src/core/remote-guidance";
import type { RemoteProvider } from "./src/core/remote-guidance";
import { authorizeSecretAccess } from "./src/core/biometric";
import { listExtensions } from "./src/core/extensions";
import { listCompatibleModels } from "./src/core/model-catalog";
import { createLocalPlanningEvidence } from "./src/core/local-mission";
import {
  accessibilityDiagnostics,
  normalizeAccessibilityProfile,
} from "./src/core/accessibility";
import {
  deviceDiagnostics,
  normalizeDeviceProfile,
  platformDeviceProbe,
} from "./src/core/device-profile";
import {
  appendMobileCollaborationEvent,
  createMobileCollaborationSession,
  mergeCollaborationSessions,
  normalizeCollaborationSessions,
} from "./src/core/collaboration";
import type { MobileCollaborationSession } from "./src/core/collaboration";
import { approvalGestureDecision } from "./src/core/gesture";
import { createMobileRuntimeRegistry } from "./src/core/local-runtime";
import { loadLlamaRnRuntime } from "./src/core/llama-rn-runtime";
import { normalizeSpeechText } from "./src/core/voice";
import { getOfflineCryptoStatus } from "./src/core/secure-offline-store";
import {
  createLocalReleaseEvidence,
  createMobileProject,
  projectTargets,
  releaseTargetLabel,
  setReleaseCheck,
} from "./src/core/project-release";
import type { MobileProject } from "./src/core/project-release";
import {
  gitRoute,
  normalizeGitOutput,
  validateGitCommitMessage,
} from "./src/core/git";

const initialSnapshot: MobileSnapshot = {
  missions: [],
  connections: [],
  pendingApprovals: 0,
  offline: true,
};

const staleAfterMs = 5 * 60 * 1000;

export default function App() {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [endpoint, setEndpoint] = useState("");
  const [token, setToken] = useState("");
  const [pairingPayload, setPairingPayload] = useState("");
  const [mission, setMission] = useState("");
  const [projects, setProjects] = useState<MobileProject[]>([]);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectTarget, setProjectTarget] =
    useState<(typeof projectTargets)[number]>("android");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Offline-first workspace");
  const [remoteProvider, setRemoteProvider] =
    useState<RemoteProvider["id"]>("digitalocean");
  const [routerMethod, setRouterMethod] =
    useState<keyof typeof routerGuidance>("tailscale");
  const [remotePlanMessage, setRemotePlanMessage] = useState("");
  const [serverTemplate, setServerTemplate] = useState<
    (typeof serverTemplates)[number]["id"]
  >(serverTemplates[0].id);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [mobileSettings, setMobileSettings] = useState<MobileSettings>({
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
  });
  const [settingsScope, setSettingsScope] = useState<
    "global" | "project" | "agent" | "session"
  >("project");
  const [settingsScopeId, setSettingsScopeId] = useState("");
  const [settingsScopeMessage, setSettingsScopeMessage] = useState("");
  const [settingsPreviewMessage, setSettingsPreviewMessage] = useState("");
  const [remoteGitStatus, setRemoteGitStatus] = useState("");
  const [remoteGitDiff, setRemoteGitDiff] = useState("");
  const [remoteGitCommitMessage, setRemoteGitCommitMessage] = useState("");
  const [remoteGitMessage, setRemoteGitMessage] = useState("");
  const offlineCryptoStatus = useMemo(() => getOfflineCryptoStatus(), []);
  const [recognizing, setRecognizing] = useState(false);
  const [collaborationName, setCollaborationName] = useState("Android roadmap");
  const [collaborationEventType, setCollaborationEventType] =
    useState("note.added");
  const [collaborationEventPayload, setCollaborationEventPayload] = useState(
    '{"text":"Review ready"}',
  );
  const [collaborationSessions, setCollaborationSessions] = useState<
    MobileCollaborationSession[]
  >([]);
  const [reduceMotion, setReduceMotion] = useState<boolean | undefined>();
  const [screenReaderEnabled, setScreenReaderEnabled] = useState<
    boolean | undefined
  >();
  const { fontScale } = useWindowDimensions();
  const accessibilityProfile = useMemo(
    () =>
      normalizeAccessibilityProfile({
        reduceMotion,
        screenReaderEnabled,
        fontScale,
      }),
    [fontScale, reduceMotion, screenReaderEnabled],
  );
  const accessibilityMessages = useMemo(
    () => accessibilityDiagnostics(accessibilityProfile),
    [accessibilityProfile],
  );
  const deviceProfile = useMemo(
    () =>
      normalizeDeviceProfile(
        platformDeviceProbe(
          (Platform.constants ?? {}) as Record<string, unknown>,
        ),
      ),
    [],
  );
  const deviceMessages = useMemo(
    () => deviceDiagnostics(deviceProfile),
    [deviceProfile],
  );
  const authorizedBridgeRequest = useCallback(
    async <T,>(
      bridgeEndpoint: string,
      path: string,
      init: RequestInit = {},
    ) => {
      const access = await authorizeSecretAccess(biometricEnabled);
      if (!access.allowed) {
        throw new BridgeError(
          access.reason === "unavailable"
            ? "Biometric unlock is unavailable on this device"
            : "Biometric unlock cancelled",
        );
      }
      return bridgeRequest<T>(bridgeEndpoint, path, init);
    },
    [biometricEnabled],
  );
  const compatibleModels = useMemo(
    () => listCompatibleModels(deviceProfile),
    [deviceProfile],
  );
  const nativeRuntimeStatuses = useMemo(
    () =>
      createMobileRuntimeRegistry(
        { "llama.cpp": loadLlamaRnRuntime() },
        deviceProfile,
      ).list(),
    [deviceProfile],
  );

  useSpeechRecognitionEvent("start", () => setRecognizing(true));
  useSpeechRecognitionEvent("end", () => setRecognizing(false));
  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript?.trim();
    if (transcript) setMission((current) => `${current} ${transcript}`.trim());
  });
  useSpeechRecognitionEvent("error", (event) => {
    setRecognizing(false);
    setMessage(`Voice input unavailable: ${event.message || event.error}`);
  });

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    void AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      if (mounted) setScreenReaderEnabled(enabled);
    });
    const motionSubscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    const readerSubscription = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      setScreenReaderEnabled,
    );
    return () => {
      mounted = false;
      motionSubscription.remove();
      readerSubscription.remove();
    };
  }, []);

  useEffect(() => {
    Promise.all([
      readSnapshot(),
      readBiometricSetting(),
      readCollaborationSessions(),
      readMobileProjects(),
      readMobileSettings(),
    ])
      .then(
        ([
          savedSnapshot,
          savedBiometric,
          savedCollaboration,
          savedProjects,
          savedSettings,
        ]) => {
          setSnapshot(savedSnapshot);
          setBiometricEnabled(savedBiometric);
          setCollaborationSessions(savedCollaboration);
          setProjects(savedProjects);
          setMobileSettings(savedSettings);
        },
      )
      .finally(() => setLoading(false));
  }, []);

  const createProject = useCallback(async () => {
    try {
      const project = createMobileProject(
        projectName,
        projectDescription,
        projectTarget,
      );
      const next = [project, ...projects];
      await writeMobileProjects(next);
      setProjects(next);
      setProjectName("");
      setProjectDescription("");
      setMessage(
        `${project.name} created for ${releaseTargetLabel(project.target)} · offline release plan ready`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to create project",
      );
    }
  }, [projectDescription, projectName, projectTarget, projects]);

  const updateProjectCheck = useCallback(
    async (project: MobileProject, check: keyof MobileProject["checks"]) => {
      const next = projects.map((item) =>
        item.id === project.id ? setReleaseCheck(item, check) : item,
      );
      await writeMobileProjects(next);
      setProjects(next);
      const updated = next.find((item) => item.id === project.id);
      if (!updated) return;
      const evidence = createLocalReleaseEvidence(updated, check);
      const nextSnapshot = {
        ...snapshot,
        artifacts: [
          evidence.artifact,
          ...(snapshot.artifacts ?? []).filter(
            (item) => item.id !== evidence.artifact.id,
          ),
        ],
        activity: [evidence.activity, ...(snapshot.activity ?? [])],
        auditLog: [evidence.audit, ...(snapshot.auditLog ?? [])],
      };
      await writeSnapshot(nextSnapshot);
      setSnapshot(nextSnapshot);
      setMessage(
        updated.releaseStatus === "ready"
          ? `${project.name} has a complete release checklist`
          : `${project.name}: ${check} evidence recorded locally`,
      );
    },
    [projects, snapshot],
  );

  const refresh = useCallback(async () => {
    setMessage("Connecting…");
    try {
      const normalizedEndpoint = normalizeBridgeEndpoint(endpoint);
      if (token.trim()) await saveBridgeToken(normalizedEndpoint, token.trim());
      const remote = normalizeBridgeSnapshot(
        await authorizedBridgeRequest<unknown>(
          normalizedEndpoint,
          "/v1/snapshot",
        ),
      );
      const current = await readSnapshot();
      let artifactSync: ArtifactSyncResult = {
        merged: remote.artifacts ?? [],
        conflicts: [],
        requiresReview: false,
      };
      try {
        artifactSync = await syncArtifactSets(
          normalizedEndpoint,
          await readArtifactSyncBase(),
          current.artifacts ?? [],
          remote.artifacts ?? [],
        );
        await writeArtifactSyncBase(remote.artifacts ?? []);
      } catch (error) {
        // Older bridges can still provide snapshots without the sync route.
        // Keep refresh compatible while retaining the remote snapshot as the
        // safe fallback; other failures must remain visible to the user.
        if (!(error instanceof BridgeError && error.status === 404))
          throw error;
      }
      let remoteCollaboration: MobileCollaborationSession[] = [];
      try {
        const response = await authorizedBridgeRequest<unknown>(
          normalizedEndpoint,
          "/v1/collaboration/sessions",
        );
        const payload = response as { sessions?: unknown };
        remoteCollaboration = normalizeCollaborationSessions(payload.sessions);
      } catch (error) {
        if (!(error instanceof BridgeError && error.status === 404))
          throw error;
      }
      const currentCollaboration = await readCollaborationSessions();
      const mergedCollaboration = mergeCollaborationSessions(
        currentCollaboration,
        remoteCollaboration,
      );
      await writeCollaborationSessions(mergedCollaboration);
      setCollaborationSessions(mergedCollaboration);
      const profile = {
        id: `bridge-${new URL(normalizedEndpoint).origin}`,
        name: new URL(normalizedEndpoint).hostname,
        endpoint: normalizedEndpoint,
        transport: "mcp-bridge" as const,
        createdAt: new Date().toISOString(),
      };
      setSnapshot((current) => {
        const remoteIds = new Set(remote.missions.map((item) => item.id));
        const pendingLocal = current.missions.filter(
          (item) => item.status === "planning" && !remoteIds.has(item.id),
        );
        return {
          ...remote,
          connections: [
            ...remote.connections.filter((item) => item.id !== profile.id),
            profile,
          ],
          missions: [...pendingLocal, ...remote.missions],
        };
      });
      const remoteIds = new Set(remote.missions.map((item) => item.id));
      const pendingLocal = current.missions.filter(
        (item) => item.status === "planning" && !remoteIds.has(item.id),
      );
      const merged = {
        ...remote,
        artifacts: artifactSync.merged,
        connections: [
          ...remote.connections.filter((item) => item.id !== profile.id),
          profile,
        ],
        missions: [...pendingLocal, ...remote.missions],
      };
      await writeSnapshot(merged);
      await addConnection(profile);
      for (const operation of await readQueuedOperations()) {
        try {
          await authorizedBridgeRequest(normalizedEndpoint, operation.path, {
            method: operation.method,
            body: JSON.stringify(operation.body),
            headers: { "Idempotency-Key": operation.idempotencyKey },
          });
          await removeQueuedOperation(operation.idempotencyKey);
        } catch (error) {
          await updateQueuedOperation(operation.idempotencyKey, {
            attempts: operation.attempts + 1,
            lastError: error instanceof Error ? error.message : "Sync failed",
          });
        }
      }
      setToken("");
      setMessage(
        artifactSync.requiresReview
          ? `Connected · ${artifactSync.conflicts.length} artifact conflict${artifactSync.conflicts.length === 1 ? "" : "s"} requires review`
          : "Connected · synced just now",
      );
    } catch (error) {
      setSnapshot((current) => ({ ...current, offline: true }));
      setMessage(error instanceof Error ? error.message : "Connection failed");
    }
  }, [authorizedBridgeRequest, endpoint, token]);

  const createCollaboration = useCallback(async () => {
    try {
      const session = createMobileCollaborationSession(collaborationName);
      const next = [session, ...collaborationSessions];
      await writeCollaborationSessions(next);
      setCollaborationSessions(next);
      if (!snapshot.offline && endpoint.trim()) {
        await authorizedBridgeRequest(
          normalizeBridgeEndpoint(endpoint),
          "/v1/collaboration/sessions",
          {
            method: "POST",
            body: JSON.stringify({
              id: session.id,
              name: session.name,
              ownerId: "android-local",
            }),
            headers: { "Idempotency-Key": `collaboration:${session.id}` },
          },
        );
      }
      setMessage("Collaboration session ready · bridge remains optional");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to create session",
      );
    }
  }, [
    authorizedBridgeRequest,
    collaborationName,
    collaborationSessions,
    endpoint,
    snapshot.offline,
  ]);

  const appendCollaboration = useCallback(async () => {
    const session = collaborationSessions[0];
    if (!session) {
      setMessage("Start a collaboration session first");
      return;
    }
    try {
      const payload = JSON.parse(collaborationEventPayload) as Record<
        string,
        unknown
      >;
      const updated = appendMobileCollaborationEvent(session, {
        authorId: "android-local",
        type: collaborationEventType,
        payload,
        expectedRevision: session.revision,
      });
      const next = [updated, ...collaborationSessions.slice(1)];
      await writeCollaborationSessions(next);
      setCollaborationSessions(next);
      const event = updated.events[updated.events.length - 1];
      if (!snapshot.offline && endpoint.trim() && event) {
        const path = `/v1/collaboration/sessions/${encodeURIComponent(session.id)}/events`;
        try {
          await authorizedBridgeRequest(
            normalizeBridgeEndpoint(endpoint),
            path,
            {
              method: "POST",
              body: JSON.stringify({
                event,
                options: { expectedRevision: session.revision },
              }),
              headers: { "Idempotency-Key": `collaboration-event:${event.id}` },
            },
          );
          setMessage(
            `Event appended and synced at revision ${updated.revision}`,
          );
        } catch (error) {
          await enqueueOperation({
            idempotencyKey: `collaboration-event:${event.id}`,
            method: "POST",
            path,
            body: { event, options: { expectedRevision: session.revision } },
          });
          setMessage(
            `Event saved locally; bridge retry queued (${error instanceof Error ? error.message : "sync failed"})`,
          );
        }
      } else {
        setMessage(`Event appended at revision ${updated.revision}`);
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to append event",
      );
    }
  }, [
    authorizedBridgeRequest,
    collaborationEventPayload,
    collaborationEventType,
    collaborationSessions,
    endpoint,
    snapshot.offline,
  ]);

  const updateMobileSettings = useCallback(
    async (update: Partial<MobileSettings>) => {
      const next = { ...mobileSettings, ...update };
      setMobileSettings(next);
      await writeMobileSettings(next);
    },
    [mobileSettings],
  );

  const saveScopedMobileSettings = useCallback(async () => {
    const id = settingsScope === "global" ? "default" : settingsScopeId.trim();
    if (settingsScope !== "global" && !id) {
      setSettingsScopeMessage(`Enter a ${settingsScope} identifier first.`);
      return;
    }
    try {
      await updateMobileScopedSettings(settingsScope, id, mobileSettings);
      setSettingsScopeMessage(`${settingsScope} settings saved for ${id}.`);
    } catch (error) {
      setSettingsScopeMessage(
        error instanceof Error
          ? error.message
          : "Unable to save scoped settings",
      );
    }
  }, [mobileSettings, settingsScope, settingsScopeId]);

  const loadScopedMobileSettings = useCallback(async () => {
    const id = settingsScope === "global" ? "default" : settingsScopeId.trim();
    if (settingsScope !== "global" && !id) {
      setSettingsScopeMessage(`Enter a ${settingsScope} identifier first.`);
      return;
    }
    const layers = await readMobileSettingsLayers();
    const resolved = resolveMobileSettings(mobileSettings, layers, {
      projectId: settingsScope === "project" ? id : undefined,
      agentId: settingsScope === "agent" ? id : undefined,
      sessionId: settingsScope === "session" ? id : undefined,
    });
    setMobileSettings(resolved);
    setSettingsScopeMessage(`${settingsScope} settings loaded for ${id}.`);
  }, [mobileSettings, settingsScope, settingsScopeId]);

  const previewScopedMobileSettings = useCallback(async () => {
    const id = settingsScope === "global" ? "default" : settingsScopeId.trim();
    if (settingsScope !== "global" && !id) {
      setSettingsPreviewMessage(`Enter a ${settingsScope} identifier first.`);
      return;
    }
    const layers = await readMobileSettingsLayers();
    const resolved = resolveMobileSettings(mobileSettings, layers, {
      projectId: settingsScope === "project" ? id : undefined,
      agentId: settingsScope === "agent" ? id : undefined,
      sessionId: settingsScope === "session" ? id : undefined,
    });
    setSettingsPreviewMessage(
      `${settingsScope} effective settings · ${resolved.model} · ${resolved.executionMode} · ${resolved.protocol} · ${resolved.provider}`,
    );
  }, [mobileSettings, settingsScope, settingsScopeId]);

  const runRemoteGit = useCallback(
    async (operation: "status" | "diff" | "stage" | "commit") => {
      if (!endpoint.trim()) {
        setRemoteGitMessage("Enter an authenticated bridge endpoint first.");
        return;
      }
      try {
        const init: RequestInit =
          operation === "stage"
            ? { method: "POST", body: "{}" }
            : operation === "commit"
              ? {
                  method: "POST",
                  body: JSON.stringify({
                    message: validateGitCommitMessage(remoteGitCommitMessage),
                  }),
                }
              : {};
        const response = await authorizedBridgeRequest<Record<string, unknown>>(
          normalizeBridgeEndpoint(endpoint),
          gitRoute(operation),
          init,
        );
        const output = normalizeGitOutput(response);
        if (operation === "status") setRemoteGitStatus(output);
        if (operation === "diff") setRemoteGitDiff(output);
        setRemoteGitMessage(`Remote Git ${operation} completed.`);
      } catch (error) {
        setRemoteGitMessage(
          error instanceof Error ? error.message : "Remote Git request failed",
        );
      }
    },
    [authorizedBridgeRequest, endpoint, remoteGitCommitMessage],
  );

  const createMission = useCallback(async () => {
    const description = mission.trim();
    if (!description) return;
    const next = {
      ...snapshot,
      missions: [
        {
          id: `${Date.now()}`,
          description,
          status: "planning" as const,
          updatedAt: new Date().toISOString(),
        },
        ...snapshot.missions,
      ],
    };
    const queuedMission = next.missions[0]!;
    if (snapshot.offline) {
      const evidence = createLocalPlanningEvidence(
        queuedMission.id,
        description,
      );
      next.artifacts = [
        evidence.artifact,
        ...(next.artifacts ?? []).filter(
          (item) => item.id !== evidence.artifact.id,
        ),
      ];
      next.activity = [evidence.activity, ...(next.activity ?? [])];
      next.auditLog = [evidence.audit, ...(next.auditLog ?? [])];
    }
    try {
      await writeSnapshot(next);
      if (snapshot.offline) {
        await enqueueOperation({
          idempotencyKey: `mission:${queuedMission.id}`,
          method: "POST",
          path: "/v1/missions",
          body: { description },
        });
      } else {
        await authorizedBridgeRequest(
          normalizeBridgeEndpoint(endpoint),
          "/v1/missions",
          {
            method: "POST",
            body: JSON.stringify({ description }),
            headers: { "Idempotency-Key": `mission:${queuedMission.id}` },
          },
        );
      }
      setSnapshot(next);
      setMission("");
      setMessage("Mission queued locally");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save mission; retry",
      );
    }
  }, [authorizedBridgeRequest, endpoint, mission, snapshot]);

  useEffect(() => {
    if (!endpoint.trim()) return;
    const syncWhenActive = (state: string) => {
      if (state === "active") void refresh();
    };
    const subscription = AppState.addEventListener("change", syncWhenActive);
    const interval = mobileSettings.autoSync
      ? setInterval(() => void refresh(), 60_000)
      : undefined;
    return () => {
      subscription.remove();
      if (interval) clearInterval(interval);
    };
  }, [endpoint, mobileSettings.autoSync, refresh]);

  const resolveApproval = useCallback(
    async (id: string, decision: "approved" | "denied") => {
      const next = {
        ...snapshot,
        approvals: (snapshot.approvals ?? []).map((item) =>
          item.id === id
            ? {
                ...item,
                status: decision,
                resolvedAt: new Date().toISOString(),
              }
            : item,
        ),
      };
      await writeSnapshot(next);
      if (snapshot.offline) {
        await enqueueOperation({
          idempotencyKey: `approval:${id}:${decision}`,
          method: "POST",
          path: `/v1/approvals/${encodeURIComponent(id)}/decision`,
          body: { decision },
        });
      } else {
        await authorizedBridgeRequest(
          normalizeBridgeEndpoint(endpoint),
          `/v1/approvals/${encodeURIComponent(id)}/decision`,
          {
            method: "POST",
            body: JSON.stringify({ decision }),
            headers: {
              "Idempotency-Key": `approval:${id}:${decision}`,
            },
          },
        );
      }
      setSnapshot(next);
      setMessage(`Approval ${decision}`);
    },
    [authorizedBridgeRequest, endpoint, snapshot],
  );

  const reviewArtifact = useCallback(
    async (id: string, decision: "accepted" | "rejected") => {
      const next = {
        ...snapshot,
        artifacts: (snapshot.artifacts ?? []).map((item) =>
          item.id === id
            ? {
                ...item,
                review: {
                  decision,
                  note: "Reviewed on Android",
                  reviewedAt: new Date().toISOString(),
                },
              }
            : item,
        ),
      };
      await writeSnapshot(next);
      if (snapshot.offline) {
        await enqueueOperation({
          idempotencyKey: `artifact:${id}:${decision}`,
          method: "POST",
          path: `/v1/artifacts/${encodeURIComponent(id)}/review`,
          body: { decision, note: "Reviewed on Android" },
        });
      } else {
        await authorizedBridgeRequest(
          normalizeBridgeEndpoint(endpoint),
          `/v1/artifacts/${encodeURIComponent(id)}/review`,
          {
            method: "POST",
            body: JSON.stringify({ decision, note: "Reviewed on Android" }),
            headers: {
              "Idempotency-Key": `artifact:${id}:${decision}`,
            },
          },
        );
      }
      setSnapshot(next);
      setMessage(`Artifact ${decision}`);
    },
    [authorizedBridgeRequest, endpoint, snapshot],
  );

  const applyPairing = useCallback(() => {
    try {
      const pairing = decodePairingPayload(pairingPayload.trim());
      setEndpoint(pairing.endpoint);
      setToken(pairing.token);
      setPairingPayload("");
      setMessage(
        `Pairing accepted · ${pairing.scopes.length} scope${pairing.scopes.length === 1 ? "" : "s"}`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Pairing payload is invalid",
      );
    }
  }, [pairingPayload]);

  const stale = snapshot.syncedAt
    ? Date.now() - Date.parse(snapshot.syncedAt) > staleAfterMs
    : snapshot.offline;
  const statusLabel = useMemo(
    () => (snapshot.offline ? "LOCAL" : stale ? "STALE" : "SYNCED"),
    [snapshot.offline, stale],
  );
  const workloadLabelText = workloadLabel(
    chooseWorkloadRoute("planning", !snapshot.offline, deviceProfile),
  );
  const agents = availableAgents(!snapshot.offline);

  if (loading)
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#ff3b4f" />
      </View>
    );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>SPARTANCODE / MOBILE</Text>
            <Text style={styles.title}>Command center</Text>
          </View>
          <Text style={styles.status}>{statusLabel}</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroKicker}>MISSION CONTROL</Text>
          <Text style={styles.heroTitle}>Build from anywhere.</Text>
          <Text style={styles.heroCopy}>
            Queue missions offline, connect to a bridge when ready, and keep
            every approval visible before an agent changes your workspace.
          </Text>
          <Text style={styles.message}>{workloadLabelText}</Text>
        </View>

        <Text style={styles.section}>Create a releaseable project</Text>
        <View style={styles.card}>
          <Text style={styles.message}>
            Build from this phone for any supported device or operating system.
            Desktop, server, and bridge connections are optional.
          </Text>
          <TextInput
            accessibilityLabel="Project name"
            placeholder="Project name"
            placeholderTextColor="#70809b"
            style={styles.input}
            value={projectName}
            onChangeText={setProjectName}
          />
          <TextInput
            accessibilityLabel="Project description"
            placeholder="What should this product do?"
            placeholderTextColor="#70809b"
            style={styles.input}
            value={projectDescription}
            onChangeText={setProjectDescription}
            multiline
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {projectTargets.map((target) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Target ${releaseTargetLabel(target)}`}
                key={target}
                style={
                  projectTarget === target ? styles.primary : styles.secondary
                }
                onPress={() => setProjectTarget(target)}
              >
                <Text
                  style={
                    projectTarget === target
                      ? styles.primaryText
                      : styles.secondaryText
                  }
                >
                  {releaseTargetLabel(target)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create project"
            style={styles.primary}
            onPress={createProject}
          >
            <Text style={styles.primaryText}>Create project offline</Text>
          </Pressable>
          {projects.map((project) => (
            <View key={project.id} style={styles.projectCard}>
              <View style={styles.agentRow}>
                <View style={styles.missionBody}>
                  <Text style={styles.missionText}>{project.name}</Text>
                  <Text style={styles.missionMeta}>
                    {releaseTargetLabel(project.target)} ·{" "}
                    {project.releaseStatus}
                  </Text>
                </View>
                <Text style={styles.agentMode}>
                  {project.releaseStatus === "ready" ? "RELEASE" : "PLAN"}
                </Text>
              </View>
              {(["build", "verify", "package"] as const).map((check) => (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: project.checks[check] }}
                  accessibilityLabel={`${project.name} ${check} release check`}
                  key={check}
                  style={styles.checkRow}
                  onPress={() => updateProjectCheck(project, check)}
                >
                  <Text style={styles.message}>
                    {project.checks[check] ? "✓" : "○"} {check}
                  </Text>
                </Pressable>
              ))}
            </View>
          ))}
        </View>

        <Text style={styles.section}>New mission</Text>
        <View style={styles.card}>
          <TextInput
            accessibilityLabel="Mission description"
            placeholder="What should SpartanCode build?"
            placeholderTextColor="#70809b"
            style={styles.input}
            value={mission}
            onChangeText={setMission}
            multiline
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              recognizing ? "Stop voice dictation" : "Start voice dictation"
            }
            style={styles.secondary}
            onPress={async () => {
              if (recognizing) {
                ExpoSpeechRecognitionModule.stop();
                return;
              }
              const permission =
                await ExpoSpeechRecognitionModule.requestPermissionsAsync();
              if (!permission.granted) {
                setMessage(
                  "Microphone and speech permissions are required for dictation",
                );
                return;
              }
              ExpoSpeechRecognitionModule.start({
                lang: "en-US",
                interimResults: true,
                continuous: false,
              });
            }}
          >
            <Text style={styles.secondaryText}>
              {recognizing ? "Stop dictation" : "Dictate mission"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Queue mission"
            style={styles.primary}
            onPress={createMission}
          >
            <Text style={styles.primaryText}>Queue mission</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Forget bridge token"
            style={styles.secondary}
            onPress={async () => {
              try {
                if (endpoint.trim()) await clearBridgeToken(endpoint.trim());
                setToken("");
                setMessage("Bridge token forgotten");
              } catch (error) {
                setMessage(
                  error instanceof Error
                    ? error.message
                    : "Unable to forget token",
                );
              }
            }}
          >
            <Text style={styles.secondaryText}>Forget token</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Forget all bridge tokens"
            style={styles.secondary}
            onPress={async () => {
              await clearAllBridgeTokens();
              setToken("");
              setMessage("All bridge tokens forgotten");
            }}
          >
            <Text style={styles.secondaryText}>Forget all tokens</Text>
          </Pressable>
        </View>

        <Text style={styles.section}>Available agents</Text>
        <View style={styles.card}>
          {agents.map((agent) => (
            <View key={agent.name} style={styles.agentRow}>
              <View style={styles.missionBody}>
                <Text style={styles.missionText}>{agent.name}</Text>
                <Text style={styles.missionMeta}>{agent.description}</Text>
              </View>
              <Text style={styles.agentMode}>{agent.model.toUpperCase()}</Text>
            </View>
          ))}
          <Text style={styles.message}>
            Android works offline; a bridge only adds optional remote execution.
          </Text>
        </View>

        <Text style={styles.section}>Device readiness</Text>
        <View style={styles.card}>
          <Text style={styles.message}>
            {deviceProfile.chipset ?? "Hardware details unavailable"} ·{" "}
            {deviceProfile.totalMemoryMb
              ? `${Math.round(deviceProfile.totalMemoryMb)} MB RAM reported`
              : "RAM probe unavailable"}
          </Text>
          {deviceMessages.map((diagnostic) => (
            <Text style={styles.message} key={diagnostic}>
              {diagnostic}
            </Text>
          ))}
          {accessibilityMessages.map((diagnostic) => (
            <Text style={styles.message} key={diagnostic}>
              {diagnostic}
            </Text>
          ))}
          {nativeRuntimeStatuses.map((runtime) => (
            <Text style={styles.message} key={runtime.id}>
              {runtime.id}: {runtime.status.toUpperCase()}
              {runtime.reason ? ` · ${runtime.reason}` : ""}
            </Text>
          ))}
        </View>

        <Text style={styles.section}>Licensed local models</Text>
        <View style={styles.card}>
          {compatibleModels.length ? (
            compatibleModels.map((model) => (
              <View key={model.id} style={styles.agentRow}>
                <View style={styles.missionBody}>
                  <Text style={styles.missionText}>{model.id}</Text>
                  <Text style={styles.missionMeta}>
                    {model.provider} · {model.license} · {model.minimumMemoryMb}{" "}
                    MB minimum
                  </Text>
                </View>
                <Text style={styles.agentMode}>LICENSED</Text>
              </View>
            ))
          ) : (
            <Text style={styles.message}>
              No local model meets the reported device requirements. Work stays
              offline and queues until a capable runtime is available.
            </Text>
          )}
          <Text style={styles.message}>
            Downloads require HTTPS, an explicit MIT or Apache-2.0 license, and
            checksum verification when a checksum is supplied.
          </Text>
        </View>

        <Text style={styles.section}>Offline extensions</Text>
        <View style={styles.card}>
          {listExtensions().map((extension) => (
            <View key={extension.id} style={styles.agentRow}>
              <View style={styles.missionBody}>
                <Text style={styles.missionText}>{extension.name}</Text>
                <Text style={styles.missionMeta}>
                  {extension.kind.toUpperCase()} · {extension.description}
                </Text>
              </View>
              <Text style={styles.agentMode}>OFFLINE</Text>
            </View>
          ))}
        </View>

        <Text style={styles.section}>Collaboration</Text>
        <View style={styles.card}>
          <Text style={styles.message}>
            Start a local session offline, then optionally sync its versioned
            journal through an authenticated bridge.
          </Text>
          <TextInput
            accessibilityLabel="Collaboration session name"
            placeholder="Session name"
            placeholderTextColor="#70809b"
            style={styles.input}
            value={collaborationName}
            onChangeText={setCollaborationName}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start collaboration session"
            style={styles.secondary}
            onPress={createCollaboration}
          >
            <Text style={styles.secondaryText}>Start local session</Text>
          </Pressable>
          <TextInput
            accessibilityLabel="Collaboration event type"
            placeholder="Event type"
            placeholderTextColor="#70809b"
            style={styles.input}
            value={collaborationEventType}
            onChangeText={setCollaborationEventType}
          />
          <TextInput
            accessibilityLabel="Collaboration event payload JSON"
            placeholder='{"text":"Review ready"}'
            placeholderTextColor="#70809b"
            style={styles.input}
            value={collaborationEventPayload}
            onChangeText={setCollaborationEventPayload}
            multiline
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Append collaboration event"
            style={styles.secondary}
            onPress={appendCollaboration}
          >
            <Text style={styles.secondaryText}>Append local event</Text>
          </Pressable>
          {collaborationSessions.length === 0 ? (
            <Text style={styles.message}>No collaboration sessions yet.</Text>
          ) : (
            collaborationSessions.map((session) => (
              <View key={session.id} style={styles.agentRow}>
                <View style={styles.missionBody}>
                  <Text style={styles.missionText}>{session.name}</Text>
                  <Text style={styles.missionMeta}>
                    {session.participants.length} participant
                    {session.participants.length === 1 ? "" : "s"} · revision{" "}
                    {session.revision}
                  </Text>
                </View>
                <Text style={styles.agentMode}>LOCAL</Text>
              </View>
            ))
          )}
        </View>

        <Text style={styles.section}>Bridge connection</Text>
        <View style={styles.card}>
          <TextInput
            accessibilityLabel="QR pairing payload"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Paste QR pairing payload"
            placeholderTextColor="#70809b"
            style={styles.input}
            value={pairingPayload}
            onChangeText={setPairingPayload}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Apply QR pairing"
            style={styles.secondary}
            onPress={applyPairing}
          >
            <Text style={styles.secondaryText}>Apply QR pairing</Text>
          </Pressable>
          <TextInput
            accessibilityLabel="MCP Bridge endpoint"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="https://your-server.example"
            placeholderTextColor="#70809b"
            style={styles.input}
            value={endpoint}
            onChangeText={setEndpoint}
          />
          <TextInput
            accessibilityLabel="MCP Bridge token"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Optional bridge token"
            placeholderTextColor="#70809b"
            secureTextEntry
            style={styles.input}
            value={token}
            onChangeText={setToken}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sync bridge"
            style={styles.secondary}
            onPress={refresh}
          >
            <Text style={styles.secondaryText}>Sync bridge</Text>
          </Pressable>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.toggleRow}>
            <Text style={styles.message}>
              Require biometrics before bridge access
            </Text>
            <Switch
              accessibilityLabel="Require biometrics before bridge access"
              value={biometricEnabled}
              onValueChange={async (enabled) => {
                setBiometricEnabled(enabled);
                await writeBiometricSetting(enabled);
                setMessage(
                  enabled
                    ? "Biometric unlock enabled"
                    : "Biometric unlock disabled",
                );
              }}
              trackColor={{ false: "#3a3d42", true: "#8f1e2c" }}
              thumbColor="#f1f1f2"
            />
          </View>
        </View>

        <Text style={styles.section}>App settings</Text>
        <View style={styles.card}>
          <Text style={styles.missionText}>Local storage and security</Text>
          <Text style={styles.message}>
            Missions, settings, and offline project state stay in app-private
            storage. GitHub is optional; bridge tokens use Android Keystore
            storage and can be protected by biometrics above.
          </Text>
          <Text style={styles.missionMeta}>
            Encrypted offline content:{" "}
            {offlineCryptoStatus.enabled
              ? "available"
              : `unavailable (${offlineCryptoStatus.reason})`}
          </Text>
          <View style={styles.toggleRow}>
            <View style={styles.missionBody}>
              <Text style={styles.missionText}>Execution preference</Text>
              <Text style={styles.missionMeta}>
                {mobileSettings.executionMode === "guided"
                  ? "Guided · review risky actions"
                  : "YOLO · trusted workspace automation"}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change execution preference"
              style={styles.smallAction}
              onPress={() =>
                void updateMobileSettings({
                  executionMode:
                    mobileSettings.executionMode === "guided"
                      ? "yolo"
                      : "guided",
                })
              }
            >
              <Text style={styles.smallActionText}>Change</Text>
            </Pressable>
          </View>
          <Text style={styles.message}>
            Approval state, audit activity, and validation remain visible in
            both modes.
          </Text>
          <View style={styles.toggleRow}>
            <View style={styles.missionBody}>
              <Text style={styles.missionText}>Default local model</Text>
              <Text style={styles.missionMeta}>{mobileSettings.model}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change default local model"
              style={styles.smallAction}
              onPress={() => {
                const options = ["Qwen3-1.7B", "Phi-4-mini", "Llama-3.2-3B"];
                const next =
                  options[
                    (options.indexOf(mobileSettings.model) + 1) % options.length
                  ];
                void updateMobileSettings({ model: next });
              }}
            >
              <Text style={styles.smallActionText}>Change</Text>
            </Pressable>
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.missionBody}>
              <Text style={styles.missionText}>Default agent</Text>
              <Text style={styles.missionMeta}>
                {mobileSettings.defaultAgent}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change default agent"
              style={styles.smallAction}
              onPress={() => {
                const index = bundledAgents.findIndex(
                  (agent) => agent.name === mobileSettings.defaultAgent,
                );
                const next =
                  bundledAgents[(index + 1) % bundledAgents.length]?.name ||
                  "leo";
                void updateMobileSettings({ defaultAgent: next });
              }}
            >
              <Text style={styles.smallActionText}>Change</Text>
            </Pressable>
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.missionBody}>
              <Text style={styles.missionText}>Agent protocol</Text>
              <Text style={styles.missionMeta}>{mobileSettings.protocol}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change agent protocol"
              style={styles.smallAction}
              onPress={() => {
                const options: MobileSettings["protocol"][] = [
                  "MCP Lite",
                  "MCP Bridge",
                  "Full MCP",
                ];
                const next =
                  options[
                    (options.indexOf(mobileSettings.protocol) + 1) %
                      options.length
                  ];
                void updateMobileSettings({ protocol: next });
              }}
            >
              <Text style={styles.smallActionText}>Change</Text>
            </Pressable>
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.missionBody}>
              <Text style={styles.missionText}>API provider</Text>
              <Text style={styles.missionMeta}>{mobileSettings.provider}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change API provider"
              style={styles.smallAction}
              onPress={() => {
                const options = ["local", "openai", "anthropic", "gemini"];
                const next =
                  options[
                    (options.indexOf(mobileSettings.provider) + 1) %
                      options.length
                  ];
                void updateMobileSettings({ provider: next });
              }}
            >
              <Text style={styles.smallActionText}>Change</Text>
            </Pressable>
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.missionBody}>
              <Text style={styles.missionText}>Encrypted local memory</Text>
              <Text style={styles.missionMeta}>
                {mobileSettings.memoryEnabled ? "Enabled" : "Disabled"}
              </Text>
            </View>
            <Switch
              accessibilityLabel="Enable encrypted local memory"
              value={mobileSettings.memoryEnabled}
              onValueChange={(enabled) =>
                void updateMobileSettings({ memoryEnabled: enabled })
              }
              trackColor={{ false: "#3a3d42", true: "#8f1e2c" }}
              thumbColor="#f1f1f2"
            />
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.missionBody}>
              <Text style={styles.missionText}>Local model quantization</Text>
              <Text style={styles.missionMeta}>
                {mobileSettings.quantization}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change local model quantization"
              style={styles.smallAction}
              onPress={() => {
                const options: MobileSettings["quantization"][] = [
                  "Q4_K_M",
                  "Q4_0",
                  "Q3_K_S",
                ];
                const next =
                  options[
                    (options.indexOf(mobileSettings.quantization) + 1) %
                      options.length
                  ];
                void updateMobileSettings({ quantization: next });
              }}
            >
              <Text style={styles.smallActionText}>Change</Text>
            </Pressable>
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.message}>Enable voice command input</Text>
            <Switch
              accessibilityLabel="Enable voice command input"
              value={mobileSettings.voiceEnabled}
              onValueChange={(enabled) =>
                void updateMobileSettings({ voiceEnabled: enabled })
              }
              trackColor={{ false: "#3a3d42", true: "#8f1e2c" }}
              thumbColor="#f1f1f2"
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Test voice output"
            style={styles.secondary}
            onPress={() => {
              const name = mobileSettings.personaName.trim() || "Leo";
              try {
                const speechText = normalizeSpeechText(
                  `Hello from ${name}. SpartanCode voice output is ready.`,
                );
                if (!speechText) throw new Error("Speech text is empty");
                Speech.speak(speechText, { language: "en-US", rate: 0.95 });
                setMessage("Voice output started");
              } catch (error) {
                setMessage(
                  `Voice output unavailable: ${error instanceof Error ? error.message : String(error)}`,
                );
              }
            }}
          >
            <Text style={styles.secondaryText}>Test voice output</Text>
          </Pressable>
          <Text style={styles.missionText}>Persona and wake word</Text>
          <TextInput
            accessibilityLabel="Assistant name"
            maxLength={48}
            onChangeText={(value) =>
              setMobileSettings((current) => ({
                ...current,
                personaName: value,
              }))
            }
            onEndEditing={() =>
              void updateMobileSettings({
                personaName: mobileSettings.personaName,
              })
            }
            placeholder="Assistant name"
            placeholderTextColor="#52617f"
            style={styles.input}
            value={mobileSettings.personaName}
          />
          <TextInput
            accessibilityLabel="Wake word"
            maxLength={48}
            onChangeText={(value) =>
              setMobileSettings((current) => ({ ...current, wakeWord: value }))
            }
            onEndEditing={() =>
              void updateMobileSettings({ wakeWord: mobileSettings.wakeWord })
            }
            placeholder="Wake word"
            placeholderTextColor="#52617f"
            style={styles.input}
            value={mobileSettings.wakeWord}
          />
          <Text style={styles.message}>
            Identity preferences are stored locally; speech runtime availability
            is reported separately.
          </Text>
          <View style={styles.toggleRow}>
            <View style={styles.missionBody}>
              <Text style={styles.missionText}>Adaptive interaction</Text>
              <Text style={styles.missionMeta}>
                {mobileSettings.emotionMode === "explicit"
                  ? `Explicit signal · ${mobileSettings.interactionSignal}`
                  : "Off"}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change adaptive interaction mode"
              style={styles.smallAction}
              onPress={() =>
                void updateMobileSettings({
                  emotionMode:
                    mobileSettings.emotionMode === "explicit"
                      ? "off"
                      : "explicit",
                })
              }
            >
              <Text style={styles.smallActionText}>Change</Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change interaction signal"
            style={styles.secondary}
            disabled={mobileSettings.emotionMode === "off"}
            onPress={() => {
              const signals: MobileSettings["interactionSignal"][] = [
                "calm",
                "focused",
                "frustrated",
                "uncertain",
                "excited",
                "tired",
              ];
              const next =
                signals[
                  (signals.indexOf(mobileSettings.interactionSignal) + 1) %
                    signals.length
                ];
              void updateMobileSettings({ interactionSignal: next });
            }}
          >
            <Text style={styles.secondaryText}>Change interaction signal</Text>
          </Pressable>
          <Text style={styles.message}>
            Signals are user-selected. Camera, voice-emotion, and biometric
            inference are not used.
          </Text>
          <Text style={styles.missionText}>Scoped settings</Text>
          <Text style={styles.missionMeta}>
            Save or load the current settings for a project, agent, or session.
          </Text>
          <View style={styles.toggleRow}>
            {(["global", "project", "agent", "session"] as const).map(
              (scope) => (
                <Pressable
                  key={scope}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${scope} settings scope`}
                  style={[
                    styles.scopeChip,
                    settingsScope === scope && styles.scopeChipActive,
                  ]}
                  onPress={() => setSettingsScope(scope)}
                >
                  <Text style={styles.smallActionText}>{scope}</Text>
                </Pressable>
              ),
            )}
          </View>
          {settingsScope !== "global" ? (
            <TextInput
              accessibilityLabel={`${settingsScope} settings identifier`}
              maxLength={160}
              onChangeText={setSettingsScopeId}
              placeholder={`${settingsScope} identifier`}
              placeholderTextColor="#52617f"
              style={styles.input}
              value={settingsScopeId}
            />
          ) : null}
          <View style={styles.toggleRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save scoped settings"
              style={styles.smallAction}
              onPress={() => void saveScopedMobileSettings()}
            >
              <Text style={styles.smallActionText}>Save scope</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Load scoped settings"
              style={styles.smallAction}
              onPress={() => void loadScopedMobileSettings()}
            >
              <Text style={styles.smallActionText}>Load scope</Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Preview effective scoped settings"
            style={styles.secondary}
            onPress={() => void previewScopedMobileSettings()}
          >
            <Text style={styles.secondaryText}>Preview effective settings</Text>
          </Pressable>
          {settingsPreviewMessage ? (
            <Text style={styles.message}>{settingsPreviewMessage}</Text>
          ) : null}
          <Text style={styles.message}>{settingsScopeMessage}</Text>
          <Text style={styles.missionText}>Remote Git (optional bridge)</Text>
          <Text style={styles.message}>
            Android remains fully standalone. These controls use the
            authenticated bridge only when you want to inspect or update the
            connected workspace.
          </Text>
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Refresh remote Git status"
              style={styles.smallAction}
              onPress={() => void runRemoteGit("status")}
            >
              <Text style={styles.smallActionText}>Refresh status</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View remote Git diff"
              style={styles.smallAction}
              onPress={() => void runRemoteGit("diff")}
            >
              <Text style={styles.smallActionText}>View diff</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Stage remote Git changes"
              style={styles.smallAction}
              onPress={() => void runRemoteGit("stage")}
            >
              <Text style={styles.smallActionText}>Stage changes</Text>
            </Pressable>
          </View>
          <TextInput
            accessibilityLabel="Remote Git commit message"
            maxLength={72}
            onChangeText={setRemoteGitCommitMessage}
            placeholder="Remote Git commit message"
            placeholderTextColor="#52617f"
            style={styles.input}
            value={remoteGitCommitMessage}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Commit remote Git changes"
            style={styles.secondary}
            onPress={() => void runRemoteGit("commit")}
          >
            <Text style={styles.secondaryText}>Commit changes</Text>
          </Pressable>
          {remoteGitMessage ? (
            <Text style={styles.message}>{remoteGitMessage}</Text>
          ) : null}
          {remoteGitStatus ? (
            <Text style={styles.missionMeta}>Status: {remoteGitStatus}</Text>
          ) : null}
          {remoteGitDiff ? (
            <Text style={styles.missionMeta}>Diff: {remoteGitDiff}</Text>
          ) : null}
          <View style={styles.toggleRow}>
            <Text style={styles.message}>Sync automatically on resume</Text>
            <Switch
              accessibilityLabel="Sync automatically on resume"
              value={mobileSettings.autoSync}
              onValueChange={(enabled) =>
                void updateMobileSettings({ autoSync: enabled })
              }
              trackColor={{ false: "#3a3d42", true: "#8f1e2c" }}
              thumbColor="#f1f1f2"
            />
          </View>
        </View>

        <Text style={styles.section}>Remote planning</Text>
        <View style={styles.card}>
          <Text style={styles.message}>
            Plan a self-hosted or VPS workspace without provisioning accounts,
            opening ports, or requiring a bridge.
          </Text>
          <View style={styles.actionRow}>
            {remoteProviders.map((provider) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Select ${provider.label}`}
                key={provider.id}
                style={[
                  styles.smallAction,
                  remoteProvider === provider.id && styles.selectedAction,
                ]}
                onPress={() => setRemoteProvider(provider.id)}
              >
                <Text style={styles.smallActionText}>
                  {provider.id.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Estimate remote server cost"
            style={styles.secondary}
            onPress={() => {
              const estimate = estimateRemoteCost(remoteProvider);
              setRemotePlanMessage(
                `${estimate.label}: about $${estimate.estimatedMonthly.toFixed(2)}/month for ${estimate.hours} hours.`,
              );
            }}
          >
            <Text style={styles.secondaryText}>Estimate cost</Text>
          </Pressable>
          <View style={styles.actionRow}>
            {(
              Object.keys(routerGuidance) as Array<keyof typeof routerGuidance>
            ).map((method) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Use ${routerGuidance[method].label} guidance`}
                key={method}
                style={[
                  styles.smallAction,
                  routerMethod === method && styles.selectedAction,
                ]}
                onPress={() => setRouterMethod(method)}
              >
                <Text style={styles.smallActionText}>{method}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.message}>
            {routerGuidance[routerMethod].label} ·{" "}
            {routerGuidance[routerMethod].exposure.toUpperCase()} ·{" "}
            {routerGuidance[routerMethod].steps}
          </Text>
          <View style={styles.actionRow}>
            {serverTemplates.map((template) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Select ${template.label} setup plan`}
                key={template.id}
                style={[
                  styles.smallAction,
                  serverTemplate === template.id && styles.selectedAction,
                ]}
                onPress={() => setServerTemplate(template.id)}
              >
                <Text style={styles.smallActionText}>{template.platform}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Generate home server setup plan"
            style={styles.secondary}
            onPress={() => {
              const plan = buildSetupPlan(serverTemplate, routerMethod);
              setRemotePlanMessage(
                `${plan.label}: ${plan.steps.join(" ")} Verify with ${plan.verification.join(", ")}. Nothing is provisioned automatically.`,
              );
            }}
          >
            <Text style={styles.secondaryText}>Generate setup plan</Text>
          </Pressable>
          {remotePlanMessage ? (
            <Text style={styles.message}>{remotePlanMessage}</Text>
          ) : null}
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.section}>Missions</Text>
          <Text style={styles.count}>{snapshot.missions.length}</Text>
        </View>
        {snapshot.missions.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No missions yet</Text>
            <Text style={styles.emptyCopy}>
              Your offline queue is ready when inspiration strikes.
            </Text>
          </View>
        ) : (
          snapshot.missions.map((item) => (
            <View style={styles.mission} key={item.id}>
              <View style={styles.missionDot} />
              <View style={styles.missionBody}>
                <Text style={styles.missionText}>{item.description}</Text>
                <Text style={styles.missionMeta}>
                  {item.status.replace("_", " ").toUpperCase()}
                </Text>
              </View>
            </View>
          ))
        )}

        <View style={styles.sectionRow}>
          <Text style={styles.section}>Approvals</Text>
          <Text style={styles.count}>
            {
              (snapshot.approvals ?? []).filter(
                (item) => item.status === "pending",
              ).length
            }
          </Text>
        </View>
        {(snapshot.approvals ?? []).length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyCopy}>No approval decisions waiting.</Text>
          </View>
        ) : (
          (snapshot.approvals ?? []).slice(0, 3).map((item) => (
            <View
              style={styles.mission}
              key={item.id}
              {...PanResponder.create({
                onMoveShouldSetPanResponder: (_, gesture) =>
                  item.status === "pending" &&
                  Math.abs(gesture.dx) > 12 &&
                  Math.abs(gesture.dx) > Math.abs(gesture.dy),
                onPanResponderRelease: (_, gesture) => {
                  const decision = approvalGestureDecision(
                    gesture.dx,
                    gesture.dy,
                  );
                  if (decision) void resolveApproval(item.id, decision);
                },
              }).panHandlers}
            >
              <View style={styles.missionBody}>
                <Text style={styles.missionText}>{item.title}</Text>
                <Text style={styles.missionMeta}>
                  {item.status.toUpperCase()} · {item.detail}
                </Text>
                {item.status === "pending" && (
                  <Text style={styles.missionMeta}>
                    Swipe right to approve · swipe left to deny
                  </Text>
                )}
                {item.status === "pending" && (
                  <View style={styles.actionRow}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Approve ${item.title}`}
                      style={styles.smallAction}
                      onPress={() => resolveApproval(item.id, "approved")}
                    >
                      <Text style={styles.smallActionText}>Approve</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Deny ${item.title}`}
                      style={styles.smallAction}
                      onPress={() => resolveApproval(item.id, "denied")}
                    >
                      <Text style={styles.smallActionText}>Deny</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          ))
        )}

        <View style={styles.sectionRow}>
          <Text style={styles.section}>Artifacts</Text>
          <Text style={styles.count}>{(snapshot.artifacts ?? []).length}</Text>
        </View>
        {(snapshot.artifacts ?? []).slice(0, 3).map((item) => (
          <View style={styles.mission} key={item.id}>
            <View style={styles.missionBody}>
              <Text style={styles.missionText}>{item.name}</Text>
              <Text style={styles.missionMeta}>
                {item.type.toUpperCase()} · {item.status.toUpperCase()}
              </Text>
            </View>
            {!item.review && (
              <View style={styles.actionRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Accept ${item.name}`}
                  style={styles.smallAction}
                  onPress={() => reviewArtifact(item.id, "accepted")}
                >
                  <Text style={styles.smallActionText}>Accept</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Reject ${item.name}`}
                  style={styles.smallAction}
                  onPress={() => reviewArtifact(item.id, "rejected")}
                >
                  <Text style={styles.smallActionText}>Reject</Text>
                </Pressable>
              </View>
            )}
          </View>
        ))}

        <View style={styles.sectionRow}>
          <Text style={styles.section}>Audit activity</Text>
          <Text style={styles.count}>{(snapshot.auditLog ?? []).length}</Text>
        </View>
        {(snapshot.auditLog ?? []).slice(0, 5).map((event, index) => (
          <View style={styles.mission} key={`${event.timestamp}-${index}`}>
            <View style={styles.missionBody}>
              <Text style={styles.missionText}>{event.action}</Text>
              <Text style={styles.missionMeta}>
                {new Date(event.timestamp).toLocaleString()}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#090a0c" },
  loading: {
    alignItems: "center",
    backgroundColor: "#090a0c",
    flex: 1,
    justifyContent: "center",
  },
  content: { gap: 18, padding: 22, paddingBottom: 40 },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  eyebrow: {
    color: "#ff3b4f",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  title: { color: "#f1f1f2", fontSize: 28, fontWeight: "800", marginTop: 5 },
  status: {
    color: "#ff3b4f",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: 8,
  },
  hero: {
    backgroundColor: "#1c1d21",
    borderColor: "#3a3d42",
    borderRadius: 22,
    borderWidth: 1,
    padding: 22,
  },
  heroKicker: {
    color: "#c7c9cf",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "800",
    marginTop: 10,
  },
  heroCopy: { color: "#a5a7ab", fontSize: 15, lineHeight: 22, marginTop: 10 },
  section: { color: "#f1f1f2", fontSize: 17, fontWeight: "800", marginTop: 4 },
  sectionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  count: { color: "#ff3b4f", fontSize: 14, fontWeight: "800" },
  card: {
    backgroundColor: "#17181b",
    borderColor: "#3a3d42",
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  projectCard: {
    backgroundColor: "#121316",
    borderColor: "#3a3d42",
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  checkRow: {
    borderBottomColor: "#3a3d42",
    borderBottomWidth: 1,
    paddingVertical: 5,
  },
  input: {
    backgroundColor: "#0e0f12",
    borderColor: "#3a3d42",
    borderRadius: 12,
    borderWidth: 1,
    color: "#f1f1f2",
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primary: {
    alignItems: "center",
    backgroundColor: "#ff3b4f",
    borderRadius: 12,
    padding: 14,
  },
  primaryText: { color: "#16090b", fontSize: 14, fontWeight: "800" },
  secondary: {
    alignItems: "center",
    borderColor: "#ff3b4f",
    borderRadius: 12,
    borderWidth: 1,
    padding: 13,
  },
  secondaryText: { color: "#ff3b4f", fontSize: 14, fontWeight: "800" },
  message: { color: "#a5a7ab", fontSize: 12 },
  toggleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  empty: {
    borderColor: "#3a3d42",
    borderRadius: 18,
    borderStyle: "dashed",
    borderWidth: 1,
    padding: 20,
  },
  emptyTitle: { color: "#f1f1f2", fontSize: 15, fontWeight: "800" },
  emptyCopy: { color: "#a5a7ab", fontSize: 13, lineHeight: 19, marginTop: 5 },
  mission: {
    alignItems: "flex-start",
    backgroundColor: "#17181b",
    borderColor: "#3a3d42",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 15,
  },
  missionDot: {
    backgroundColor: "#ff3b4f",
    borderRadius: 8,
    height: 8,
    marginTop: 5,
    width: 8,
  },
  missionBody: { flex: 1 },
  missionText: { color: "#f1f1f2", fontSize: 15, lineHeight: 21 },
  missionMeta: {
    color: "#a5a7ab",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 7,
  },
  agentRow: {
    alignItems: "center",
    borderBottomColor: "#3a3d42",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
  },
  agentMode: {
    color: "#ff3b4f",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  smallAction: {
    borderColor: "#ff3b4f",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  scopeChip: {
    borderColor: "#3a3d42",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 7,
  },
  scopeChipActive: { backgroundColor: "#43151f", borderColor: "#ff3b4f" },
  selectedAction: { borderColor: "#ff3b4f", backgroundColor: "#43151f" },
  smallActionText: { color: "#ff3b4f", fontSize: 11, fontWeight: "800" },
});
