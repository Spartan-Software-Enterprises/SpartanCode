const fs = require("node:fs");
const path = require("node:path");
const externalSources = require("../../config/external-skills.json");

const MAX_SKILLS = 5000;
const MAX_SKILL_BYTES = 128 * 1024;
const SKILL_NAME = /^[a-z0-9][a-z0-9-]{0,95}$/;
const RISK_PATTERN =
  /\b(exploit|exploitation|credential|password|token|phish|malware|ransomware|c2|command and control|privilege escalation|lateral movement|persistence|delete|wipe|exfiltrat|bypass)\b/i;

function parseFrontmatter(source) {
  if (!source.startsWith("---\n"))
    throw new Error("Skill frontmatter is required");
  const end = source.indexOf("\n---", 4);
  if (end < 0) throw new Error("Skill frontmatter is not closed");
  const metadata = {};
  for (const line of source.slice(4, end).split("\n")) {
    const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
    if (!match) continue;
    const value = match[2].trim().replace(/^['"]|['"]$/g, "");
    metadata[match[1]] = value;
  }
  return { metadata, body: source.slice(end + 4).trim() };
}

function riskFor(metadata, body) {
  return RISK_PATTERN.test(
    `${metadata.name || ""} ${metadata.description || ""} ${body.slice(0, 4000)}`,
  )
    ? "review-required"
    : "general";
}

function findSkillFiles(root, limit = MAX_SKILLS) {
  const found = [];
  const walk = (directory) => {
    if (found.length >= limit) return;
    let entries;
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (found.length >= limit) return;
      const child = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile() && entry.name === "SKILL.md") found.push(child);
    }
  };
  walk(path.resolve(root));
  return found;
}

function inspectSkill(filePath, sourceId) {
  if (fs.statSync(filePath).size > MAX_SKILL_BYTES)
    throw new Error("Skill is too large");
  const source = fs.readFileSync(filePath, "utf8");
  const { metadata, body } = parseFrontmatter(source);
  if (!SKILL_NAME.test(metadata.name || ""))
    throw new Error("Skill name is invalid");
  if (!metadata.description) throw new Error("Skill description is required");
  return {
    id: metadata.name,
    description: metadata.description.slice(0, 1000),
    domain: metadata.domain || "unclassified",
    license: metadata.license || "unverified",
    source: sourceId,
    path: filePath,
    risk: riskFor(metadata, body),
    executableContent: false,
  };
}

function listExternalSkillSources() {
  return externalSources.map((source) => ({ ...source }));
}

function discoverSkills(roots = []) {
  const results = [];
  for (const root of roots.filter((item) => typeof item === "string" && item)) {
    const resolved = path.resolve(root);
    if (!fs.existsSync(resolved)) continue;
    const sourceId =
      path.basename(resolved) === "skills"
        ? path.basename(path.dirname(resolved))
        : path.basename(resolved);
    for (const filePath of findSkillFiles(
      resolved,
      MAX_SKILLS - results.length,
    )) {
      try {
        results.push(inspectSkill(filePath, sourceId));
      } catch {
        /* Invalid external skill metadata is ignored. */
      }
    }
  }
  return results.sort((left, right) => left.id.localeCompare(right.id));
}

function loadSkill(skill, maxBytes = MAX_SKILL_BYTES, allowedRoots = []) {
  if (!skill || typeof skill.path !== "string")
    throw new Error("Skill metadata is required");
  const resolved = path.resolve(skill.path);
  const roots = allowedRoots
    .filter((root) => typeof root === "string" && root)
    .map((root) => {
      try {
        return fs.realpathSync(root);
      } catch {
        return path.resolve(root);
      }
    });
  if (
    roots.length &&
    !roots.some(
      (root) => resolved === root || resolved.startsWith(`${root}${path.sep}`),
    )
  )
    throw new Error("Skill is outside configured skill roots");
  if (fs.statSync(resolved).size > maxBytes)
    throw new Error("Skill is too large to load");
  const source = fs.readFileSync(resolved, "utf8");
  parseFrontmatter(source);
  return { ...skill, content: source, executableContent: false };
}

module.exports = {
  externalSources,
  parseFrontmatter,
  riskFor,
  findSkillFiles,
  inspectSkill,
  listExternalSkillSources,
  discoverSkills,
  loadSkill,
};
