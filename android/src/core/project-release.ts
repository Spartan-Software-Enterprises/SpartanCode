import type { Activity, Artifact, AuditEvent } from "./types";

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

export type LocalReleaseEvidence = {
  artifact: Artifact;
  activity: Activity;
  audit: AuditEvent;
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
  if (!Number.isFinite(Date.parse(item.createdAt))) return null;
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
  id = `project:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`,
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

/**
 * Record a phone-authored release checklist entry without claiming that a
 * target-specific compiler or packaging tool actually ran on the phone.
 */
export function createLocalReleaseEvidence(
  project: MobileProject,
  check: keyof ProjectReleaseChecks,
  now = new Date().toISOString(),
): LocalReleaseEvidence {
  const artifactId = `local-release:${project.id}:${check}`;
  const message = `${check} evidence recorded for ${releaseTargetLabel(project.target)}`;
  return {
    artifact: {
      id: artifactId,
      name: `${project.name} · ${check} evidence`,
      type: "release-evidence",
      status: "recorded",
      content: JSON.stringify({
        projectId: project.id,
        target: project.target,
        check,
        source: "android-local",
        executionClaim: "not-run-on-phone",
      }),
      createdAt: now,
    },
    activity: {
      id: `local-release-activity:${project.id}:${check}`,
      agent: "Release checklist",
      message,
      createdAt: now,
    },
    audit: {
      action: `release:${check}:recorded-local`,
      projectId: project.id,
      target: project.target,
      timestamp: now,
    },
  };
}
