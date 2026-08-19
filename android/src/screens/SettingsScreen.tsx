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
} from "react-native";
import * as Speech from "expo-speech";
import {
  readSnapshot,
  writeMobileSettings,
  writeBiometricSetting,
  readMobileSettingsLayers,
  resolveMobileSettings,
  updateMobileScopedSettings,
  writeSnapshot,
  clearBridgeToken,
  clearAllBridgeTokens,
  saveBridgeToken,
  readBiometricSetting,
  readMobileSettings,
} from "../core/storage";
import type { MobileSettings } from "../core/storage";
import { normalizeSpeechText } from "../core/voice";
import { getOfflineCryptoStatus } from "../core/secure-offline-store";
import { normalizeBridgeEndpoint } from "../core/bridge";
import { sharedStyles, colors, typography } from "./styles";
import {
  readGitHubToken,
  writeGitHubToken,
  clearGitHubToken,
  readGitHubUser,
  clearGitHubUser,
  fetchGitHubUser,
  fetchRepos,
  fetchIssues,
  fetchPullRequests,
  type GitHubUser,
  type GitHubRepo,
  type GitHubIssue,
  type GitHubPR,
} from "../core/github";
import {
  checkAndPromptUpdate,
  checkForUpdate,
  getCurrentVersion,
  type UpdateStatus,
} from "../core/updates";

type SettingsCategory = "security" | "runtime" | "voice" | "scope" | "bridge";

const defaultSettings: MobileSettings = {
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
};

