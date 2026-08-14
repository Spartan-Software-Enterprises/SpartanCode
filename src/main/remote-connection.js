const { Client } = require("ssh2");
const { spawn, spawnSync } = require("node:child_process");

const REMOTE_CAPABILITY_COMMAND =
  "uname -srm 2>/dev/null || true; if [ -r /dev/kvm ] && [ -w /dev/kvm ]; then echo SPARTANCODE_KVM=available; elif [ -e /dev/kvm ]; then echo SPARTANCODE_KVM=permission-denied; else echo SPARTANCODE_KVM=unavailable; fi";
const MAX_PROBE_OUTPUT = 8_192;

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

function parseRemoteCapabilities(output) {
  const lines = String(output || "")
    .slice(0, MAX_PROBE_OUTPUT)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const kvm = lines.find((line) => line.startsWith("SPARTANCODE_KVM="));
  const kvmState = kvm?.slice("SPARTANCODE_KVM=".length);
  return {
    platform:
      lines.find((line) => !line.startsWith("SPARTANCODE_KVM=")) || null,
    kvm: ["available", "permission-denied", "unavailable"].includes(kvmState)
      ? kvmState
      : "unknown",
  };
}

function probeRemoteConnection(
  config = {},
  { ClientClass = Client, timeoutMs = 10_000 } = {},
) {
  const validation = validateRemoteConfig(config);
  if (!validation.valid)
    return Promise.resolve({
      reachable: false,
      validation,
      error: "Invalid remote configuration",
    });
  const boundedTimeout = Math.max(
    1_000,
    Math.min(Number(timeoutMs) || 10_000, 30_000),
  );
  return new Promise((resolve) => {
    const client = new ClientClass();
    let settled = false;
    let timer;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        client.end();
      } catch {
        // A failed connection may not have a usable end method.
      }
      resolve(result);
    };
    timer = setTimeout(
      () => finish({ reachable: false, error: "Remote probe timed out" }),
      boundedTimeout,
    );
    client.once("error", (error) =>
      finish({ reachable: false, error: String(error?.message || error) }),
    );
    client.once("ready", () => {
      client.exec(REMOTE_CAPABILITY_COMMAND, (error, stream) => {
        if (error) {
          finish({
            reachable: true,
            capabilities: null,
            error: String(error.message || error),
          });
          return;
        }
        let output = "";
        stream.on("data", (chunk) => {
          if (output.length < MAX_PROBE_OUTPUT)
            output += String(chunk).slice(0, MAX_PROBE_OUTPUT - output.length);
        });
        stream.once("close", () =>
          finish({
            reachable: true,
            capabilities: parseRemoteCapabilities(output),
            error: null,
          }),
        );
      });
    });
    try {
      client.connect({
        host: config.host,
        port: config.port || 22,
        username: config.username,
        ...(config.password ? { password: config.password } : {}),
        ...(config.privateKey ? { privateKey: config.privateKey } : {}),
        readyTimeout: boundedTimeout,
      });
    } catch (error) {
      finish({ reachable: false, error: String(error?.message || error) });
    }
  });
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
  parseRemoteCapabilities,
  probeRemoteConnection,
  REMOTE_CAPABILITY_COMMAND,
  validateRemoteConfig,
};
