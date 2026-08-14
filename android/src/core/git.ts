export type GitOperation = "status" | "diff" | "stage" | "commit";

export function gitRoute(operation: GitOperation): string {
  if (
    !new Set<GitOperation>(["status", "diff", "stage", "commit"]).has(operation)
  ) {
    throw new Error("Unsupported Git operation");
  }
  return `/v1/git/${operation}`;
}

export function validateGitCommitMessage(value: string): string {
  const message = value.trim();
  if (!message) throw new Error("Commit message is required");
  if (message.length > 72) throw new Error("Commit message is too long");
  return message;
}

export function normalizeGitOutput(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const output = (value as { output?: unknown }).output;
  return typeof output === "string" ? output.slice(0, 50_000) : "";
}
