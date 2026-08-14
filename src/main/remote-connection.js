const { Client } = require("ssh2");
const { spawnSync } = require("node:child_process");

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
  createRemoteConnection,
  getTransportStatus,
  validateRemoteConfig,
};
