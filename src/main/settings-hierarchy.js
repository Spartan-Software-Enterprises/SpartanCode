const SETTINGS_SCOPES = ["global", "project", "agent", "session"];

function normalizeLayers(layers = {}) {
  return Object.fromEntries(
    SETTINGS_SCOPES.map((scope) => [
      scope,
      layers[scope] && typeof layers[scope] === "object"
        ? { ...layers[scope] }
        : {},
    ]),
  );
}

function sanitize(values, allowedKeys) {
  return Object.fromEntries(
    Object.entries(values || {}).filter(([key]) => allowedKeys.has(key)),
  );
}

function createSettingsHierarchy({
  baseSettings = {},
  layers = {},
  allowedKeys = new Set(Object.keys(baseSettings)),
} = {}) {
  const normalized = normalizeLayers(layers);
  const updateLayer = (scope, id, values) => {
    if (!SETTINGS_SCOPES.includes(scope))
      throw new Error(`Unknown settings scope: ${scope}`);
    const key = String(id || "default")
      .trim()
      .slice(0, 160);
    if (!key) throw new Error("Settings scope id is required");
    normalized[scope][key] = {
      ...(normalized[scope][key] || {}),
      ...sanitize(values, allowedKeys),
    };
    return normalized[scope][key];
  };
  const resolve = (context = {}) => {
    const result = { ...baseSettings };
    const merge = (scope, id) => {
      if (id && normalized[scope][id])
        Object.assign(result, normalized[scope][id]);
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

module.exports = { SETTINGS_SCOPES, createSettingsHierarchy };
