import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
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
  saveBridgeToken,
  writeSnapshot,
} from "./src/core/storage";
import type { MobileSnapshot } from "./src/core/types";
import { chooseWorkloadRoute, workloadLabel } from "./src/core/runtime";

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

  useEffect(() => {
    readSnapshot()
      .then(setSnapshot)
      .finally(() => setLoading(false));
  }, []);

  const refresh = useCallback(async () => {
    setMessage("Connecting…");
    try {
      const normalizedEndpoint = normalizeBridgeEndpoint(endpoint);
      if (token.trim()) await saveBridgeToken(normalizedEndpoint, token.trim());
      const remote = normalizeBridgeSnapshot(
        await bridgeRequest<unknown>(normalizedEndpoint, "/v1/snapshot"),
      );
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
          await bridgeRequest(normalizedEndpoint, operation.path, {
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
  }, [endpoint, token]);

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
    try {
      await writeSnapshot(next);
      if (snapshot.offline) {
        const queuedMission = next.missions[0]!;
        await enqueueOperation({
          idempotencyKey: `mission:${queuedMission.id}`,
          method: "POST",
          path: "/v1/missions",
          body: { description },
        });
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
  }, [mission, snapshot]);

  const applyPairing = useCallback(() => {
    try {
      const pairing = decodePairingPayload(pairingPayload.trim());
      setEndpoint(pairing.endpoint);
      setToken(pairing.token);
      setPairingPayload("");
      setMessage(`Pairing accepted · ${pairing.scopes.length} scope${pairing.scopes.length === 1 ? "" : "s"}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Pairing payload is invalid");
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
    chooseWorkloadRoute("planning", !snapshot.offline),
  );

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
                setMessage(error instanceof Error ? error.message : "Unable to forget token");
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
            {(snapshot.approvals ?? []).filter((item) => item.status === "pending")
              .length}
          </Text>
        </View>
        {(snapshot.approvals ?? []).length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyCopy}>No approval decisions waiting.</Text>
          </View>
        ) : (
          (snapshot.approvals ?? []).slice(0, 3).map((item) => (
            <View style={styles.mission} key={item.id}>
              <View style={styles.missionBody}>
                <Text style={styles.missionText}>{item.title}</Text>
                <Text style={styles.missionMeta}>
                  {item.status.toUpperCase()} · {item.detail}
                </Text>
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
});
