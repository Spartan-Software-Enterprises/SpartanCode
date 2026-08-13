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
