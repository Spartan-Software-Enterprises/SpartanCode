export interface SubagentTemplate {
  type: string;
  name: string;
  role: string;
  description: string;
}

export interface SubagentInstance {
  conversationId: string;
  type: string;
  name: string;
  role: string;
  description: string;
  state: "running" | "idle" | "waiting" | "done" | "errored";
  stepIndex: number;
}

export const DEFAULT_ANDROID_SUBAGENTS: SubagentTemplate[] = [
  {
    type: "planner",
    name: "Plan Architect",
    role: "System Architect",
    description: "Breaks down goals into structured steps.",
  },
  {
    type: "engineer",
    name: "Build Engineer",
    role: "Software Engineer",
    description: "Implements modules with type safety.",
  },
  {
    type: "verifier",
    name: "QA Verifier",
    role: "QA Specialist",
    description: "Validates tests, linters, and verification checks.",
  },
  {
    type: "security",
    name: "Security Auditor",
    role: "Security Specialist",
    description: "Ensures boundary safety and zero secret leakage.",
  },
];

export function spawnAndroidSubagent(
  type: string,
  customName?: string,
): SubagentInstance {
  const template =
    DEFAULT_ANDROID_SUBAGENTS.find((s) => s.type === type) ||
    DEFAULT_ANDROID_SUBAGENTS[0];
  const conversationId = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  return {
    conversationId,
    type: template.type,
    name: customName || template.name,
    role: template.role,
    description: template.description,
    state: "running",
    stepIndex: 0,
  };
}
