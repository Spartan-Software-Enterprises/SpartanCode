const SETTINGS_SCOPES = ["global", "project", "agent", "session"];

const DEFAULT_SETTINGS = {
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
  workspacePath: null,
};

const VALID_AGENTS = new Set([
  "leo",
  "researcher",
  "implementer",
  "verifier",
  "sync-guardian",
]);
const VALID_PROTOCOLS = new Set(["MCP Lite", "MCP Bridge", "Full MCP"]);
const VALID_QUANTIZATIONS = new Set(["Q4_K_M", "Q4_0", "Q3_K_S"]);
const VALID_SIGNALS = new Set([
  "calm",
  "focused",
  "frustrated",
  "uncertain",
  "excited",
  "tired",
]);

function normalizeSettings(values = {}, { defaults = DEFAULT_SETTINGS } = {}) {
  const parsed = values && typeof values === "object" ? values : {};
  const result = { ...defaults };
  if (typeof parsed.model === "string" && parsed.model.trim())
    result.model = parsed.model.trim().slice(0, 160);
  if (
    typeof parsed.defaultAgent === "string" &&
    VALID_AGENTS.has(parsed.defaultAgent)
  )
    result.defaultAgent = parsed.defaultAgent;
  if (
    typeof parsed.protocol === "string" &&
    VALID_PROTOCOLS.has(parsed.protocol)
  )
    result.protocol = parsed.protocol;
  if (typeof parsed.apiProvider === "string" && parsed.apiProvider.trim())
    result.apiProvider = parsed.apiProvider.trim().slice(0, 48);
  if (parsed.workspacePath === null || typeof parsed.workspacePath === "string")
    result.workspacePath = parsed.workspacePath;
  if (typeof parsed.memoryEnabled === "boolean")
    result.memoryEnabled = parsed.memoryEnabled;
  if (parsed.executionMode === "guided" || parsed.executionMode === "yolo")
    result.executionMode = parsed.executionMode;
  if (
    typeof parsed.quantization === "string" &&
    VALID_QUANTIZATIONS.has(parsed.quantization)
  )
    result.quantization = parsed.quantization;
  if (typeof parsed.voiceEnabled === "boolean")
    result.voiceEnabled = parsed.voiceEnabled;
  if (typeof parsed.autoSync === "boolean") result.autoSync = parsed.autoSync;
  for (const key of ["personaName", "wakeWord"]) {
    if (typeof parsed[key] === "string" && parsed[key].trim())
      result[key] = parsed[key].trim().slice(0, 48);
  }
  if (parsed.emotionMode === "off" || parsed.emotionMode === "explicit")
    result.emotionMode = parsed.emotionMode;
  if (
    typeof parsed.interactionSignal === "string" &&
    VALID_SIGNALS.has(parsed.interactionSignal)
  )
    result.interactionSignal = parsed.interactionSignal;
  return result;
}

function normalizeSettingsOverride(values = {}) {
  const parsed = values && typeof values === "object" ? values : {};
  const normalized = normalizeSettings(parsed);
  const valid = new Set();
  if (typeof parsed.model === "string" && parsed.model.trim())
    valid.add("model");
  if (
    typeof parsed.defaultAgent === "string" &&
    VALID_AGENTS.has(parsed.defaultAgent)
  )
    valid.add("defaultAgent");
  if (
    typeof parsed.protocol === "string" &&
    VALID_PROTOCOLS.has(parsed.protocol)
  )
    valid.add("protocol");
  if (typeof parsed.apiProvider === "string" && parsed.apiProvider.trim())
    valid.add("apiProvider");
  if (parsed.workspacePath === null || typeof parsed.workspacePath === "string")
    valid.add("workspacePath");
  if (typeof parsed.memoryEnabled === "boolean") valid.add("memoryEnabled");
  if (parsed.executionMode === "guided" || parsed.executionMode === "yolo")
    valid.add("executionMode");
  if (
    typeof parsed.quantization === "string" &&
    VALID_QUANTIZATIONS.has(parsed.quantization)
  )
    valid.add("quantization");
  if (typeof parsed.voiceEnabled === "boolean") valid.add("voiceEnabled");
  if (typeof parsed.autoSync === "boolean") valid.add("autoSync");
  for (const key of ["personaName", "wakeWord"])
    if (typeof parsed[key] === "string" && parsed[key].trim()) valid.add(key);
  if (parsed.emotionMode === "off" || parsed.emotionMode === "explicit")
    valid.add("emotionMode");
  if (
    typeof parsed.interactionSignal === "string" &&
    VALID_SIGNALS.has(parsed.interactionSignal)
  )
    valid.add("interactionSignal");
  return Object.fromEntries([...valid].map((key) => [key, normalized[key]]));
}

function normalizeScopeId(value) {
  const key = String(value || "default")
    .trim()
    .slice(0, 160);
  if (!key) throw new Error("Settings scope id is required");
  return key;
}

function normalizeLayers(layers = {}) {
  return Object.fromEntries(
    SETTINGS_SCOPES.map((scope) => [
      scope,
      scope === "global"
        ? normalizeSettingsOverride(layers[scope])
        : layers[scope] && typeof layers[scope] === "object"
          ? Object.fromEntries(
              Object.entries(layers[scope]).map(([id, values]) => [
                String(id).trim().slice(0, 160),
                normalizeSettingsOverride(values),
              ]),
            )
          : {},
    ]),
  );
}

function createSettingsHierarchy({
  baseSettings = DEFAULT_SETTINGS,
  layers = {},
  allowedKeys = new Set(Object.keys(baseSettings)),
} = {}) {
  const normalized = normalizeLayers(layers);
  const base = normalizeSettings(baseSettings, { defaults: baseSettings });
  const updateLayer = (scope, id, values) => {
    if (!SETTINGS_SCOPES.includes(scope))
      throw new Error(`Unknown settings scope: ${scope}`);
    const key = normalizeScopeId(id);
    normalized[scope][key] = {
      ...(normalized[scope][key] || {}),
      ...Object.fromEntries(
        Object.entries(normalizeSettingsOverride(values)).filter(([name]) =>
          allowedKeys.has(name),
        ),
      ),
    };
    return normalized[scope][key];
  };
  const resolve = (context = {}) => {
    const result = { ...base };
    const merge = (scope, id) => {
      if (!id) return;
      const key = normalizeScopeId(id);
      if (Object.prototype.hasOwnProperty.call(normalized[scope], key))
        Object.assign(result, normalized[scope][key]);
    };
    merge("global", "default");
    merge("project", "default");
    merge("project", context.projectId);
    merge("agent", "default");
    merge("agent", context.agentId);
    merge("session", "default");
    merge("session", context.sessionId);
    return result;
  };
  return {
    set(scope, id, values) {
      return updateLayer(scope, id, values);
    },
    resolve,
    snapshot() {
      return JSON.parse(JSON.stringify(normalized));
    },
  };
}

module.exports = {
  DEFAULT_SETTINGS,
  SETTINGS_SCOPES,
  createSettingsHierarchy,
  normalizeSettings,
  normalizeSettingsOverride,
};
