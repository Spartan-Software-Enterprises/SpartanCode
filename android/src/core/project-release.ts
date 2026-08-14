export const projectTargets = [
  "android",
  "ios",
  "windows",
  "macos",
  "linux",
  "web",
  "custom",
] as const;

export type ProjectTarget = (typeof projectTargets)[number];

export type ProjectReleaseChecks = {
  plan: boolean;
  build: boolean;
  verify: boolean;
  package: boolean;
};

export type MobileProject = {
  id: string;
  name: string;
  description: string;
  target: ProjectTarget;
  createdAt: string;
  checks: ProjectReleaseChecks;
  releaseStatus: "planning" | "ready";
};

const emptyChecks = (): ProjectReleaseChecks => ({
  plan: true,
  build: false,
  verify: false,
  package: false,
});

export function normalizeProject(value: unknown): MobileProject | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<MobileProject>;
  if (
    typeof item.id !== "string" ||
    typeof item.name !== "string" ||
    !item.name.trim() ||
    typeof item.description !== "string" ||
    typeof item.createdAt !== "string" ||
    !projectTargets.includes(item.target as ProjectTarget)
  )
    return null;
  const checks = item.checks as Partial<ProjectReleaseChecks> | undefined;
  const normalizedChecks = {
    plan: checks?.plan === true,
    build: checks?.build === true,
    verify: checks?.verify === true,
    package: checks?.package === true,
  };
  return {
    id: item.id.slice(0, 160),
    name: item.name.trim().slice(0, 120),
    description: item.description.trim().slice(0, 2_000),
    target: item.target as ProjectTarget,
    createdAt: item.createdAt,
    checks: normalizedChecks,
    releaseStatus: isReleaseReady(normalizedChecks) ? "ready" : "planning",
  };
}

export function isReleaseReady(checks: ProjectReleaseChecks) {
  return checks.plan && checks.build && checks.verify && checks.package;
}

export function createMobileProject(
  name: string,
  description: string,
  target: ProjectTarget,
  now = new Date().toISOString(),
  id = `project:${Date.now()}`,
): MobileProject {
  const normalizedName = name.trim().slice(0, 120);
  if (!normalizedName) throw new Error("Project name is required");
  if (!projectTargets.includes(target)) throw new Error("Unsupported target");
  return {
    id,
    name: normalizedName,
    description: description.trim().slice(0, 2_000),
    target,
    createdAt: now,
    checks: emptyChecks(),
    releaseStatus: "planning",
  };
}

export function setReleaseCheck(
  project: MobileProject,
  check: keyof ProjectReleaseChecks,
  value = true,
): MobileProject {
  const checks = { ...project.checks, [check]: value };
  return {
    ...project,
    checks,
    releaseStatus: isReleaseReady(checks) ? "ready" : "planning",
  };
}

export function releaseTargetLabel(target: ProjectTarget) {
  return target === "custom"
    ? "Custom device / OS"
    : target.charAt(0).toUpperCase() + target.slice(1);
}
