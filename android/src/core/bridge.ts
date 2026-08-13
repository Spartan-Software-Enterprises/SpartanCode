import type { MobileSnapshot } from "./types";
import { readBridgeToken } from "./storage";
import { isConnectionProfile, isMission } from "./types";

export class BridgeError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "BridgeError";
  }
}

export function normalizeBridgeEndpoint(endpoint: string): string {
  const normalized = endpoint.trim().replace(/\/$/, "");
  if (!normalized) throw new BridgeError("Enter an MCP Bridge endpoint");
  const url = new URL(normalized);
  if (
    url.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(url.hostname)
  ) {
    throw new BridgeError(
      "Bridge endpoints must use HTTPS outside local development",
    );
  }
  return normalized;
}

export async function bridgeRequest<T>(
  endpoint: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const normalizedEndpoint = normalizeBridgeEndpoint(endpoint);
  const token = await readBridgeToken(normalizedEndpoint);
  const response = await fetch(`${normalizedEndpoint}${path}`, {
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
  if (
    !Array.isArray(snapshot.missions) ||
    !snapshot.missions.every(isMission) ||
    !Array.isArray(snapshot.connections) ||
    !snapshot.connections.every(isConnectionProfile)
  ) {
    throw new BridgeError("Bridge returned malformed snapshot items");
  }
  return {
    missions: snapshot.missions,
    connections: snapshot.connections,
    pendingApprovals:
      typeof snapshot.pendingApprovals === "number" &&
      Number.isInteger(snapshot.pendingApprovals) &&
      snapshot.pendingApprovals >= 0
        ? snapshot.pendingApprovals
        : 0,
    offline: false,
  };
}
