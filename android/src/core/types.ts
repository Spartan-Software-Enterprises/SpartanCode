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
    | "failed";
  updatedAt: string;
};

export type MobileSnapshot = {
  missions: Mission[];
  connections: ConnectionProfile[];
  pendingApprovals: number;
  offline: boolean;
};

const missionStatuses = new Set<Mission["status"]>([
  "planning",
  "awaiting_approval",
  "building",
  "verifying",
  "completed",
  "failed",
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
