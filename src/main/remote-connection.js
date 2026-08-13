const { Client } = require("ssh2");

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
  return {
    valid: Boolean(
      config.host && config.username && validTransports.includes(transport),
    ),
    transport,
    missing: [!config.host && "host", !config.username && "username"].filter(
      Boolean,
    ),
  };
}

module.exports = { createRemoteConnection, validateRemoteConfig };
