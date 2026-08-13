import { normalizeBridgeEndpoint } from "./bridge";

export type PairingResult = {
  endpoint: string;
  token: string;
  scopes: string[];
  expiresAt: string;
};

export function decodePairingPayload(
  payload: string,
  expectedOrigin?: string,
): PairingResult {
  let value: unknown;
  try {
    value = JSON.parse(
      globalThis.atob
        ? globalThis.atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
        : "",
    );
  } catch {
    throw new Error("Pairing payload is malformed");
  }
  if (!value || typeof value !== "object") throw new Error("Pairing payload is malformed");
  const item = value as Record<string, unknown>;
  if (item.version !== 1 || typeof item.origin !== "string" || typeof item.token !== "string")
    throw new Error("Pairing payload is malformed");
  const endpoint = normalizeBridgeEndpoint(item.origin);
  if (expectedOrigin && new URL(endpoint).origin !== new URL(expectedOrigin).origin)
    throw new Error("Pairing payload does not match this bridge");
  if (typeof item.expiresAt !== "string" || Date.parse(item.expiresAt) <= Date.now())
    throw new Error("Pairing payload expired");
  if (!Array.isArray(item.scopes) || item.scopes.some((scope) => typeof scope !== "string"))
    throw new Error("Pairing scopes are invalid");
  return { endpoint, token: item.token, scopes: item.scopes as string[], expiresAt: item.expiresAt };
}
