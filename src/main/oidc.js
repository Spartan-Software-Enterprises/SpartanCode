const crypto = require("node:crypto");

const base64UrlJson = (value, label) => {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    throw new Error(`Invalid JWT ${label}`);
  }
};

function parseBearerToken(value) {
  if (typeof value !== "string" || !value.startsWith("Bearer ")) return null;
  const token = value.slice("Bearer ".length).trim();
  return token || null;
}

function issuerUrl(value) {
  if (typeof value !== "string" || !value)
    throw new Error("OIDC issuer is required");
  const url = new URL(value);
  if (
    url.protocol !== "https:" &&
    !["localhost", "127.0.0.1", "::1"].includes(url.hostname)
  )
    throw new Error("OIDC issuer must use HTTPS outside loopback development");
  return url;
}

function audienceMatches(claim, expected) {
  return Array.isArray(claim) ? claim.includes(expected) : claim === expected;
}

function scopesFromClaims(claims) {
  const values = [];
  if (typeof claims.scope === "string")
    values.push(...claims.scope.split(/\s+/));
  if (Array.isArray(claims.scp)) values.push(...claims.scp);
  return [
    ...new Set(values.filter((scope) => typeof scope === "string" && scope)),
  ];
}

function createOidcAuthenticator({
  issuer,
  audience,
  jwksUri = null,
  fetchImpl = globalThis.fetch,
  clock = () => Date.now(),
  cacheTtlMs = 5 * 60 * 1000,
  clockSkewSec = 60,
} = {}) {
  const issuerValue = issuerUrl(issuer).toString().replace(/\/$/, "");
  if (typeof audience !== "string" || !audience)
    throw new Error("OIDC audience is required");
  if (typeof fetchImpl !== "function")
    throw new Error("OIDC fetch implementation is required");
  let keyCache = null;
  let keyCacheExpires = 0;
  let discoveryPromise = null;

  const fetchJson = async (url) => {
    const response = await fetchImpl(url, {
      headers: { Accept: "application/json" },
    });
    if (!response || !response.ok)
      throw new Error(
        `OIDC metadata request failed: ${response?.status || "unknown"}`,
      );
    return response.json();
  };

  const getJwksUri = async () => {
    if (jwksUri) return jwksUri;
    if (!discoveryPromise) {
      discoveryPromise = fetchJson(
        `${issuerValue}/.well-known/openid-configuration`,
      ).then((metadata) => {
        if (
          metadata.issuer &&
          metadata.issuer.replace(/\/$/, "") !== issuerValue
        )
          throw new Error("OIDC discovery issuer mismatch");
        if (typeof metadata.jwks_uri !== "string" || !metadata.jwks_uri)
          throw new Error("OIDC discovery did not provide jwks_uri");
        return metadata.jwks_uri;
      });
    }
    return discoveryPromise;
  };

  const getKeys = async () => {
    if (keyCache && keyCacheExpires > clock()) return keyCache;
    const metadata = await fetchJson(await getJwksUri());
    if (!Array.isArray(metadata.keys))
      throw new Error("OIDC JWKS keys are missing");
    keyCache = metadata.keys;
    keyCacheExpires = clock() + cacheTtlMs;
    return keyCache;
  };

  const verify = async (token) => {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Malformed OIDC token");
    const header = base64UrlJson(parts[0], "header");
    const claims = base64UrlJson(parts[1], "claims");
    if (header.alg !== "RS256" || typeof header.kid !== "string" || !header.kid)
      throw new Error("OIDC token must use RS256 with a key id");
    const key = (await getKeys()).find(
      (candidate) =>
        candidate.kid === header.kid &&
        candidate.kty === "RSA" &&
        candidate.alg === "RS256",
    );
    if (!key) throw new Error("OIDC signing key is unavailable");
    const valid = crypto.verify(
      "RSA-SHA256",
      Buffer.from(`${parts[0]}.${parts[1]}`),
      crypto.createPublicKey({ key, format: "jwk" }),
      Buffer.from(parts[2], "base64url"),
    );
    if (!valid) throw new Error("OIDC token signature is invalid");
    if (claims.iss !== issuerValue)
      throw new Error("OIDC issuer claim mismatch");
    if (!audienceMatches(claims.aud, audience))
      throw new Error("OIDC audience claim mismatch");
    const now = Math.floor(clock() / 1000);
    if (typeof claims.exp !== "number" || claims.exp <= now - clockSkewSec)
      throw new Error("OIDC token is expired");
    if (
      claims.nbf !== undefined &&
      (typeof claims.nbf !== "number" || claims.nbf > now + clockSkewSec)
    )
      throw new Error("OIDC token is not active");
    return {
      subject: claims.sub || null,
      claims,
      scopes: scopesFromClaims(claims),
    };
  };

  return {
    async authenticate(authorization) {
      const token = parseBearerToken(authorization);
      if (!token) return { authenticated: false, scopes: [] };
      try {
        return { authenticated: true, ...(await verify(token)) };
      } catch {
        return { authenticated: false, scopes: [] };
      }
    },
    clearKeyCache() {
      keyCache = null;
      keyCacheExpires = 0;
    },
  };
}

module.exports = {
  createOidcAuthenticator,
  parseBearerToken,
  scopesFromClaims,
};
