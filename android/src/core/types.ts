export type ConnectionProfile = {
  id: string;
  name: string;
  endpoint: string;
  transport: "mcp-bridge" | "ssh";
  username?: string;
  createdAt: string;
};

export type Mission = {
  id: string;
  description: string;
  status:
    | "planning"
    | "awaiting_approval"
    | "building"
    | "verifying"
    | "completed"
    | "complete"
    | "failed"
    | "denied";
  updatedAt: string;
};

export type MobileSnapshot = {
  missions: Mission[];
  connections: ConnectionProfile[];
  pendingApprovals: number;
  offline: boolean;
  syncedAt?: string;
  artifacts?: Artifact[];
  approvals?: Approval[];
  activity?: Activity[];
  auditLog?: AuditEvent[];
};

export type Artifact = {
  id: string;
  name: string;
  type: string;
  status: string;
  content?: string;
  missionId?: string;
  createdAt: string;
  review?: {
    decision: "accepted" | "rejected";
    note: string;
    reviewedAt: string;
  };
};

export type Approval = {
  id: string;
  missionId: string;
  title: string;
  detail: string;
  status: "pending" | "approved" | "denied";
  createdAt: string;
  resolvedAt?: string;
};

export type Activity = {
  id: string;
  agent: string;
  message: string;
  createdAt: string;
};
export type AuditEvent = {
  action: string;
  timestamp: string;
  [key: string]: unknown;
};

export type QueuedOperation = {
  idempotencyKey: string;
  method: "POST";
  path: string;
  body: Record<string, unknown>;
  queuedAt: string;
  attempts: number;
  lastError?: string;
  acknowledgedAt?: string;
};

const missionStatuses = new Set<Mission["status"]>([
  "planning",
  "awaiting_approval",
  "building",
  "verifying",
  "completed",
  "complete",
  "failed",
  "denied",
]);

export function isMission(value: unknown): value is Mission {
  if (!value || typeof value !== "object") return false;
  const mission = value as Partial<Mission>;
  return (
    typeof mission.id === "string" &&
    typeof mission.description === "string" &&
    missionStatuses.has(mission.status as Mission["status"]) &&
    typeof mission.updatedAt === "string"
  );
}

export function isArtifact(value: unknown): value is Artifact {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Artifact>;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.type === "string" &&
    typeof item.status === "string" &&
    typeof item.createdAt === "string"
  );
}

export function isApproval(value: unknown): value is Approval {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Approval>;
  return (
    typeof item.id === "string" &&
    typeof item.missionId === "string" &&
    typeof item.title === "string" &&
    typeof item.detail === "string" &&
    ["pending", "approved", "denied"].includes(item.status as string) &&
    typeof item.createdAt === "string"
  );
}

export function isActivity(value: unknown): value is Activity {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Activity>;
  return (
    typeof item.id === "string" &&
    typeof item.agent === "string" &&
    typeof item.message === "string" &&
    typeof item.createdAt === "string"
  );
}

export function isAuditEvent(value: unknown): value is AuditEvent {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<AuditEvent>;
  return typeof item.action === "string" && typeof item.timestamp === "string";
}

export function isQueuedOperation(value: unknown): value is QueuedOperation {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<QueuedOperation>;
  return (
    typeof item.idempotencyKey === "string" &&
    item.method === "POST" &&
    typeof item.path === "string" &&
    !!item.body &&
    typeof item.body === "object" &&
    typeof item.queuedAt === "string" &&
    typeof item.attempts === "number" &&
    Number.isInteger(item.attempts) &&
    item.attempts >= 0
  );
}

export function isConnectionProfile(
  value: unknown,
): value is ConnectionProfile {
  if (!value || typeof value !== "object") return false;
  const connection = value as Partial<ConnectionProfile>;
  return (
    typeof connection.id === "string" &&
    typeof connection.name === "string" &&
    typeof connection.endpoint === "string" &&
    (connection.transport === "mcp-bridge" || connection.transport === "ssh") &&
    (connection.username === undefined ||
      typeof connection.username === "string") &&
    typeof connection.createdAt === "string"
  );
}
