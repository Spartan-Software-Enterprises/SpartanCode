import type { Activity, Artifact, AuditEvent } from "./types";

export type LocalPlanningEvidence = {
  artifact: Artifact;
  activity: Activity;
  audit: AuditEvent;
};

/**
 * Create explainable offline planning evidence without pretending that code
 * execution happened on the phone. A connected bridge may later replace this
 * plan with the remote lifecycle while preserving the local queue record.
 */
export function createLocalPlanningEvidence(
  missionId: string,
  description: string,
  now = new Date().toISOString(),
): LocalPlanningEvidence {
  const artifactId = `local-plan:${missionId}`;
  return {
    artifact: {
      id: artifactId,
      name: "Offline execution plan",
      type: "plan",
      status: "ready",
      missionId,
      content: JSON.stringify({
        goal: description,
        stages: ["plan", "build", "verify"],
        execution: "queued",
      }),
      createdAt: now,
    },
    activity: {
      id: `local-activity:${missionId}`,
      agent: "Plan agent",
      message: "Offline plan created; build and verification remain queued",
      createdAt: now,
    },
    audit: {
      action: "mission:planned-offline",
      missionId,
      timestamp: now,
    },
  };
}
