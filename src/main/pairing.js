const crypto = require("node:crypto");

function createPairingService({ origin, token, ttlMs = 5 * 60 * 1000 } = {}) {
  if (!origin || !token)
    throw new Error("Pairing origin and token are required");
  const pending = new Map();
  return {
    create(scopes = ["snapshot", "missions", "approvals"]) {
      const nonce = crypto.randomBytes(18).toString("base64url");
      const expiresAt = new Date(Date.now() + ttlMs).toISOString();
      pending.set(nonce, { expiresAt, used: false });
      return Buffer.from(
        JSON.stringify({ version: 1, origin, token, scopes, nonce, expiresAt }),
      ).toString("base64url");
    },
    redeem(payload) {
      let value;
      try {
        value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      } catch {
        throw new Error("Pairing payload is malformed");
      }
      const entry = pending.get(value.nonce);
      if (!entry || entry.used)
        throw new Error("Pairing payload was already used");
      if (Date.parse(value.expiresAt) <= Date.now())
        throw new Error("Pairing payload expired");
      if (value.origin !== origin || value.token !== token)
        throw new Error("Pairing payload does not match this bridge");
      if (
        !Array.isArray(value.scopes) ||
        value.scopes.some((scope) => typeof scope !== "string")
      )
        throw new Error("Pairing scopes are invalid");
      entry.used = true;
      return {
        origin,
        token,
        scopes: value.scopes,
        expiresAt: value.expiresAt,
      };
    },
  };
}

module.exports = { createPairingService };
