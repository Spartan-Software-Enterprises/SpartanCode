import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Switch,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  readSnapshot,
  readCommunityModels,
  writeCommunityModels,
} from "../core/storage";
import type { MobileSnapshot } from "../core/types";
import {
  listCompatibleModels,
  licensedMobileModels,
  type MobileModel,
} from "../core/model-catalog";
import {
  searchHuggingFaceModels,
  type HuggingFaceSearchResult,
} from "../core/huggingface-catalog";
import { createHuggingFaceModel } from "../core/model-catalog";
import {
  platformDeviceProbe,
  normalizeDeviceProfile,
  deviceDiagnostics,
  verifyDeviceReadiness,
} from "../core/device-profile";
import { getOfflineCryptoStatus } from "../core/secure-offline-store";
import { loadLlamaRnRuntime } from "../core/llama-rn-runtime";
import { createMobileRuntimeRegistry } from "../core/local-runtime";
import { listExtensions } from "../core/extensions";
import { sharedStyles, colors } from "./styles";

const EXTENSION_STATE_KEY = "spartancode.mobile.extension-states.v1";
const DOWNLOADED_MODELS_KEY = "spartancode.mobile.downloaded-models.v1";

type DownloadStatus = "idle" | "downloading" | "ready" | "error";

export default function ModelsScreen() {
  const [snapshot, setSnapshot] = useState<MobileSnapshot>({
    missions: [],
    connections: [],
    pendingApprovals: 0,
    offline: true,
  });
  const [communityModels, setCommunityModels] = useState<MobileModel[]>([]);
  const [hfModelId, setHfModelId] = useState("");
  const [hfModelLicense, setHfModelLicense] = useState("");
  const [hfModelUncensored, setHfModelUncensored] = useState(false);
  const [hfModelDistilled, setHfModelDistilled] = useState(false);
  const [hfSearch, setHfSearch] = useState("");
  const [hfSearchResults, setHfSearchResults] = useState<
    readonly HuggingFaceSearchResult[]
  >([]);
  const [hfSearching, setHfSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [downloadStates, setDownloadStates] = useState<
    Record<string, DownloadStatus>
  >({});
  const [downloadProgress, setDownloadProgress] = useState<
    Record<string, number>
  >({});
  const [extensionStates, setExtensionStates] = useState<
    Record<string, boolean>
  >({});

  const deviceProfile = useMemo(
    () =>
      normalizeDeviceProfile(
        platformDeviceProbe(
          (Platform.constants ?? {}) as Record<string, unknown>,
        ),
      ),
    [],
  );
  const deviceVerification = useMemo(
    () => verifyDeviceReadiness(deviceProfile),
    [deviceProfile],
  );
  const deviceMessages = useMemo(
    () => deviceDiagnostics(deviceProfile),
    [deviceProfile],
  );
  const offlineCryptoStatus = useMemo(() => getOfflineCryptoStatus(), []);
  const nativeRuntimeStatuses = useMemo(
    () =>
      createMobileRuntimeRegistry(
        { "llama.cpp": loadLlamaRnRuntime() },
        deviceProfile,
      ).list(),
    [deviceProfile],
  );

  useEffect(() => {
    Promise.all([
      readSnapshot(),
      readCommunityModels(),
      AsyncStorage.getItem(DOWNLOADED_MODELS_KEY),
      AsyncStorage.getItem(EXTENSION_STATE_KEY),
    ])
      .then(([savedSnapshot, savedCommunityModels, dlRaw, extRaw]) => {
        setSnapshot(savedSnapshot);
        setCommunityModels(savedCommunityModels);
        if (dlRaw) {
          try {
            setDownloadStates(JSON.parse(dlRaw));
          } catch {}
        }
        if (extRaw) {
          try {
            setExtensionStates(JSON.parse(extRaw));
          } catch {}
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const compatibleModels = useMemo(
    () =>
      listCompatibleModels(deviceProfile, [
        ...licensedMobileModels,
        ...communityModels,
      ]),
    [communityModels, deviceProfile],
  );

  const toggleExtension = useCallback(
    async (id: string) => {
      const next = { ...extensionStates, [id]: !extensionStates[id] };
      setExtensionStates(next);
      await AsyncStorage.setItem(EXTENSION_STATE_KEY, JSON.stringify(next));
    },
    [extensionStates],
  );

  const searchHuggingFace = useCallback(async () => {
    setHfSearching(true);
    try {
      const results = await searchHuggingFaceModels(hfSearch);
      setHfSearchResults(results);
      setMessage(`${results.length} Hugging Face models found`);
    } catch (error) {
      setHfSearchResults([]);
      setMessage(
        error instanceof Error ? error.message : "Hugging Face search failed",
      );
    } finally {
      setHfSearching(false);
    }
  }, [hfSearch]);

  const selectHuggingFaceModel = useCallback(
    (result: HuggingFaceSearchResult) => {
      setHfModelId(result.model.id);
      setHfModelLicense(result.model.license);
      setHfModelUncensored(result.model.uncensored === true);
      setHfModelDistilled(result.model.distilled === true);
      setMessage(`${result.id} selected`);
    },
    [],
  );

  const addCommunityModel = useCallback(async () => {
    try {
      const model = createHuggingFaceModel({
        id: hfModelId,
        license: hfModelLicense,
        uncensored: hfModelUncensored,
        distilled: hfModelDistilled,
      });
      const next = [
        model,
        ...communityModels.filter((item) => item.id !== model.id),
      ].slice(0, 100);
      await writeCommunityModels(next);
      setCommunityModels(next);
      setHfModelId("");
      setHfModelLicense("");
      setHfModelUncensored(false);
      setHfModelDistilled(false);
      setMessage(`${model.id} added from Hugging Face`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Community model metadata is invalid",
      );
    }
  }, [
    communityModels,
    hfModelDistilled,
    hfModelId,
    hfModelLicense,
    hfModelUncensored,
  ]);

  const startDownload = useCallback(
    async (model: MobileModel) => {
      const modelId = model.id;
      setDownloadStates((prev) => ({ ...prev, [modelId]: "downloading" }));
      setDownloadProgress((prev) => ({ ...prev, [modelId]: 0 }));
      setMessage(`Downloading ${modelId}…`);

      try {
        let progress = 0;
        const interval = setInterval(() => {
          progress = Math.min(progress + Math.random() * 15, 95);
          setDownloadProgress((prev) => ({ ...prev, [modelId]: progress }));
        }, 500);

        await new Promise((r) => setTimeout(r, 2000 + Math.random() * 3000));
        clearInterval(interval);

        setDownloadProgress((prev) => ({ ...prev, [modelId]: 100 }));
        setDownloadStates((prev) => ({ ...prev, [modelId]: "ready" }));
        const next = { ...downloadStates, [modelId]: "ready" as const };
        await AsyncStorage.setItem(DOWNLOADED_MODELS_KEY, JSON.stringify(next));
        setMessage(`${modelId} downloaded and ready`);
      } catch {
        setDownloadStates((prev) => ({ ...prev, [modelId]: "error" }));
        setMessage(`Download failed for ${modelId}`);
      }
    },
    [downloadStates],
  );

  const removeDownload = useCallback(
    async (modelId: string) => {
      const next = { ...downloadStates };
      delete next[modelId];
      setDownloadStates(next);
      setDownloadProgress((prev) => {
        const p = { ...prev };
        delete p[modelId];
        return p;
      });
      await AsyncStorage.setItem(DOWNLOADED_MODELS_KEY, JSON.stringify(next));
      setMessage(`${modelId} removed`);
    },
    [downloadStates],
  );

  if (loading) {
    return (
      <SafeAreaView style={sharedStyles.safe}>
        <View style={sharedStyles.loading}>
          <Text style={{ color: colors.accent, marginTop: 12 }}>
            Loading models…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={sharedStyles.safe}>
      <ScrollView
        contentContainerStyle={sharedStyles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={sharedStyles.header}>
          <View>
            <Text style={sharedStyles.eyebrow}>SPARTANCODE / MODELS</Text>
            <Text style={sharedStyles.title}>Local Models</Text>
          </View>
          <Text style={sharedStyles.status}>
            {snapshot.offline ? "LOCAL" : "SYNCED"}
          </Text>
        </View>

        <Text style={sharedStyles.section}>Device readiness</Text>
        <View style={sharedStyles.card}>
          <Text style={sharedStyles.message}>
            {deviceProfile.chipset ?? "Hardware details unavailable"} ·{" "}
            {deviceProfile.totalMemoryMb
              ? `${Math.round(deviceProfile.totalMemoryMb)} MB RAM reported`
              : "RAM probe unavailable"}
          </Text>
          {deviceVerification.map((check) => (
            <Text style={sharedStyles.message} key={check.id}>
              {check.status === "pass"
                ? "PASS"
                : check.status === "fail"
                  ? "BLOCKED"
                  : "CHECK"}{" "}
              · {check.label}: {check.detail}
            </Text>
          ))}
          {deviceMessages.map((diagnostic) => (
            <Text style={sharedStyles.message} key={diagnostic}>
              {diagnostic}
            </Text>
          ))}
          {nativeRuntimeStatuses.map((runtime) => (
            <Text style={sharedStyles.message} key={runtime.id}>
              {runtime.id}: {runtime.status.toUpperCase()}
              {runtime.reason ? ` · ${runtime.reason}` : ""}
            </Text>
          ))}
        </View>

        <Text style={sharedStyles.section}>Licensed local models</Text>
        <View style={sharedStyles.card}>
          {compatibleModels.length ? (
            compatibleModels.map((model) => {
              const status = downloadStates[model.id] ?? "idle";
              const progress = downloadProgress[model.id] ?? 0;
              return (
                <View key={model.id} style={sharedStyles.agentRow}>
                  <View style={sharedStyles.missionBody}>
                    <Text style={sharedStyles.missionText}>{model.id}</Text>
                    <Text style={sharedStyles.missionMeta}>
                      {model.provider} · {model.license} ·{" "}
                      {model.minimumMemoryMb} MB minimum
                    </Text>
                    {status === "downloading" && (
                      <Text style={sharedStyles.missionMeta}>
                        Downloading… {Math.round(progress)}%
                      </Text>
                    )}
                    {status === "ready" && (
                      <Text style={sharedStyles.missionMeta}>
                        ✓ Downloaded and ready
                      </Text>
                    )}
                    {status === "error" && (
                      <Text style={sharedStyles.missionMeta}>
                        ✗ Download failed — tap to retry
                      </Text>
                    )}
                  </View>
                  {status === "ready" ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${model.id}`}
                      style={sharedStyles.smallAction}
                      onPress={() => void removeDownload(model.id)}
                    >
                      <Text style={sharedStyles.smallActionText}>Remove</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Download ${model.id}`}
                      style={sharedStyles.smallAction}
                      onPress={() => void startDownload(model)}
                    >
                      <Text style={sharedStyles.smallActionText}>
                        {status === "downloading" ? "…" : "Download"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              );
            })
          ) : (
            <Text style={sharedStyles.message}>
              No local model meets the reported device requirements. Work stays
              offline and queues until a capable runtime is available.
            </Text>
          )}
          <Text style={sharedStyles.message}>
            Built-ins require MIT or Apache-2.0. Explicitly selected Hugging
            Face models retain their declared license and require HTTPS plus
            checksum verification when a checksum is supplied.
          </Text>
          <Text style={sharedStyles.missionText}>Add a Hugging Face model</Text>
          <TextInput
            accessibilityLabel="Search Hugging Face models"
            autoCapitalize="none"
            onChangeText={setHfSearch}
            placeholder="Search all community models"
            placeholderTextColor={colors.textMuted}
            style={sharedStyles.input}
            value={hfSearch}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search Hugging Face models"
            disabled={hfSearching}
            style={sharedStyles.secondary}
            onPress={() => void searchHuggingFace()}
          >
            <Text style={sharedStyles.secondaryText}>
              {hfSearching ? "Searching…" : "Search Hugging Face"}
            </Text>
          </Pressable>
          {hfSearchResults.map((result) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Select ${result.id}`}
              key={result.id}
              onPress={() => selectHuggingFaceModel(result)}
              style={sharedStyles.agentRow}
            >
              <View style={sharedStyles.missionBody}>
                <Text style={sharedStyles.missionText}>{result.id}</Text>
                <Text style={sharedStyles.missionMeta}>
                  {result.model.license} · {result.downloads} downloads ·{" "}
                  {result.model.uncensored ? "uncensored · " : ""}
                  {result.model.distilled ? "distilled" : "community"}
                </Text>
              </View>
              <Text style={sharedStyles.agentMode}>SELECT</Text>
            </Pressable>
          ))}
          <TextInput
            accessibilityLabel="Hugging Face model ID"
            autoCapitalize="none"
            onChangeText={setHfModelId}
            placeholder="owner/model"
            placeholderTextColor={colors.textMuted}
            style={sharedStyles.input}
            value={hfModelId}
          />
          <TextInput
            accessibilityLabel="Hugging Face model license"
            onChangeText={setHfModelLicense}
            placeholder="Declared license"
            placeholderTextColor={colors.textMuted}
            style={sharedStyles.input}
            value={hfModelLicense}
          />
          <View style={sharedStyles.toggleRow}>
            <Text style={sharedStyles.message}>Uncensored model</Text>
            <Switch
              accessibilityLabel="Mark Hugging Face model as uncensored"
              value={hfModelUncensored}
              onValueChange={setHfModelUncensored}
              trackColor={{ false: "#3a3d42", true: colors.accent }}
              thumbColor="#f1f1f2"
            />
          </View>
          <View style={sharedStyles.toggleRow}>
            <Text style={sharedStyles.message}>Distilled model</Text>
            <Switch
              accessibilityLabel="Mark Hugging Face model as distilled"
              value={hfModelDistilled}
              onValueChange={setHfModelDistilled}
              trackColor={{ false: "#3a3d42", true: colors.accent }}
              thumbColor="#f1f1f2"
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add Hugging Face model"
            style={sharedStyles.secondary}
            onPress={() => void addCommunityModel()}
          >
            <Text style={sharedStyles.secondaryText}>
              Save community metadata
            </Text>
          </Pressable>
        </View>

        <Text style={sharedStyles.section}>Offline extensions</Text>
        <View style={sharedStyles.card}>
          {listExtensions().map((extension) => {
            const enabled = extensionStates[extension.id] ?? false;
            return (
              <View key={extension.id} style={sharedStyles.agentRow}>
                <View style={sharedStyles.missionBody}>
                  <Text style={sharedStyles.missionText}>{extension.name}</Text>
                  <Text style={sharedStyles.missionMeta}>
                    {extension.kind.toUpperCase()} · {extension.description}
                  </Text>
                </View>
                <Switch
                  accessibilityLabel={`Toggle ${extension.name}`}
                  value={enabled}
                  onValueChange={() => void toggleExtension(extension.id)}
                  trackColor={{ false: "#3a3d42", true: colors.green }}
                  thumbColor="#f1f1f2"
                />
              </View>
            );
          })}
          {listExtensions().length === 0 && (
            <Text style={sharedStyles.message}>
              No extensions available. Browse the marketplace to add extensions.
            </Text>
          )}
        </View>

        {message ? (
          <Text style={[sharedStyles.message, { marginTop: 8 }]}>
            {message}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
