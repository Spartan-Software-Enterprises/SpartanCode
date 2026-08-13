const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { createOidcAuthenticator } = require("./oidc");

function signedToken({
  privateKey,
  issuer,
  audience,
  now,
  scope = "snapshot",
}) {
  const publicJwk = crypto
    .createPublicKey(privateKey)
    .export({ format: "jwk" });
  const header = { alg: "RS256", typ: "JWT", kid: "test-key" };
  const claims = {
    iss: issuer,
    aud: audience,
    sub: "user-1",
    scope,
    iat: now,
    exp: now + 300,
  };
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const input = `${encode(header)}.${encode(claims)}`;
  const signature = crypto
    .sign("RSA-SHA256", Buffer.from(input), privateKey)
    .toString("base64url");
  return {
    token: `${input}.${signature}`,
    publicJwk: { ...publicJwk, alg: "RS256", kid: "test-key" },
  };
}

test("OIDC authenticator verifies a scoped RS256 token and caches JWKS", async () => {
  const { privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const now = 1_700_000_000;
  const issuer = "https://issuer.example";
  const { token, publicJwk } = signedToken({
    privateKey,
    issuer,
    audience: "spartancode",
    now,
  });
  let requests = 0;
  const auth = createOidcAuthenticator({
    issuer,
    audience: "spartancode",
    clock: () => now * 1000,
    fetchImpl: async (url) => {
      requests += 1;
      if (url === "https://issuer.example/keys")
        return { ok: true, json: async () => ({ keys: [publicJwk] }) };
      assert.equal(url, `${issuer}/.well-known/openid-configuration`);
      return {
        ok: true,
        json: async () => ({
          issuer,
          jwks_uri: "https://issuer.example/keys",
          keys: [publicJwk],
        }),
      };
    },
  });
  const first = await auth.authenticate(`Bearer ${token}`);
  const second = await auth.authenticate(`Bearer ${token}`);
  assert.equal(first.authenticated, true);
  assert.deepEqual(first.scopes, ["snapshot"]);
  assert.equal(first.subject, "user-1");
  assert.equal(second.authenticated, true);
  assert.equal(requests, 2);
});

test("OIDC authenticator rejects invalid audience, expiry, and malformed credentials", async () => {
  const { privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const issuer = "https://issuer.example";
  const { token, publicJwk } = signedToken({
    privateKey,
    issuer,
    audience: "other",
    now: 1_700_000_000,
  });
  const auth = createOidcAuthenticator({
    issuer,
    audience: "spartancode",
    clock: () => 1_700_000_400_000,
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ keys: [publicJwk] }),
    }),
    jwksUri: "https://issuer.example/keys",
  });
  assert.deepEqual(await auth.authenticate(`Bearer ${token}`), {
    authenticated: false,
    scopes: [],
  });
  assert.deepEqual(await auth.authenticate("Bearer not-a-jwt"), {
    authenticated: false,
    scopes: [],
  });
  assert.deepEqual(await auth.authenticate("Basic abc"), {
    authenticated: false,
    scopes: [],
  });
});
