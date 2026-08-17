const fs = require("node:fs");
const path = require("node:path");

const SLASH_COMMANDS = [
  {
    command: "/plan",
    description:
      "Launch Plan Architect to break down requirements and generate a step plan",
    usage: "/plan <feature or architectural goal>",
    mode: "architect",
  },
  {
    command: "/build",
    description:
      "Launch Build Engineer for clean code implementation and targeted refactoring",
    usage: "/build <implementation task>",
    mode: "engineer",
  },
  {
    command: "/verify",
    description:
      "Launch QA Verifier to run test suites, linters, and verification checks",
    usage: "/verify [scope]",
    mode: "verifier",
  },
  {
    command: "/audit",
    description:
      "Launch Security Auditor to inspect permissions, boundaries, and export audit bundle",
    usage: "/audit",
    mode: "security",
  },
  {
    command: "/subagent",
    description:
      "Spawn, inspect, or message a specialized subagent in the background",
    usage: "/subagent [spawn|list|kill] [type/role]",
    mode: "subagent",
  },
  {
    command: "/task",
    description: "Schedule a background one-shot timer or recurring cron job",
    usage: "/task <prompt> in <seconds>s | cron <expression>",
    mode: "scheduler",
  },
  {
    command: "/skill",
    description:
      "View, activate, or create a custom progressive-disclosure skill",
    usage: "/skill [list|load|create] [name]",
    mode: "skill",
  },
  {
    command: "/rule",
    description: "Inspect active workspace directives and project rules",
    usage: "/rule [list|show] [name]",
    mode: "rule",
  },
  {
    command: "/diff",
    description:
      "Review pending workspace changes with visual additions and deletions",
    usage: "/diff",
    mode: "diff",
  },
  {
    command: "/clear",
    description:
      "Clear active conversation canvas while preserving project history",
    usage: "/clear",
    mode: "clear",
  },
  {
    command: "/help",
    description:
      "Display the Antigravity 2.0 command center and slash command reference",
    usage: "/help",
    mode: "help",
  },
];

class CommandDispatcher {
  constructor({
    workspacePath = null,
    subagentsManager = null,
    taskScheduler = null,
    customizationsHub = null,
  } = {}) {
    this.workspacePath = workspacePath;
    this.subagentsManager = subagentsManager;
    this.taskScheduler = taskScheduler;
    this.customizationsHub = customizationsHub;
  }

  setWorkspace(workspacePath) {
    this.workspacePath = workspacePath;
  }

  listSlashCommands() {
    return SLASH_COMMANDS.map((c) => ({ ...c }));
  }

  resolveSlashCommand(input) {
    const trimmed = String(input).trim();
    if (!trimmed.startsWith("/")) return null;

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1).join(" ");

    const match = SLASH_COMMANDS.find((c) => c.command === cmd);
    if (!match) {
      return {
        matched: false,
        command: cmd,
        error: `Unknown slash command: ${cmd}. Type /help for available commands.`,
      };
    }

    return {
      matched: true,
      command: match.command,
      mode: match.mode,
      args,
      description: match.description,
    };
  }

  resolveMentions(input) {
    const text = String(input);
    const mentions = [];
    const regex = /@([a-zA-Z0-9_\-\.\/]+)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const identifier = match[1];
      const resolved = this.resolveMentionIdentifier(identifier);
      mentions.push({
        raw: match[0],
        identifier,
        resolved,
      });
    }
    return mentions;
  }

  resolveMentionIdentifier(identifier) {
    const lower = identifier.toLowerCase();

    if (this.customizationsHub) {
      const rule = this.customizationsHub
        .discoverRules()
        .find(
          (r) => r.id.toLowerCase() === lower || r.name.toLowerCase() === lower,
        );
      if (rule) {
        return {
          type: "rule",
          name: rule.name,
          content: rule.summary,
          path: rule.path,
        };
      }

      const skill = this.customizationsHub
        .discoverSkills()
        .find(
          (s) => s.id.toLowerCase() === lower || s.name.toLowerCase() === lower,
        );
      if (skill) {
        return {
          type: "skill",
          name: skill.name,
          content: skill.summary,
          path: skill.path,
        };
      }
    }

    if (this.subagentsManager) {
      const subagent = this.subagentsManager
        .listSubagents()
        .find(
          (s) =>
            s.type.toLowerCase() === lower || s.name.toLowerCase() === lower,
        );
      if (subagent) {
        return {
          type: "subagent",
          name: subagent.name,
          role: subagent.role,
          state: subagent.state,
          conversationId: subagent.conversationId,
        };
      }
    }

    if (this.workspacePath && fs.existsSync(this.workspacePath)) {
      const targetPath = path.resolve(this.workspacePath, identifier);
      if (
        targetPath.startsWith(this.workspacePath) &&
        fs.existsSync(targetPath)
      ) {
        const stat = fs.statSync(targetPath);
        return {
          type: stat.isDirectory() ? "folder" : "file",
          path: targetPath,
          relative: path.relative(this.workspacePath, targetPath),
          size: stat.size,
        };
      }
    }

    return {
      type: "reference",
      identifier,
    };
  }
}

function createCommandDispatcher(options) {
  return new CommandDispatcher(options);
}

module.exports = {
  SLASH_COMMANDS,
  CommandDispatcher,
  createCommandDispatcher,
};
