const fs = require("node:fs");
const path = require("node:path");

const MAX_CUSTOMIZATION_BYTES = 128 * 1024;
const RULE_FILES = ["AGENTS.md", "SPARTAN.md", "CLAUDE.md", "GEMINI.md"];

function parseFrontmatter(source) {
  if (!source.startsWith("---\n")) return { metadata: {}, body: source.trim() };
  const end = source.indexOf("\n---", 4);
  if (end < 0) return { metadata: {}, body: source.trim() };
  const metadata = {};
  for (const line of source.slice(4, end).split("\n")) {
    const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
    if (!match) continue;
    metadata[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return { metadata, body: source.slice(end + 4).trim() };
}

class CustomizationsHub {
  constructor(workspacePath = null) {
    this.workspacePath = workspacePath;
    this.inMemoryCustomizations = {
      rules: new Map(),
      skills: new Map(),
      hooks: new Map(),
    };
  }

  setWorkspace(workspacePath) {
    this.workspacePath = workspacePath;
  }

  discoverRules() {
    const rules = [];
    if (!this.workspacePath || !fs.existsSync(this.workspacePath)) {
      return Array.from(this.inMemoryCustomizations.rules.values());
    }

    for (const fileName of RULE_FILES) {
      const filePath = path.join(this.workspacePath, fileName);
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, "utf8");
          const { metadata, body } = parseFrontmatter(content);
          rules.push({
            id: fileName.toLowerCase().replace(".md", ""),
            name: metadata.name || fileName,
            description:
              metadata.description || `Workspace rule in ${fileName}`,
            trigger: metadata.trigger || "always_on",
            path: filePath,
            relative: fileName,
            summary: body.slice(0, 300),
            fullContent: body,
          });
        } catch {
          /* ignore unreadable files */
        }
      }
    }

    const rulesDir = path.join(this.workspacePath, ".agents", "rules");
    if (fs.existsSync(rulesDir)) {
      try {
        const files = fs.readdirSync(rulesDir);
        for (const file of files) {
          if (file.endsWith(".md")) {
            const filePath = path.join(rulesDir, file);
            const content = fs.readFileSync(filePath, "utf8");
            const { metadata, body } = parseFrontmatter(content);
            rules.push({
              id: file.replace(".md", ""),
              name: metadata.name || file,
              description: metadata.description || `Rule: ${file}`,
              trigger: metadata.trigger || "model_decision",
              path: filePath,
              relative: path.join(".agents", "rules", file),
              summary: body.slice(0, 300),
              fullContent: body,
            });
          }
        }
      } catch {
        /* ignore directory read errors */
      }
    }

    for (const memRule of this.inMemoryCustomizations.rules.values()) {
      if (!rules.some((r) => r.id === memRule.id)) {
        rules.push(memRule);
      }
    }

    return rules;
  }

  discoverSkills() {
    const skills = [];
    if (!this.workspacePath || !fs.existsSync(this.workspacePath)) {
      return Array.from(this.inMemoryCustomizations.skills.values());
    }

    const searchDirs = [
      path.join(this.workspacePath, "skills"),
      path.join(this.workspacePath, ".agents", "skills"),
    ];

    for (const baseDir of searchDirs) {
      if (!fs.existsSync(baseDir)) continue;
      try {
        const entries = fs.readdirSync(baseDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const skillFile = path.join(baseDir, entry.name, "SKILL.md");
            if (fs.existsSync(skillFile)) {
              const content = fs.readFileSync(skillFile, "utf8");
              const { metadata, body } = parseFrontmatter(content);
              skills.push({
                id: entry.name,
                name: metadata.name || entry.name,
                description: metadata.description || `Skill: ${entry.name}`,
                path: skillFile,
                relative: path.relative(this.workspacePath, skillFile),
                summary: body.slice(0, 300),
                fullContent: body,
              });
            }
          }
        }
      } catch {
        /* ignore search errors */
      }
    }

    for (const memSkill of this.inMemoryCustomizations.skills.values()) {
      if (!skills.some((s) => s.id === memSkill.id)) {
        skills.push(memSkill);
      }
    }

    return skills;
  }

  discoverHooks() {
    const hooks = [];
    if (!this.workspacePath || !fs.existsSync(this.workspacePath)) {
      return Array.from(this.inMemoryCustomizations.hooks.values());
    }

    const hookFiles = [
      path.join(this.workspacePath, "hooks.json"),
      path.join(this.workspacePath, ".agents", "hooks.json"),
    ];

    for (const file of hookFiles) {
      if (fs.existsSync(file)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
          if (Array.isArray(parsed)) {
            hooks.push(...parsed);
          } else if (typeof parsed === "object") {
            for (const [event, script] of Object.entries(parsed)) {
              hooks.push({ event, script });
            }
          }
        } catch {
          /* ignore json errors */
        }
      }
    }
    return hooks;
  }

  discoverMcpServers() {
    if (!this.workspacePath || !fs.existsSync(this.workspacePath)) return [];
    const mcpFiles = [
      path.join(this.workspacePath, "mcp_config.json"),
      path.join(this.workspacePath, ".agents", "mcp_config.json"),
    ];
    for (const file of mcpFiles) {
      if (fs.existsSync(file)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
          if (parsed && typeof parsed.mcpServers === "object") {
            return Object.entries(parsed.mcpServers).map(([name, conf]) => ({
              name,
              command: conf.command,
              args: conf.args || [],
              env: conf.env ? Object.keys(conf.env) : [],
            }));
          }
        } catch {
          /* ignore */
        }
      }
    }
    return [];
  }

  getAllCustomizations() {
    return {
      rules: this.discoverRules(),
      skills: this.discoverSkills(),
      hooks: this.discoverHooks(),
      mcpServers: this.discoverMcpServers(),
    };
  }

  addCustomRule({ id, name, description, trigger = "always_on", content }) {
    const rule = {
      id: id || `rule-${Date.now()}`,
      name: name || id,
      description: description || "Custom in-memory rule",
      trigger,
      summary: (content || "").slice(0, 300),
      fullContent: content || "",
      path: "memory://custom-rule",
    };
    this.inMemoryCustomizations.rules.set(rule.id, rule);
    return rule;
  }

  addCustomSkill({ id, name, description, content }) {
    const skill = {
      id: id || `skill-${Date.now()}`,
      name: name || id,
      description: description || "Custom in-memory skill",
      summary: (content || "").slice(0, 300),
      fullContent: content || "",
      path: "memory://custom-skill",
    };
    this.inMemoryCustomizations.skills.set(skill.id, skill);
    return skill;
  }
}

function createCustomizationsHub(workspacePath) {
  return new CustomizationsHub(workspacePath);
}

module.exports = {
  CustomizationsHub,
  createCustomizationsHub,
  parseFrontmatter,
};