export default function SettingsScreen() {
  const [mobileSettings, setMobileSettings] =
    useState<MobileSettings>(defaultSettings);
  const [settingsCategory, setSettingsCategory] =
    useState<SettingsCategory>("security");
  const [settingsScope, setSettingsScope] = useState<
    "global" | "project" | "agent" | "session"
  >("global");
  const [settingsScopeId, setSettingsScopeId] = useState("");
  const [settingsScopeMessage, setSettingsScopeMessage] = useState("");
  const [settingsPreviewMessage, setSettingsPreviewMessage] = useState("");
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [endpoint, setEndpoint] = useState("");
  const [token, setToken] = useState("");
  const [remoteGitStatus, setRemoteGitStatus] = useState("");
  const [remoteGitDiff, setRemoteGitDiff] = useState("");
  const [remoteGitCommitMessage, setRemoteGitCommitMessage] = useState("");
  const [remoteGitMessage, setRemoteGitMessage] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);
  const [githubIssues, setGithubIssues] = useState<GitHubIssue[]>([]);
  const [githubPRs, setGithubPRs] = useState<GitHubPR[]>([]);
  const [githubRepoOwner, setGithubRepoOwner] = useState("");
  const [githubRepoName, setGithubRepoName] = useState("");
  const [githubSection, setGithubSection] = useState<
    "repos" | "issues" | "prs"
  >("repos");
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubMessage, setGithubMessage] = useState("");
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const offlineCryptoStatus = useMemo(() => getOfflineCryptoStatus(), []);

  useEffect(() => {
    Promise.all([
      readSnapshot(),
      readBiometricSetting(),
      readMobileSettings(),
      readGitHubToken(),
    ])
      .then(([, savedBiometric, savedSettings, savedToken]) => {
        setBiometricEnabled(savedBiometric);
        setMobileSettings(savedSettings);
        if (savedToken) {
          setGithubToken(savedToken);
          fetchGitHubUser(savedToken)
            .then(setGithubUser)
            .catch(() => {});
        }
      })
      .finally(() => setLoading(false));
  }, []);

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
      `${settingsScope} effective settings · ${resolved.model} · ${resolved.executionMode} · ${resolved.protocol} · ${resolved.apiProvider}`,
    );
  }, [mobileSettings, settingsScope, settingsScopeId]);

  const categories: [SettingsCategory, string][] = [
    ["security", "Security"],
    ["runtime", "Runtime"],
    ["voice", "Voice & identity"],
    ["scope", "Scoped settings"],
    ["bridge", "Bridge & Git"],
  ];

  if (loading) {
    return (
      <SafeAreaView style={sharedStyles.safe}>
        <View style={styles.loadingCenter}>
          <Text style={{ color: colors.accent }}>Loading settings…</Text>
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
            <Text style={sharedStyles.eyebrow}>SPARTANCODE / SETTINGS</Text>
            <Text style={sharedStyles.title}>Settings</Text>
          </View>
        </View>

        <Text style={sharedStyles.section}>Settings menu</Text>
        <View style={sharedStyles.card}>
          <Text style={sharedStyles.message}>
            Choose a category to keep settings focused and easy to navigate.
          </Text>
          <View style={sharedStyles.settingsMenu}>
            {categories.map(([category, label]) => (
              <Pressable
                key={category}
                accessibilityRole="button"
                accessibilityLabel={`Open ${label} settings`}
                style={[
                  sharedStyles.settingsMenuItem,
                  settingsCategory === category &&
                    sharedStyles.settingsMenuItemActive,
                ]}
                onPress={() => setSettingsCategory(category)}
              >
                <Text style={sharedStyles.settingsMenuLabel}>{label}</Text>
                <Text style={sharedStyles.settingsMenuChevron}>›</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={sharedStyles.card}>
          {settingsCategory === "security" && (
            <>
              <Text style={styles.cardTitle}>Local storage and security</Text>
              <Text style={sharedStyles.message}>
                Missions, settings, and offline project state stay in
                app-private storage. GitHub is optional; bridge tokens use
                Android Keystore storage and can be protected by biometrics.
              </Text>
              <Text style={styles.metaText}>
                Encrypted offline content:{" "}
                {offlineCryptoStatus.enabled
                  ? "available"
                  : `unavailable (${offlineCryptoStatus.reason})`}
              </Text>
              <View style={[sharedStyles.toggleRow, { marginTop: 16 }]}>
                <View style={sharedStyles.missionBody}>
                  <Text style={sharedStyles.missionText}>App updates</Text>
                  <Text style={sharedStyles.missionMeta}>
                    v{getCurrentVersion()}
                    {updateStatus?.updateAvailable
                      ? ` → v${updateStatus.latestVersion}`
                      : updateStatus
                        ? " (up to date)"
                        : ""}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Check for updates"
                  style={sharedStyles.smallAction}
                  disabled={updateLoading}
                  onPress={async () => {
                    setUpdateLoading(true);
                    try {
                      const status = await checkForUpdate();
                      setUpdateStatus(status);
                      if (!status.updateAvailable) {
                        setUpdateMessage("You are on the latest version.");
                      }
                    } catch {
                      setUpdateMessage("Update check failed.");
                    } finally {
                      setUpdateLoading(false);
                    }
                  }}
                >
                  <Text style={sharedStyles.smallActionText}>
                    {updateLoading ? "Checking…" : "Check"}
                  </Text>
                </Pressable>
              </View>
              {updateStatus?.updateAvailable && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Install update to v${updateStatus.latestVersion}`}
                  style={sharedStyles.primary}
                  onPress={() => {
                    void checkAndPromptUpdate(true);
                  }}
                >
                  <Text style={sharedStyles.primaryText}>
                    Update to v{updateStatus.latestVersion}
                  </Text>
                </Pressable>
              )}
              {updateMessage ? (
                <Text style={sharedStyles.message}>{updateMessage}</Text>
              ) : null}
            </>
          )}
          {settingsCategory === "runtime" && (
            <>
              <View style={sharedStyles.toggleRow}>
                <View style={sharedStyles.missionBody}>
                  <Text style={sharedStyles.missionText}>
                    Execution preference
                  </Text>
                  <Text style={sharedStyles.missionMeta}>
                    {mobileSettings.executionMode === "guided"
                      ? "Guided · review risky actions"
                      : "YOLO · trusted workspace automation"}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Change execution preference"
                  style={sharedStyles.smallAction}
                  onPress={() =>
                    void updateMobileSettings({
                      executionMode:
                        mobileSettings.executionMode === "guided"
                          ? "yolo"
                          : "guided",
                    })
                  }
                >
                  <Text style={sharedStyles.smallActionText}>Change</Text>
                </Pressable>
              </View>
              <View style={sharedStyles.toggleRow}>
                <View style={sharedStyles.missionBody}>
                  <Text style={sharedStyles.missionText}>
                    Default local model
                  </Text>
                  <Text style={sharedStyles.missionMeta}>
                    {mobileSettings.model}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Change default local model"
                  style={sharedStyles.smallAction}
                  onPress={() => {
                    const options = [
                      "Qwen3-1.7B",
                      "Phi-4-mini",
                      "Llama-3.2-3B",
                    ];
                    const next =
                      options[
                        (options.indexOf(mobileSettings.model) + 1) %
                          options.length
                      ];
                    void updateMobileSettings({ model: next });
                  }}
                >
                  <Text style={sharedStyles.smallActionText}>Change</Text>
                </Pressable>
              </View>
              <View style={sharedStyles.toggleRow}>
                <View style={sharedStyles.missionBody}>
                  <Text style={sharedStyles.missionText}>Default agent</Text>
                  <Text style={sharedStyles.missionMeta}>
                    {mobileSettings.defaultAgent}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Change default agent"
                  style={sharedStyles.smallAction}
                  onPress={() => {
                    const options = ["leo", "plan", "build", "verify"];
                    const next =
                      options[
                        (options.indexOf(mobileSettings.defaultAgent) + 1) %
                          options.length
                      ];
                    void updateMobileSettings({ defaultAgent: next ?? "leo" });
                  }}
                >
                  <Text style={sharedStyles.smallActionText}>Change</Text>
                </Pressable>
              </View>
              <View style={sharedStyles.toggleRow}>
                <View style={sharedStyles.missionBody}>
                  <Text style={sharedStyles.missionText}>Agent protocol</Text>
                  <Text style={sharedStyles.missionMeta}>
                    {mobileSettings.protocol}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Change agent protocol"
                  style={sharedStyles.smallAction}
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
                  <Text style={sharedStyles.smallActionText}>Change</Text>
                </Pressable>
              </View>
              <View style={sharedStyles.toggleRow}>
                <View style={sharedStyles.missionBody}>
                  <Text style={sharedStyles.missionText}>API provider</Text>
                  <Text style={sharedStyles.missionMeta}>
                    {mobileSettings.apiProvider}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Change API provider"
                  style={sharedStyles.smallAction}
                  onPress={() => {
                    const options = ["local", "openai", "anthropic", "gemini"];
                    const next =
                      options[
                        (options.indexOf(mobileSettings.apiProvider) + 1) %
                          options.length
                      ];
                    void updateMobileSettings({ apiProvider: next });
                  }}
                >
                  <Text style={sharedStyles.smallActionText}>Change</Text>
                </Pressable>
              </View>
              <View style={sharedStyles.toggleRow}>
                <View style={sharedStyles.missionBody}>
                  <Text style={sharedStyles.missionText}>
                    Encrypted local memory
                  </Text>
                  <Text style={sharedStyles.missionMeta}>
                    {mobileSettings.memoryEnabled ? "Enabled" : "Disabled"}
                  </Text>
                </View>
                <Switch
                  accessibilityLabel="Enable encrypted local memory"
                  value={mobileSettings.memoryEnabled}
                  onValueChange={(enabled) =>
                    void updateMobileSettings({ memoryEnabled: enabled })
                  }
                  trackColor={{ false: "#3a3d42", true: colors.accent }}
                  thumbColor="#f1f1f2"
                />
              </View>
              <View style={sharedStyles.toggleRow}>
                <View style={sharedStyles.missionBody}>
                  <Text style={sharedStyles.missionText}>
                    Local model quantization
                  </Text>
                  <Text style={sharedStyles.missionMeta}>
                    {mobileSettings.quantization}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Change local model quantization"
                  style={sharedStyles.smallAction}
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
                  <Text style={sharedStyles.smallActionText}>Change</Text>
                </Pressable>
              </View>
            </>
          )}
          {settingsCategory === "voice" && (
            <>
              <View style={sharedStyles.toggleRow}>
                <Text style={sharedStyles.message}>
                  Enable voice command input
                </Text>
                <Switch
                  accessibilityLabel="Enable voice command input"
                  value={mobileSettings.voiceEnabled}
                  onValueChange={(enabled) =>
                    void updateMobileSettings({ voiceEnabled: enabled })
                  }
                  trackColor={{ false: "#3a3d42", true: colors.accent }}
                  thumbColor="#f1f1f2"
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Test voice output"
                style={sharedStyles.secondary}
                onPress={() => {
                  try {
                    const speechText = normalizeSpeechText(
                      `Hello from ${mobileSettings.personaName || "Leo"}. SpartanCode voice output is ready.`,
                    );
                    if (!speechText) throw new Error("Speech text is empty");
                    Speech.speak(speechText, { language: "en-US", rate: 0.95 });
                  } catch {}
                }}
              >
                <Text style={sharedStyles.secondaryText}>
                  Test voice output
                </Text>
              </Pressable>
              <Text style={styles.cardTitle}>Persona and wake word</Text>
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
                placeholderTextColor={colors.textMuted}
                style={sharedStyles.input}
                value={mobileSettings.personaName}
              />
              <TextInput
                accessibilityLabel="Wake word"
                maxLength={48}
                onChangeText={(value) =>
                  setMobileSettings((current) => ({
                    ...current,
                    wakeWord: value,
                  }))
                }
                onEndEditing={() =>
                  void updateMobileSettings({
                    wakeWord: mobileSettings.wakeWord,
                  })
                }
                placeholder="Wake word"
                placeholderTextColor={colors.textMuted}
                style={sharedStyles.input}
                value={mobileSettings.wakeWord}
              />
              <View style={sharedStyles.toggleRow}>
                <View style={sharedStyles.missionBody}>
                  <Text style={sharedStyles.missionText}>
                    Adaptive interaction
                  </Text>
                  <Text style={sharedStyles.missionMeta}>
                    {mobileSettings.emotionMode === "explicit"
                      ? `Explicit signal · ${mobileSettings.interactionSignal}`
                      : "Off"}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Change adaptive interaction mode"
                  style={sharedStyles.smallAction}
                  onPress={() =>
                    void updateMobileSettings({
                      emotionMode:
                        mobileSettings.emotionMode === "explicit"
                          ? "off"
                          : "explicit",
                    })
                  }
                >
                  <Text style={sharedStyles.smallActionText}>Change</Text>
                </Pressable>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change interaction signal"
                style={sharedStyles.secondary}
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
                <Text style={sharedStyles.secondaryText}>
                  Change interaction signal
                </Text>
              </Pressable>
            </>
          )}
          {settingsCategory === "scope" && (
            <>
              <Text style={styles.cardTitle}>Scoped settings</Text>
              <Text style={sharedStyles.message}>
                Save or load the current settings for a project, agent, or
                session.
              </Text>
              <View style={sharedStyles.toggleRow}>
                {(["global", "project", "agent", "session"] as const).map(
                  (scope) => (
                    <Pressable
                      key={scope}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${scope} settings scope`}
                      style={[
                        sharedStyles.scopeChip,
                        settingsScope === scope && sharedStyles.scopeChipActive,
                      ]}
                      onPress={() => setSettingsScope(scope)}
                    >
                      <Text style={sharedStyles.smallActionText}>{scope}</Text>
                    </Pressable>
                  ),
                )}
              </View>
              {settingsScope !== "global" && (
                <TextInput
                  accessibilityLabel={`${settingsScope} settings identifier`}
                  maxLength={160}
                  onChangeText={setSettingsScopeId}
                  placeholder={`${settingsScope} identifier`}
                  placeholderTextColor={colors.textMuted}
                  style={sharedStyles.input}
                  value={settingsScopeId}
                />
              )}
              <View style={sharedStyles.toggleRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Save scoped settings"
                  style={sharedStyles.smallAction}
                  onPress={() => void saveScopedMobileSettings()}
                >
                  <Text style={sharedStyles.smallActionText}>Save scope</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Load scoped settings"
                  style={sharedStyles.smallAction}
                  onPress={() => void loadScopedMobileSettings()}
                >
                  <Text style={sharedStyles.smallActionText}>Load scope</Text>
                </Pressable>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Preview effective scoped settings"
                style={sharedStyles.secondary}
                onPress={() => void previewScopedMobileSettings()}
              >
                <Text style={sharedStyles.secondaryText}>
                  Preview effective settings
                </Text>
              </Pressable>
              {settingsPreviewMessage && (
                <Text style={sharedStyles.message}>
                  {settingsPreviewMessage}
                </Text>
              )}
              <Text style={sharedStyles.message}>{settingsScopeMessage}</Text>
            </>
          )}
          {settingsCategory === "bridge" && (
            <>
              <Text style={styles.cardTitle}>GitHub integration</Text>
              <Text style={sharedStyles.message}>
                Connect your GitHub account to browse repositories, view issues
                and pull requests, and create new issues directly from Android.
              </Text>
              {!githubUser ? (
                <>
                  <TextInput
                    accessibilityLabel="GitHub personal access token"
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="ghp_xxxxxxxxxxxx"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry
                    style={sharedStyles.input}
                    value={githubToken}
                    onChangeText={setGithubToken}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Connect GitHub account"
                    style={sharedStyles.primary}
                    onPress={async () => {
                      if (!githubToken.trim()) {
                        setGithubMessage("Enter a GitHub token first.");
                        return;
                      }
                      setGithubLoading(true);
                      try {
                        const user = await fetchGitHubUser(githubToken.trim());
                        setGithubUser(user);
                        await writeGitHubToken(githubToken.trim());
                        setGithubMessage(`Connected as ${user.login}`);
                      } catch (err) {
                        setGithubMessage(
                          err instanceof Error
                            ? err.message
                            : "GitHub connection failed",
                        );
                      } finally {
                        setGithubLoading(false);
                      }
                    }}
                  >
                    <Text style={sharedStyles.primaryText}>
                      {githubLoading ? "Connecting…" : "Connect GitHub"}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={sharedStyles.agentRow}>
                    <View style={sharedStyles.missionBody}>
                      <Text style={sharedStyles.missionText}>
                        @{githubUser.login}
                      </Text>
                      <Text style={sharedStyles.missionMeta}>
                        {githubUser.public_repos} repos · {githubUser.followers}{" "}
                        followers
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Disconnect GitHub"
                      style={sharedStyles.smallAction}
                      onPress={async () => {
                        await clearGitHubToken();
                        await clearGitHubUser();
                        setGithubUser(null);
                        setGithubToken("");
                        setGithubRepos([]);
                        setGithubIssues([]);
                        setGithubPRs([]);
                        setGithubMessage("GitHub disconnected.");
                      }}
                    >
                      <Text style={sharedStyles.smallActionText}>
                        Disconnect
                      </Text>
                    </Pressable>
                  </View>
                  <View style={sharedStyles.toggleRow}>
                    {(["repos", "issues", "prs"] as const).map((section) => (
                      <Pressable
                        key={section}
                        accessibilityRole="button"
                        accessibilityLabel={`Show GitHub ${section}`}
                        style={[
                          sharedStyles.scopeChip,
                          githubSection === section &&
                            sharedStyles.scopeChipActive,
                        ]}
                        onPress={async () => {
                          setGithubSection(section);
                          if (section === "repos") {
                            setGithubLoading(true);
                            try {
                              const repos = await fetchRepos(githubToken);
                              setGithubRepos(repos);
                            } catch {}
                            setGithubLoading(false);
                          }
                        }}
                      >
                        <Text style={sharedStyles.smallActionText}>
                          {section === "prs" ? "PRs" : section}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  {githubSection === "repos" && (
                    <>
                      {githubLoading && (
                        <Text style={sharedStyles.message}>Loading…</Text>
                      )}
                      {githubRepos.map((repo) => (
                        <View key={repo.id} style={sharedStyles.mission}>
                          <View style={sharedStyles.missionBody}>
                            <Text style={sharedStyles.missionText}>
                              {repo.full_name}
                            </Text>
                            <Text style={sharedStyles.missionMeta}>
                              {repo.language ?? "—"} · ★ {repo.stargazers_count}{" "}
                              · {repo.private ? "Private" : "Public"}
                            </Text>
                            {repo.description && (
                              <Text style={sharedStyles.missionMeta}>
                                {repo.description.slice(0, 120)}
                              </Text>
                            )}
                          </View>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`View ${repo.full_name} issues`}
                            style={sharedStyles.smallAction}
                            onPress={() => {
                              setGithubRepoOwner(
                                repo.full_name.split("/")[0] ?? "",
                              );
                              setGithubRepoName(
                                repo.full_name.split("/")[1] ?? "",
                              );
                              setGithubSection("issues");
                              setGithubLoading(true);
                              fetchIssues(
                                githubToken,
                                repo.full_name.split("/")[0] ?? "",
                                repo.full_name.split("/")[1] ?? "",
                              )
                                .then(setGithubIssues)
                                .catch(() => {})
                                .finally(() => setGithubLoading(false));
                            }}
                          >
                            <Text style={sharedStyles.smallActionText}>
                              Issues
                            </Text>
                          </Pressable>
                        </View>
                      ))}
                      {githubRepos.length === 0 && !githubLoading && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Load repositories"
                          style={sharedStyles.secondary}
                          onPress={async () => {
                            setGithubLoading(true);
                            try {
                              const repos = await fetchRepos(githubToken);
                              setGithubRepos(repos);
                            } catch (err) {
                              setGithubMessage(
                                err instanceof Error
                                  ? err.message
                                  : "Failed to load repos",
                              );
                            }
                            setGithubLoading(false);
                          }}
                        >
                          <Text style={sharedStyles.secondaryText}>
                            Load repositories
                          </Text>
                        </Pressable>
                      )}
                    </>
                  )}
                  {(githubSection === "issues" || githubSection === "prs") && (
                    <>
                      {githubRepoOwner && githubRepoName && (
                        <Text style={sharedStyles.missionMeta}>
                          {githubRepoOwner}/{githubRepoName}
                        </Text>
                      )}
                      {githubLoading && (
                        <Text style={sharedStyles.message}>Loading…</Text>
                      )}
                      {githubSection === "issues" &&
                        githubIssues.map((issue) => (
                          <View key={issue.id} style={sharedStyles.mission}>
                            <View style={sharedStyles.missionBody}>
                              <Text style={sharedStyles.missionText}>
                                #{issue.number} {issue.title}
                              </Text>
                              <Text style={sharedStyles.missionMeta}>
                                {issue.state.toUpperCase()} ·{" "}
                                {issue.labels.map((l) => l.name).join(", ") ||
                                  "no labels"}
                              </Text>
                            </View>
                          </View>
                        ))}
                      {githubSection === "prs" &&
                        githubPRs.map((pr) => (
                          <View key={pr.id} style={sharedStyles.mission}>
                            <View style={sharedStyles.missionBody}>
                              <Text style={sharedStyles.missionText}>
                                #{pr.number} {pr.title}
                              </Text>
                              <Text style={sharedStyles.missionMeta}>
                                {pr.state.toUpperCase()} · {pr.head.ref} →{" "}
                                {pr.base.ref}
                              </Text>
                            </View>
                          </View>
                        ))}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Refresh"
                        style={sharedStyles.secondary}
                        onPress={async () => {
                          if (!githubRepoOwner || !githubRepoName) return;
                          setGithubLoading(true);
                          try {
                            const [issues, prs] = await Promise.all([
                              fetchIssues(
                                githubToken,
                                githubRepoOwner,
                                githubRepoName,
                              ),
                              fetchPullRequests(
                                githubToken,
                                githubRepoOwner,
                                githubRepoName,
                              ),
                            ]);
                            setGithubIssues(issues);
                            setGithubPRs(prs);
                          } catch (err) {
                            setGithubMessage(
                              err instanceof Error
                                ? err.message
                                : "Failed to refresh",
                            );
                          }
                          setGithubLoading(false);
                        }}
                      >
                        <Text style={sharedStyles.secondaryText}>Refresh</Text>
                      </Pressable>
                    </>
                  )}
                </>
              )}
              {githubMessage ? (
                <Text style={sharedStyles.message}>{githubMessage}</Text>
              ) : null}
              <View style={[sharedStyles.toggleRow, { marginTop: 12 }]}>
                <Text style={sharedStyles.message}>
                  Require biometrics before bridge access
                </Text>
                <Switch
                  accessibilityLabel="Require biometrics before bridge access"
                  value={biometricEnabled}
                  onValueChange={async (enabled) => {
                    setBiometricEnabled(enabled);
                    await writeBiometricSetting(enabled);
                  }}
                  trackColor={{ false: "#3a3d42", true: colors.accent }}
                  thumbColor="#f1f1f2"
                />
              </View>
              <View style={sharedStyles.toggleRow}>
                <Text style={sharedStyles.message}>
                  Sync automatically on resume
                </Text>
                <Switch
                  accessibilityLabel="Sync automatically on resume"
                  value={mobileSettings.autoSync}
                  onValueChange={(enabled) =>
                    void updateMobileSettings({ autoSync: enabled })
                  }
                  trackColor={{ false: "#3a3d42", true: colors.accent }}
                  thumbColor="#f1f1f2"
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingCenter: {
    alignItems: "center" as const,
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center" as const,
  },
  cardTitle: {
    ...typography.body,
    fontWeight: "800" as const,
    color: colors.text,
  },
  metaText: {
    ...typography.meta,
    marginTop: 4,
  },
});
