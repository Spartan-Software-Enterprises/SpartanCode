export interface SlashCommandDef {
  command: string;
  description: string;
  mode: string;
}

export const ANDROID_SLASH_COMMANDS: SlashCommandDef[] = [
  {
    command: "/plan",
    description: "Launch Plan Architect to deconstruct mobile mission",
    mode: "architect",
  },
  {
    command: "/build",
    description: "Launch Build Engineer for offline implementation",
    mode: "engineer",
  },
  {
    command: "/verify",
    description: "Launch QA Verifier to run test suites",
    mode: "verifier",
  },
  {
    command: "/audit",
    description: "Launch Security Auditor for boundary scan",
    mode: "security",
  },
  {
    command: "/subagent",
    description: "Spawn or message specialized mobile subagent",
    mode: "subagent",
  },
  {
    command: "/clear",
    description: "Clear active conversation stream",
    mode: "clear",
  },
  {
    command: "/help",
    description: "Display command reference",
    mode: "help",
  },
];

export function resolveAndroidSlash(input: string): {
  matched: boolean;
  command?: string;
  args?: string;
  mode?: string;
} {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return { matched: false };
  const parts = trimmed.split(/\s+/);
  const cmd = (parts[0] || "").toLowerCase();
  const args = parts.slice(1).join(" ");

  const found = ANDROID_SLASH_COMMANDS.find((c) => c.command === cmd);
  if (!found) return { matched: false };

  return {
    matched: true,
    command: found.command,
    args,
    mode: found.mode,
  };
}
