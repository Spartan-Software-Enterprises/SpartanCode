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
  BridgeError,
  bridgeRequest,
  normalizeBridgeEndpoint,
  normalizeBridgeSnapshot,
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
  readCollaborationSessions,
  saveBridgeToken,
  writeSnapshot,
  writeBiometricSetting,
  writeMobileSettings,
  writeCollaborationSessions,
} from "./src/core/storage";
import type { MobileSnapshot } from "./src/core/types";
import type { MobileSettings } from "./src/core/storage";
import { chooseWorkloadRoute, workloadLabel } from "./src/core/runtime";
import { availableAgents } from "./src/core/agents";
import {
  estimateRemoteCost,
  remoteProviders,
  routerGuidance,
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
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Offline-first workspace");
  const [remoteProvider, setRemoteProvider] =
    useState<RemoteProvider["id"]>("digitalocean");
  const [routerMethod, setRouterMethod] =
    useState<keyof typeof routerGuidance>("tailscale");
  const [remotePlanMessage, setRemotePlanMessage] = useState("");
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [mobileSettings, setMobileSettings] = useState<MobileSettings>({
    executionMode: "guided",
    quantization: "Q4_K_M",
    voiceEnabled: false,
    autoSync: true,
    personaName: "Leo",
    wakeWord: "Leo",
  });
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
      readMobileSettings(),
    ])
      .then(
        ([
          savedSnapshot,
          savedBiometric,
          savedCollaboration,
          savedSettings,
        ]) => {
          setSnapshot(savedSnapshot);
          setBiometricEnabled(savedBiometric);
          setCollaborationSessions(savedCollaboration);
          setMobileSettings(savedSettings);
        },
      )
      .finally(() => setLoading(false));
  }, []);

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
      const current = await readSnapshot();
      const remoteIds = new Set(remote.missions.map((item) => item.id));
      const pendingLocal = current.missions.filter(
        (item) => item.status === "planning" && !remoteIds.has(item.id),
      );
      const merged = {
        ...remote,
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
      setMessage("Connected · synced just now");
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
      setMessage(`Event appended at revision ${updated.revision}`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to append event",
      );
    }
  }, [
    collaborationEventPayload,
    collaborationEventType,
    collaborationSessions,
  ]);

  const updateMobileSettings = useCallback(
    async (update: Partial<MobileSettings>) => {
      const next = { ...mobileSettings, ...update };
      setMobileSettings(next);
      await writeMobileSettings(next);
    },
    [mobileSettings],
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
        <ActivityIndicator color="#72e6c5" />
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
              trackColor={{ false: "#263657", true: "#2d806f" }}
              thumbColor="#f2f5ff"
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
              trackColor={{ false: "#263657", true: "#2d806f" }}
              thumbColor="#f2f5ff"
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
            <Text style={styles.message}>Sync automatically on resume</Text>
            <Switch
              accessibilityLabel="Sync automatically on resume"
              value={mobileSettings.autoSync}
              onValueChange={(enabled) =>
                void updateMobileSettings({ autoSync: enabled })
              }
              trackColor={{ false: "#263657", true: "#2d806f" }}
              thumbColor="#f2f5ff"
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
  safe: { flex: 1, backgroundColor: "#080d1c" },
  loading: {
    alignItems: "center",
    backgroundColor: "#080d1c",
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
    color: "#72e6c5",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  title: { color: "#f2f5ff", fontSize: 28, fontWeight: "800", marginTop: 5 },
  status: {
    color: "#72e6c5",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: 8,
  },
  hero: {
    backgroundColor: "#111b32",
    borderColor: "#243252",
    borderRadius: 22,
    borderWidth: 1,
    padding: 22,
  },
  heroKicker: {
    color: "#ffbd74",
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
  heroCopy: { color: "#9eacc8", fontSize: 15, lineHeight: 22, marginTop: 10 },
  section: { color: "#e6ebfa", fontSize: 17, fontWeight: "800", marginTop: 4 },
  sectionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  count: { color: "#72e6c5", fontSize: 14, fontWeight: "800" },
  card: {
    backgroundColor: "#11182b",
    borderColor: "#202d4c",
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  input: {
    backgroundColor: "#0a1123",
    borderColor: "#263657",
    borderRadius: 12,
    borderWidth: 1,
    color: "#f2f5ff",
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primary: {
    alignItems: "center",
    backgroundColor: "#72e6c5",
    borderRadius: 12,
    padding: 14,
  },
  primaryText: { color: "#07151a", fontSize: 14, fontWeight: "800" },
  secondary: {
    alignItems: "center",
    borderColor: "#72e6c5",
    borderRadius: 12,
    borderWidth: 1,
    padding: 13,
  },
  secondaryText: { color: "#72e6c5", fontSize: 14, fontWeight: "800" },
  message: { color: "#8392ae", fontSize: 12 },
  toggleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  empty: {
    borderColor: "#202d4c",
    borderRadius: 18,
    borderStyle: "dashed",
    borderWidth: 1,
    padding: 20,
  },
  emptyTitle: { color: "#e6ebfa", fontSize: 15, fontWeight: "800" },
  emptyCopy: { color: "#8392ae", fontSize: 13, lineHeight: 19, marginTop: 5 },
  mission: {
    alignItems: "flex-start",
    backgroundColor: "#11182b",
    borderColor: "#202d4c",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 15,
  },
  missionDot: {
    backgroundColor: "#72e6c5",
    borderRadius: 8,
    height: 8,
    marginTop: 5,
    width: 8,
  },
  missionBody: { flex: 1 },
  missionText: { color: "#e6ebfa", fontSize: 15, lineHeight: 21 },
  missionMeta: {
    color: "#8392ae",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 7,
  },
  agentRow: {
    alignItems: "center",
    borderBottomColor: "#243252",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
  },
  agentMode: {
    color: "#72e6c5",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  smallAction: {
    borderColor: "#72e6c5",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  selectedAction: { borderColor: "#72e6c5", backgroundColor: "#183b3a" },
  smallActionText: { color: "#72e6c5", fontSize: 11, fontWeight: "800" },
});
