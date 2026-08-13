import type { MobileSnapshot } from "./types";
import { readBridgeToken } from "./storage";

export class BridgeError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "BridgeError";
  }
}

export async function bridgeRequest<T>(
  endpoint: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await readBridgeToken();
  const response = await fetch(`${endpoint.replace(/\\/$/, "")}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    throw new BridgeError(
      `Bridge request failed (${response.status})`,
      response.status,
    );
  }
  return (await response.json()) as T;
}

export function normalizeBridgeSnapshot(value: unknown): MobileSnapshot {
  if (!value || typeof value !== "object")
    throw new BridgeError("Bridge returned an invalid snapshot");
  const snapshot = value as Partial<MobileSnapshot>;
  return {
    missions: Array.isArray(snapshot.missions) ? snapshot.missions : [],
    connections: Array.isArray(snapshot.connections)
      ? snapshot.connections
      : [],
    pendingApprovals:
      typeof snapshot.pendingApprovals === "number"
        ? snapshot.pendingApprovals
        : 0,
    offline: false,
  };
}
