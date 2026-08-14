const fs = require("node:fs");
const path = require("node:path");
const { resolveInsideWorkspace } = require("./workspace-tools");

const PRESETS = Object.freeze({
  node: {
    image: "mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm",
    extensions: ["dbaeumer.vscode-eslint", "esbenp.prettier-vscode"],
  },
  python: {
    image: "mcr.microsoft.com/devcontainers/python:1-3.12-bookworm",
    extensions: ["ms-python.python", "ms-python.vscode-pylance"],
  },
  android: {
    image: "mcr.microsoft.com/devcontainers/base:ubuntu",
    extensions: ["vscjava.vscode-gradle", "ms-playwright.playwright"],
  },
  universal: {
    image: "mcr.microsoft.com/devcontainers/base:ubuntu",
    extensions: ["ms-playwright.playwright"],
  },
});

function boundedName(value) {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name || name.length > 80)
    throw new Error("A bounded project name is required");
  return name;
}

function normalizePreset(value) {
  const preset =
    typeof value === "string" ? value.trim().toLowerCase() : "universal";
  if (!Object.hasOwn(PRESETS, preset))
    throw new Error("Unknown dev container preset");
  return preset;
}

function normalizePorts(value) {
  if (value === undefined) return [3000];
  if (!Array.isArray(value) || value.length > 8)
    throw new Error("Dev container ports must be a bounded array");
  const ports = value.map((port) => Number(port));
  if (ports.some((port) => !Number.isInteger(port) || port < 1 || port > 65535))
    throw new Error("Dev container ports are invalid");
  return [...new Set(ports)];
}

function createDevContainerConfig(options = {}) {
  const name = boundedName(options.name || "SpartanCode project");
  const preset = normalizePreset(options.preset);
  const definition = PRESETS[preset];
  return {
    name: `${name} Dev Container`,
    image: definition.image,
    forwardPorts: normalizePorts(options.forwardPorts),
    customizations: { vscode: { extensions: [...definition.extensions] } },
    remoteUser: "vscode",
  };
}

function writeDevContainerConfig(
  workspacePath,
  projectPath = ".",
  options = {},
) {
  const projectRoot = resolveInsideWorkspace(workspacePath, projectPath);
  const directory = path.join(projectRoot, ".devcontainer");
  const filePath = path.join(directory, "devcontainer.json");
  if (fs.existsSync(filePath) && options.overwrite !== true)
    throw new Error(
      "A project devcontainer.json already exists; explicit overwrite is required",
    );
  const config = createDevContainerConfig(options);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(config, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  return { path: filePath, config };
}

module.exports = {
  PRESETS,
  createDevContainerConfig,
  writeDevContainerConfig,
};
