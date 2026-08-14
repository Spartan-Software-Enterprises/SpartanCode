const fs = require("fs");
const path = require("path");

const AGENT_NAME = /^[a-z0-9][a-z0-9-]{0,47}$/;
const MAX_AGENT_FILES = 32;
const MAX_AGENT_BYTES = 64 * 1024;

const bundledAgents = [
  {
    name: "leo",
    description:
      "Default SpartanCode agent for planning, implementation, and verification.",
    tools: ["workspace.list", "workspace.read", "git", "terminal"],
    model: "inherit",
    commandExecutionPolicy: "sandbox",
    subagent: true,
    mainAgent: true,
    prompt:
      "You are Leo, the default SpartanCode agent. Coordinate the mission lifecycle, keep work local-first, preserve user data, and leave reproducible verification evidence.",
    path: "bundled/leo",
  },
];

function parseScalar(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed === "true" || trimmed === "false") return trimmed === "true";
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  )
    return trimmed.slice(1, -1);
  return trimmed;
}

function parseFrontmatter(source) {
  if (!source.startsWith("---\n"))
    throw new Error("Agent definition requires YAML frontmatter");
  const end = source.indexOf("\n---", 4);
  if (end < 0) throw new Error("Agent frontmatter is not closed");
  const metadata = {};
  let listKey = null;
  for (const line of source.slice(4, end).split("\n")) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const listItem = line.match(/^\s+-\s+(.+)$/);
    if (listItem && listKey) {
      if (!Array.isArray(metadata[listKey])) metadata[listKey] = [];
      metadata[listKey].push(parseScalar(listItem[1]));
      continue;
    }
    const entry = line.match(/^([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (!entry) throw new Error(`Invalid agent metadata line: ${line}`);
    const [, key, value] = entry;
    if (!value.trim()) {
      metadata[key] = [];
      listKey = key;
    } else {
      metadata[key] = parseScalar(value);
      listKey = null;
    }
  }
  return { metadata, prompt: source.slice(end + 4).trim() };
}

function readAgent(filePath, rootPath) {
  const source = fs.readFileSync(filePath, "utf8");
  if (Buffer.byteLength(source, "utf8") > MAX_AGENT_BYTES)
    throw new Error("Agent definition exceeds the size limit");
  const { metadata, prompt } = parseFrontmatter(source);
  if (typeof metadata.name !== "string" || !AGENT_NAME.test(metadata.name))
    throw new Error("Agent name must be lowercase kebab-case");
  if (typeof metadata.description !== "string" || !metadata.description)
    throw new Error("Agent description is required");
  return {
    name: metadata.name,
    description: metadata.description,
    tools: Array.isArray(metadata.tools) ? metadata.tools : [],
    model: metadata.model || "inherit",
    commandExecutionPolicy: metadata.commandExecutionPolicy || "sandbox",
    subagent: metadata.subagent !== false,
    mainAgent: metadata.mainAgent !== false,
    prompt,
    path: path.relative(rootPath, filePath),
  };
}

function loadCustomAgents(workspacePath) {
  if (typeof workspacePath !== "string" || !workspacePath) return [];
  const rootPath = path.resolve(workspacePath, ".agents", "agents");
  if (!fs.existsSync(rootPath)) return [];
  const entries = fs
    .readdirSync(rootPath, { withFileTypes: true })
    .flatMap((entry) => {
      if (entry.isFile() && entry.name.endsWith(".md"))
        return [path.join(rootPath, entry.name)];
      if (!entry.isDirectory() || !AGENT_NAME.test(entry.name)) return [];
      const nested = path.join(rootPath, entry.name, "agent.md");
      return fs.existsSync(nested) ? [nested] : [];
    })
    .slice(0, MAX_AGENT_FILES);
  const agents = [];
  for (const filePath of entries) {
    try {
      agents.push(readAgent(filePath, rootPath));
    } catch {
      /* Ignore invalid customizations. */
    }
  }
  return agents.sort((a, b) => a.name.localeCompare(b.name));
}

function listBundledAgents() {
  return bundledAgents.map((agent) => ({ ...agent }));
}

module.exports = { listBundledAgents, loadCustomAgents, parseFrontmatter };
