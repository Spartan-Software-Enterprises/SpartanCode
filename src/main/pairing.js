const crypto = require("node:crypto");

function createPairingService({ origin, token, ttlMs = 5 * 60 * 1000 } = {}) {
  if (!origin || !token)
    throw new Error("Pairing origin and token are required");
  const pending = new Map();
  const sameToken = (left, right) => {
    if (typeof left !== "string" || typeof right !== "string") return false;
    const a = Buffer.from(left);
    const b = Buffer.from(right);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  };
  function pruneExpired() {
    const now = Date.now();
    for (const [nonce, entry] of pending) {
      if (entry.used || entry.expiresAt <= now) pending.delete(nonce);
    }
  }
  return {
    create(scopes = ["snapshot", "missions", "approvals"]) {
      pruneExpired();
      if (
        !Array.isArray(scopes) ||
        scopes.length === 0 ||
        scopes.some((scope) => typeof scope !== "string" || scope.length === 0)
      )
        throw new Error("Pairing scopes are invalid");
      const nonce = crypto.randomBytes(18).toString("base64url");
      const expiresAt = Date.now() + ttlMs;
      pending.set(nonce, { expiresAt, scopes: [...scopes], used: false });
      return Buffer.from(
        JSON.stringify({
          version: 1,
          origin,
          token,
          scopes,
          nonce,
          expiresAt: new Date(expiresAt).toISOString(),
        }),
      ).toString("base64url");
    },
    redeem(payload) {
      pruneExpired();
      let value;
      try {
        value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      } catch {
        throw new Error("Pairing payload is malformed");
      }
      const entry = pending.get(value.nonce);
      if (!entry || entry.used)
        throw new Error("Pairing payload was already used");
      if (entry.expiresAt <= Date.now())
        throw new Error("Pairing payload expired");
      if (value.origin !== origin || !sameToken(value.token, token))
        throw new Error("Pairing payload does not match this bridge");
      entry.used = true;
      return {
        origin,
        token,
        scopes: [...entry.scopes],
        expiresAt: new Date(entry.expiresAt).toISOString(),
      };
    },
  };
}

module.exports = { createPairingService };
