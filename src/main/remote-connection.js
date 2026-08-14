const { Client } = require("ssh2");
const { spawn, spawnSync } = require("node:child_process");

function commandAvailable(command, runner = spawnSync) {
  const result = runner(command, [], { stdio: "ignore" });
  return result.status === 0;
}

function getTransportStatus(transport = "ssh", exists = commandAvailable) {
  if (transport === "mosh")
    return {
      transport,
      available: exists("mosh"),
      installHint:
        "Install the mosh client and ensure the server has mosh-server",
    };
  if (transport === "ssh")
    return { transport, available: true, installHint: null };
  if (transport === "mcp-bridge")
    return { transport, available: true, installHint: null };
  return { transport, available: false, installHint: null };
}

function buildMoshArgs(config = {}) {
  const validation = validateRemoteConfig({ ...config, transport: "mosh" });
  if (!validation.valid)
    throw new Error(
      `Invalid Mosh configuration: ${[...validation.missing, ...validation.invalid].join(", ")}`,
    );
  const target = `${config.username}@${config.host}`;
  return config.port && config.port !== 22
    ? [`--ssh=ssh -p ${Number(config.port)}`, "--", target]
    : ["--", target];
}

function createMoshSession(config = {}, { spawnProcess = spawn } = {}) {
  const validation = validateRemoteConfig({ ...config, transport: "mosh" });
  if (!validation.valid)
    throw new Error(
      `Invalid Mosh configuration: ${[...validation.missing, ...validation.invalid].join(", ")}`,
    );
  const args = buildMoshArgs(config);
  let child = null;
  let state = "idle";
  let error = null;
  const listeners = new Set();
  const emit = () => listeners.forEach((listener) => listener(snapshot()));
  const snapshot = () => ({
    transport: "mosh",
    state,
    host: config.host,
    username: config.username,
    port: config.port || 22,
    args: [...args],
    error,
    serverRequirement:
      "The remote host must provide mosh-server and reachable UDP ports.",
  });
  const session = {
    start() {
      if (state !== "idle" && state !== "ended" && state !== "error")
        return snapshot();
      error = null;
      state = "connecting";
      child = spawnProcess("mosh", args, { stdio: "pipe" });
      child.once("spawn", () => {
        state = "ready";
        emit();
      });
      child.once("error", (value) => {
        error = String(value?.message || value);
        state = "error";
        emit();
      });
      child.once("close", (code, signal) => {
        if (state === "ended") return;
        if (state !== "error") state = "ended";
        error = code || signal ? `Mosh exited (${code ?? signal})` : null;
        emit();
      });
      emit();
      return snapshot();
    },
    stop() {
      if (!child || state === "ended") return snapshot();
      state = "ended";
      child.kill();
      emit();
      return snapshot();
    },
    onChange(listener) {
      if (typeof listener !== "function")
        throw new Error("Listener is required");
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot,
  };
  return session;
}

function createRemoteConnection(config) {
  const client = new Client();

  client.on("ready", () => {
    console.log("SSH connection established");
  });

  client.on("error", (err) => {
    console.error("SSH connection error:", err);
  });

  client.on("end", () => {
    console.log("SSH connection ended");
  });

  client.connect({
    host: config.host,
    port: config.port || 22,
    username: config.username,
    password: config.password,
    privateKey: config.privateKey,
  });

  return client;
}

function validateRemoteConfig(config = {}) {
  const transport = config.transport || "ssh";
  const validTransports = ["ssh", "mosh", "mcp-bridge"];
  const safeHost =
    typeof config.host === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._:-]{0,253}$/.test(config.host);
  const safeUsername =
    typeof config.username === "string" &&
    /^[A-Za-z0-9._-]{1,64}$/.test(config.username);
  const safePort =
    config.port === undefined ||
    (Number.isInteger(Number(config.port)) &&
      Number(config.port) >= 1 &&
      Number(config.port) <= 65535);
  return {
    valid: Boolean(
      safeHost &&
      safeUsername &&
      safePort &&
      validTransports.includes(transport),
    ),
    transport,
    missing: [!config.host && "host", !config.username && "username"].filter(
      Boolean,
    ),
    invalid: [
      config.host && !safeHost && "host",
      config.username && !safeUsername && "username",
      !safePort && "port",
    ].filter(Boolean),
    transportStatus: getTransportStatus(transport),
  };
}

module.exports = {
  buildMoshArgs,
  commandAvailable,
  createMoshSession,
  createRemoteConnection,
  getTransportStatus,
  validateRemoteConfig,
};
