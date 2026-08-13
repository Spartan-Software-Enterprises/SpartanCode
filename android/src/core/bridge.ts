import type { MobileSnapshot } from "./types";
import { readBridgeToken } from "./storage";
import {
  isActivity,
  isApproval,
  isArtifact,
  isAuditEvent,
  isConnectionProfile,
  isMission,
} from "./types";

export class BridgeError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "BridgeError";
  }
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    const error = new BridgeError("Bridge request cancelled");
    error.name = "AbortError";
    throw error;
  }
}

function wait(delay: number, signal?: AbortSignal) {
  if (!delay) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, delay);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        const error = new BridgeError("Bridge request cancelled");
        error.name = "AbortError";
        reject(error);
      },
      { once: true },
    );
  });
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
  let response: Response | undefined;
  for (const delay of [0, 250, 750]) {
    throwIfAborted(init.signal ?? undefined);
    if (delay) await wait(delay, init.signal ?? undefined);
    try {
      response = await fetch(`${normalizedEndpoint}${path}`, {
        ...init,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...init.headers,
        },
      });
      if (response.ok || (response.status >= 400 && response.status < 500))
        break;
    } catch (error) {
      if (init.signal?.aborted) throwIfAborted(init.signal);
      void error;
    }
  }
  if (!response) throw new BridgeError("Bridge unavailable", undefined);
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
    syncedAt:
      typeof snapshot.syncedAt === "string" &&
      Number.isFinite(Date.parse(snapshot.syncedAt))
        ? snapshot.syncedAt
        : new Date().toISOString(),
    artifacts:
      Array.isArray(snapshot.artifacts) && snapshot.artifacts.every(isArtifact)
        ? snapshot.artifacts
        : [],
    approvals:
      Array.isArray(snapshot.approvals) && snapshot.approvals.every(isApproval)
        ? snapshot.approvals
        : [],
    activity:
      Array.isArray(snapshot.activity) && snapshot.activity.every(isActivity)
        ? snapshot.activity
        : [],
    auditLog:
      Array.isArray(snapshot.auditLog) && snapshot.auditLog.every(isAuditEvent)
        ? snapshot.auditLog
        : [],
  };
}
