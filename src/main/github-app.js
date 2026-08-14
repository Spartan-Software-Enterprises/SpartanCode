const crypto = require("crypto");

const API_ORIGIN = "https://api.github.com";
const API_VERSION = "2022-11-28";
const TOKEN_SKEW_MS = 60_000;

function base64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function normalizePrivateKey(value) {
  return typeof value === "string" ? value.replace(/\\n/g, "\n").trim() : "";
}

function readConfig(environment = process.env) {
  const appId = String(environment.SPARTANCODE_GITHUB_APP_ID || "").trim();
  const installationId = String(
    environment.SPARTANCODE_GITHUB_APP_INSTALLATION_ID || "",
  ).trim();
  const privateKey = normalizePrivateKey(
    environment.SPARTANCODE_GITHUB_APP_PRIVATE_KEY,
  );
  const configured = Boolean(appId && installationId && privateKey);
  const valid =
    (!appId || /^[1-9]\d*$/.test(appId)) &&
    (!installationId || /^[1-9]\d*$/.test(installationId)) &&
    (!privateKey ||
      (privateKey.includes("BEGIN") && privateKey.includes("PRIVATE KEY")));
  return { appId, installationId, privateKey, configured, valid };
}

function createAppJwt({ appId, privateKey, now = Date.now() }) {
  if (!/^[1-9]\d*$/.test(String(appId)))
    throw new Error("GitHub App ID is invalid");
  const key = normalizePrivateKey(privateKey);
  if (!key.includes("PRIVATE KEY"))
    throw new Error("GitHub App private key is invalid");
  const issuedAt = Math.floor(now / 1000) - 60;
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      iat: issuedAt,
      exp: issuedAt + nineMinutes(),
      iss: Number(appId),
    }),
  );
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  return `${header}.${payload}.${signer.sign(key, "base64url")}`;
}

function nineMinutes() {
  return 9 * 60;
}

function githubHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": API_VERSION,
    Authorization: `Bearer ${token}`,
    "User-Agent": "SpartanCode-GitHub-App",
  };
}

function verifyGitHubWebhookSignature(payload, signature, secret) {
  if (typeof payload !== "string" && !Buffer.isBuffer(payload)) return false;
  if (
    typeof signature !== "string" ||
    !/^sha256=[a-f0-9]{64}$/i.test(signature)
  )
    return false;
  if (typeof secret !== "string" || !secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  const received = signature.slice("sha256=".length);
  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(received, "hex"),
  );
}

function createGitHubAppClient({
  environment = process.env,
  fetchImpl = fetch,
  now = Date.now,
} = {}) {
  const config = readConfig(environment);
  let cachedToken = null;

  const status = () => ({
    provider: "GitHub App",
    configured: config.configured && config.valid,
    installationConfigured: Boolean(config.installationId),
    appIdConfigured: Boolean(config.appId),
    message: !config.configured
      ? "Optional integration is not configured"
      : !config.valid
        ? "GitHub App configuration is invalid"
        : "Installation access is ready",
    capabilities: {
      repositories: "installation token",
      codespaces: "user authorization required",
    },
  });

  async function installationToken() {
    if (!config.configured || !config.valid) throw new Error(status().message);
    if (cachedToken && cachedToken.expiresAt > now() + TOKEN_SKEW_MS)
      return cachedToken.token;
    const jwt = createAppJwt({
      appId: config.appId,
      privateKey: config.privateKey,
      now: now(),
    });
    const response = await fetchImpl(
      `${API_ORIGIN}/app/installations/${config.installationId}/access_tokens`,
      { method: "POST", headers: githubHeaders(jwt) },
    );
    const body = await response.json().catch(() => ({}));
    if (!response.ok || typeof body.token !== "string" || !body.expires_at) {
      throw new Error(
        `GitHub App installation token request failed (${response.status})`,
      );
    }
    cachedToken = { token: body.token, expiresAt: Date.parse(body.expires_at) };
    return cachedToken.token;
  }

  async function request(path, options = {}) {
    if (typeof path !== "string" || !path.startsWith("/"))
      throw new Error("GitHub API path is invalid");
    const token = await installationToken();
    const response = await fetchImpl(`${API_ORIGIN}${path}`, {
      ...options,
      headers: { ...githubHeaders(token), ...(options.headers || {}) },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(`GitHub API request failed (${response.status})`);
    return body;
  }

  return {
    status,
    listRepositories: async () => {
      const result = await request("/installation/repositories?per_page=100");
      return Array.isArray(result.repositories)
        ? result.repositories.map(
            ({
              id,
              name,
              full_name,
              private: isPrivate,
              html_url,
              default_branch,
            }) => ({
              id,
              name,
              full_name,
              private: isPrivate,
              html_url,
              default_branch,
            }),
          )
        : [];
    },
    request,
  };
}

module.exports = {
  createAppJwt,
  createGitHubAppClient,
  readConfig,
  verifyGitHubWebhookSignature,
};
