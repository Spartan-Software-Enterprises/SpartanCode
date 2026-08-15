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

function validateCodespaceInput(input = {}) {
  const repositoryId = Number(input.repositoryId);
  const safeRef =
    input.ref === undefined ||
    (typeof input.ref === "string" &&
      input.ref.length <= 255 &&
      !/[\u0000-\u001f\u007f]/.test(input.ref));
  const safeMachine =
    input.machine === undefined ||
    (typeof input.machine === "string" &&
      /^[A-Za-z0-9._-]{1,80}$/.test(input.machine));
  const safeLocation =
    input.location === undefined ||
    (typeof input.location === "string" &&
      /^[A-Za-z0-9._-]{1,80}$/.test(input.location));
  return {
    valid:
      Number.isSafeInteger(repositoryId) &&
      repositoryId > 0 &&
      safeRef &&
      safeMachine &&
      safeLocation,
    repositoryId,
  };
}

function estimateCodespaceCost({
  hours = 0,
  hourlyRate = 0,
  storageGb = 0,
  storageRate = 0,
} = {}) {
  const values = [hours, hourlyRate, storageGb, storageRate].map(Number);
  if (
    values.some(
      (value) => !Number.isFinite(value) || value < 0 || value > 1_000_000,
    )
  )
    throw new Error("Codespaces cost inputs are invalid or exceed limits");
  const compute = values[0] * values[1];
  const storage = values[2] * values[3];
  return {
    compute: Math.round(compute * 100) / 100,
    storage: Math.round(storage * 100) / 100,
    total: Math.round((compute + storage) * 100) / 100,
    currency: "USD",
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
  let currentEnvironment = environment;
  let config = readConfig(currentEnvironment);
  let cachedToken = null;

  const refresh = (nextEnvironment = currentEnvironment) => {
    currentEnvironment = nextEnvironment;
    config = readConfig(currentEnvironment);
    cachedToken = null;
    return status();
  };

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
    const expiresAt = Date.parse(body.expires_at);
    if (
      !response.ok ||
      typeof body.token !== "string" ||
      !body.expires_at ||
      !Number.isFinite(expiresAt)
    ) {
      throw new Error(
        `GitHub App installation token request failed (${response.status})`,
      );
    }
    cachedToken = { token: body.token, expiresAt };
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

  function createUserAuthorizedCodespacesClient({
    tokenProvider,
    userFetchImpl = fetchImpl,
  } = {}) {
    if (typeof tokenProvider !== "function")
      throw new Error("A user-authorized GitHub token provider is required");
    async function userRequest(path, options = {}) {
      if (typeof path !== "string" || !path.startsWith("/"))
        throw new Error("GitHub API path is invalid");
      const token = await tokenProvider();
      if (typeof token !== "string" || token.trim().length < 10)
        throw new Error("A valid user-authorized GitHub token is required");
      const response = await userFetchImpl(`${API_ORIGIN}${path}`, {
        ...options,
        headers: { ...githubHeaders(token.trim()), ...(options.headers || {}) },
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          `GitHub Codespaces request failed (${response.status})`,
        );
      return body;
    }
    return {
      list: async () => {
        const result = await userRequest("/user/codespaces?per_page=100");
        return Array.isArray(result.codespaces)
          ? result.codespaces.map(
              ({
                name,
                display_name,
                state,
                repository,
                machine,
                location,
              }) => ({
                name,
                display_name,
                state,
                repository: repository?.full_name || null,
                machine: machine?.name || null,
                location: location || null,
              }),
            )
          : [];
      },
      create: async (input) => {
        const validation = validateCodespaceInput(input);
        if (!validation.valid)
          throw new Error("Invalid Codespaces creation request");
        const body = {
          repository_id: validation.repositoryId,
          ...(input.ref === undefined ? {} : { ref: input.ref }),
          ...(input.machine === undefined ? {} : { machine: input.machine }),
          ...(input.location === undefined ? {} : { location: input.location }),
        };
        return userRequest("/user/codespaces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      },
      start: (name) =>
        userRequest(
          `/user/codespaces/${encodeURIComponent(String(name))}/start`,
          { method: "POST" },
        ),
      stop: (name) =>
        userRequest(
          `/user/codespaces/${encodeURIComponent(String(name))}/stop`,
          { method: "POST" },
        ),
      delete: (name) =>
        userRequest(`/user/codespaces/${encodeURIComponent(String(name))}`, {
          method: "DELETE",
        }),
    };
  }

  return {
    status,
    refresh,
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
    createUserAuthorizedCodespacesClient,
  };
}

module.exports = {
  createAppJwt,
  createGitHubAppClient,
  estimateCodespaceCost,
  readConfig,
  verifyGitHubWebhookSignature,
  validateCodespaceInput,
};
