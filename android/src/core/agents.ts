export type MobileAgent = {
  name: string;
  description: string;
  model: "local" | "dev-server";
  subagent: boolean;
};

// Bundled roles keep Android-only installations independent of the desktop,
// a bridge, and network access.
export const bundledAgents: readonly MobileAgent[] = [
  {
    name: "researcher",
    description: "Investigate requirements, risks, and workspace patterns.",
    model: "local",
    subagent: true,
  },
  {
    name: "implementer",
    description: "Implement scoped changes with local-first policy safeguards.",
    model: "local",
    subagent: true,
  },
  {
    name: "verifier",
    description: "Run checks and report reproducible verification evidence.",
    model: "local",
    subagent: true,
  },
  {
    name: "sync-guardian",
    description:
      "Protect local work and reconcile optional remote copies safely.",
    model: "local",
    subagent: true,
  },
];

export function availableAgents(serverConnected = false): MobileAgent[] {
  return bundledAgents.map((agent) => ({
    ...agent,
    model: serverConnected ? "dev-server" : "local",
  }));
}
