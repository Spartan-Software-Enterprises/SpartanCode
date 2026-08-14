const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const test = require("node:test");
const {
  createAppJwt,
  createGitHubAppClient,
  estimateCodespaceCost,
  readConfig,
  validateCodespaceInput,
  verifyGitHubWebhookSignature,
} = require("./github-app");

test("GitHub App config is redacted and optional", () => {
  const config = readConfig({ SPARTANCODE_GITHUB_APP_PRIVATE_KEY: "secret" });
  assert.equal(config.configured, false);
  assert.equal(config.privateKey, "secret");
  const status = createGitHubAppClient({ environment: {} }).status();
  assert.equal(status.configured, false);
  assert.equal(JSON.stringify(status).includes("PRIVATE"), false);
});

test("GitHub App JWT is RS256 and time-bounded", () => {
  const pair = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const privateKey = pair.privateKey.export({ type: "pkcs8", format: "pem" });
  const jwt = createAppJwt({ appId: "42", privateKey, now: 1_700_000_000_000 });
  const [encodedHeader, encodedPayload, signature] = jwt.split(".");
  const payload = JSON.parse(
    Buffer.from(encodedPayload, "base64url").toString(),
  );
  assert.equal(
    JSON.parse(Buffer.from(encodedHeader, "base64url").toString()).alg,
    "RS256",
  );
  assert.equal(payload.iss, 42);
  assert.equal(payload.exp - payload.iat, 540);
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  assert.equal(verifier.verify(pair.publicKey, signature, "base64url"), true);
});

test("GitHub App client caches installation tokens and projects repository metadata", async () => {
  const pair = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const privateKey = pair.privateKey.export({ type: "pkcs8", format: "pem" });
  let calls = 0;
  const fetchImpl = async (url) => {
    calls += 1;
    if (url.includes("access_tokens"))
      return {
        ok: true,
        status: 201,
        json: async () => ({
          token: "installation-secret",
          expires_at: "2099-01-01T00:00:00Z",
        }),
      };
    return {
      ok: true,
      status: 200,
      json: async () => ({
        repositories: [
          {
            id: 7,
            name: "SpartanCode",
            full_name: "Spartan-Software-Enterprises/SpartanCode",
            private: false,
            html_url:
              "https://github.com/Spartan-Software-Enterprises/SpartanCode",
            default_branch: "main",
            ignored: "not exposed",
          },
        ],
      }),
    };
  };
  const client = createGitHubAppClient({
    environment: {
      SPARTANCODE_GITHUB_APP_ID: "42",
      SPARTANCODE_GITHUB_APP_INSTALLATION_ID: "9",
      SPARTANCODE_GITHUB_APP_PRIVATE_KEY: privateKey,
    },
    fetchImpl,
    now: () => 1_700_000_000_000,
  });
  assert.deepEqual(await client.listRepositories(), [
    {
      id: 7,
      name: "SpartanCode",
      full_name: "Spartan-Software-Enterprises/SpartanCode",
      private: false,
      html_url: "https://github.com/Spartan-Software-Enterprises/SpartanCode",
      default_branch: "main",
    },
  ]);
  await client.listRepositories();
  assert.equal(calls, 3);
});

test("GitHub webhook signatures are verified with timing-safe comparison", () => {
  const payload = JSON.stringify({ action: "opened" });
  const secret = "webhook-secret";
  const digest = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  assert.equal(
    verifyGitHubWebhookSignature(payload, `sha256=${digest}`, secret),
    true,
  );
  assert.equal(
    verifyGitHubWebhookSignature(payload, `sha256=${"0".repeat(64)}`, secret),
    false,
  );
  assert.equal(verifyGitHubWebhookSignature(payload, digest, secret), false);
});

test("Codespaces client uses user authorization for lifecycle operations", async () => {
  const calls = [];
  const client = createGitHubAppClient({
    environment: {},
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        json: async () =>
          url.endsWith("/codespaces?per_page=100")
            ? {
                codespaces: [
                  {
                    name: "spartan-dev",
                    display_name: "Spartan Dev",
                    state: "Available",
                    repository: { full_name: "org/repo" },
                    machine: { name: "basicLinux32gb" },
                    location: "EastUs",
                  },
                ],
              }
            : { name: "spartan-dev", state: "Starting" },
      };
    },
  });
  const codespaces = client.createUserAuthorizedCodespacesClient({
    tokenProvider: async () => "user-authorized-token",
  });
  assert.deepEqual(await codespaces.list(), [
    {
      name: "spartan-dev",
      display_name: "Spartan Dev",
      state: "Available",
      repository: "org/repo",
      machine: "basicLinux32gb",
      location: "EastUs",
    },
  ]);
  await codespaces.create({
    repositoryId: 42,
    ref: "main",
    machine: "basicLinux32gb",
  });
  await codespaces.start("spartan-dev");
  await codespaces.stop("spartan-dev");
  assert.equal(calls[1].options.method, "POST");
  assert.equal(
    calls[1].options.headers.Authorization,
    "Bearer user-authorized-token",
  );
  assert.match(calls[1].options.body, /repository_id/);
  assert.equal(validateCodespaceInput({ repositoryId: 0 }).valid, false);
  assert.equal(
    validateCodespaceInput({ repositoryId: 42, ref: "main" }).valid,
    true,
  );
});

test("Codespaces cost estimates are bounded and explicit", () => {
  assert.deepEqual(
    estimateCodespaceCost({
      hours: 10,
      hourlyRate: 0.18,
      storageGb: 5,
      storageRate: 0.07,
    }),
    { compute: 1.8, storage: 0.35, total: 2.15, currency: "USD" },
  );
  assert.throws(() => estimateCodespaceCost({ hours: -1 }), /invalid/);
});
