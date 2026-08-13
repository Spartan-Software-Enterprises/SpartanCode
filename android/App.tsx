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
import { bridgeRequest, normalizeBridgeSnapshot } from "./src/core/bridge";
import { readSnapshot, writeSnapshot } from "./src/core/storage";
import type { MobileSnapshot } from "./src/core/types";

const initialSnapshot: MobileSnapshot = {
  missions: [],
  connections: [],
  pendingApprovals: 0,
  offline: true,
};

export default function App() {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [endpoint, setEndpoint] = useState("");
  const [mission, setMission] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Offline-first workspace");

  useEffect(() => {
    readSnapshot()
      .then(setSnapshot)
      .finally(() => setLoading(false));
  }, []);

  const refresh = useCallback(async () => {
    if (!endpoint.trim()) {
      setMessage("Add an MCP Bridge endpoint to connect");
      return;
    }
    setMessage("Connecting…");
    try {
      const remote = normalizeBridgeSnapshot(
        await bridgeRequest<unknown>(endpoint.trim(), "/v1/snapshot"),
      );
      setSnapshot((current) => {
        const remoteIds = new Set(remote.missions.map((item) => item.id));
        const pendingLocal = current.missions.filter(
          (item) => item.status === "planning" && !remoteIds.has(item.id),
        );
        return {
          ...remote,
          missions: [...pendingLocal, ...remote.missions],
        };
      });
      const current = await readSnapshot();
      const remoteIds = new Set(remote.missions.map((item) => item.id));
      const pendingLocal = current.missions.filter(
        (item) => item.status === "planning" && !remoteIds.has(item.id),
      );
      await writeSnapshot({
        ...remote,
        missions: [...pendingLocal, ...remote.missions],
      });
      setMessage("Connected · synced just now");
    } catch (error) {
      setSnapshot((current) => ({ ...current, offline: true }));
      setMessage(error instanceof Error ? error.message : "Connection failed");
    }
  }, [endpoint]);

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

  const statusLabel = useMemo(
    () => (snapshot.offline ? "LOCAL" : "SYNCED"),
    [snapshot.offline],
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
        </View>

        <Text style={styles.section}>Bridge connection</Text>
        <View style={styles.card}>
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
