const test = require("node:test");
const assert = require("node:assert/strict");
const { createBridgeServer } = require("./mcp-bridge");
const { createMissionStore } = require("./mission-store");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

test("MCP Bridge accepts only signed GitHub webhooks", async () => {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-github-hook-"),
  );
  const store = createMissionStore(path.join(dir, "state.json"));
  const server = createBridgeServer({
    store,
    githubWebhookSecret: "hook-secret",
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const body = JSON.stringify({
    action: "opened",
    repository: { full_name: "owner/repo" },
    ignored: "not forwarded",
  });
  const endpoint = `http://127.0.0.1:${address.port}/v1/github/webhook`;
  const denied = await fetch(endpoint, {
    method: "POST",
    headers: {
      "x-hub-signature-256": `sha256=${"0".repeat(64)}`,
      "x-github-event": "issues",
    },
    body,
  });
  assert.equal(denied.status, 401);
  const signature = `sha256=${crypto
    .createHmac("sha256", "hook-secret")
    .update(body)
    .digest("hex")}`;
  const accepted = await fetch(endpoint, {
    method: "POST",
    headers: {
      "x-hub-signature-256": signature,
      "x-github-event": "issues",
      "x-github-delivery": "delivery-1",
    },
    body,
  });
  assert.equal(accepted.status, 202);
  assert.deepEqual(await accepted.json(), { accepted: true, event: "issues" });
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(dir, { recursive: true, force: true });
});

test("MCP Bridge exposes bounded authenticated Git operations", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-git-bridge-"));
  const store = createMissionStore(path.join(dir, "state.json"));
  const calls = [];
  const server = createBridgeServer({
    store,
    token: "git-token",
    git: {
      status: async () => "## main\n M file.js",
      diff: async () => "diff --git a/file.js b/file.js",
      stage: async () => {
        calls.push("stage");
        return "staged";
      },
      commit: async (message) => {
        calls.push(`commit:${message}`);
        return "committed";
      },
    },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;
  const headers = { Authorization: "Bearer git-token" };
  assert.equal((await fetch(`${base}/v1/git/status`, { headers })).status, 200);
  assert.equal((await fetch(`${base}/v1/git/diff`, { headers })).status, 200);
  const staged = await fetch(`${base}/v1/git/stage`, {
    method: "POST",
    headers: { ...headers, "Idempotency-Key": "stage-1" },
    body: "{}",
  });
  assert.equal(staged.status, 200);
  const committed = await fetch(`${base}/v1/git/commit`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Update bridge Git support" }),
  });
  assert.equal(committed.status, 200);
  const tooLong = await fetch(`${base}/v1/git/commit`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ message: "x".repeat(73) }),
  });
  assert.equal(tooLong.status, 400);
  assert.deepEqual(calls, ["stage", "commit:Update bridge Git support"]);
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(dir, { recursive: true, force: true });
});

function oidcToken(privateKey, issuer, audience) {
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "RS256", typ: "JWT", kid: "bridge-key" });
  const claims = encode({
    iss: issuer,
    aud: audience,
    sub: "bridge-user",
    scope: "snapshot",
    exp: Math.floor(Date.now() / 1000) + 300,
  });
  const input = `${header}.${claims}`;
  return `${input}.${crypto.sign("RSA-SHA256", Buffer.from(input), privateKey).toString("base64url")}`;
}

test("MCP Bridge serves authenticated snapshots and mission mutations", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-bridge-"));
  const store = createMissionStore(path.join(dir, "state.json"));
  const server = createBridgeServer({ store, token: "test-token" });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;
  const unauthorized = await fetch(`${base}/v1/snapshot`);
  assert.equal(unauthorized.status, 401);
  const created = await fetch(`${base}/v1/missions`, {
    method: "POST",
    headers: {
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ description: "Build a mobile experience" }),
  });
  assert.equal(created.status, 201);
  const snapshot = await fetch(`${base}/v1/snapshot`, {
    headers: { Authorization: "Bearer test-token" },
  });
  const payload = await snapshot.json();
  assert.equal(payload.missions[0].description, "Build a mobile experience");
  assert.ok(payload.syncedAt);
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(dir, { recursive: true, force: true });
});

test("MCP Bridge fails closed without authentication and preserves mission approvals", async () => {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-bridge-auth-"),
  );
  const store = createMissionStore(path.join(dir, "state.json"));
  const unauthenticated = createBridgeServer({ store });
  await new Promise((resolve) =>
    unauthenticated.listen(0, "127.0.0.1", resolve),
  );
  const unauthAddress = unauthenticated.address();
  const denied = await fetch(
    `http://127.0.0.1:${unauthAddress.port}/v1/snapshot`,
  );
  assert.equal(denied.status, 401);
  await new Promise((resolve) => unauthenticated.close(resolve));

  let executions = 0;
  const server = createBridgeServer({
    store,
    token: "approval-token",
    requiresMissionApproval: () => true,
    runMission: () => {
      executions += 1;
    },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/v1/missions`, {
    method: "POST",
    headers: {
      Authorization: "Bearer approval-token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ description: "publish the release" }),
  });
  const payload = await response.json();
  assert.equal(response.status, 202);
  assert.equal(payload.mission.status, "awaiting_approval");
  assert.ok(payload.approval.id);
  assert.equal(executions, 0);
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(dir, { recursive: true, force: true });
});

test("MCP Bridge replays authenticated SSE events from a cursor", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-events-"));
  const store = createMissionStore(path.join(dir, "state.json"));
  const server = createBridgeServer({ store, token: "event-token" });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;
  server.events.publish("mission.updated", {
    missionId: "m1",
    status: "planning",
  });
  const response = await fetch(`${base}/v1/events`, {
    headers: { Authorization: "Bearer event-token", "Last-Event-ID": "0" },
  });
  assert.equal(response.status, 200);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let chunk = "";
  for (let index = 0; index < 3 && !chunk.includes("mission.updated"); index++)
    chunk += decoder.decode((await reader.read()).value);
  assert.match(chunk, /mission\.updated/);
  await reader.cancel();
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(dir, { recursive: true, force: true });
});

test("MCP Bridge deduplicates retried mutations by idempotency key", async () => {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-idempotency-"),
  );
  const store = createMissionStore(path.join(dir, "state.json"));
  let executions = 0;
  const server = createBridgeServer({
    store,
    token: "idempotency-token",
    runMission: () => {
      executions += 1;
    },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;
  const init = {
    method: "POST",
    headers: {
      Authorization: "Bearer idempotency-token",
      "Content-Type": "application/json",
      "Idempotency-Key": "mission:retry-1",
    },
    body: JSON.stringify({ description: "Only once" }),
  };
  const first = await fetch(`${base}/v1/missions`, init);
  const firstBody = await first.json();
  const second = await fetch(`${base}/v1/missions`, init);
  const secondBody = await second.json();
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.deepEqual(secondBody, firstBody);
  assert.equal(store.snapshot().missions.length, 1);
  assert.equal(executions, 1);
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(dir, { recursive: true, force: true });
});

test("MCP Bridge syncs collaboration sessions and returns revision conflicts", async () => {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-collab-bridge-"),
  );
  const store = createMissionStore(path.join(dir, "state.json"));
  const server = createBridgeServer({ store, token: "collab-token" });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;
  const headers = {
    Authorization: "Bearer collab-token",
    "Content-Type": "application/json",
  };
  const created = await fetch(`${base}/v1/collaboration/sessions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      id: "session-1",
      name: "Roadmap",
      ownerId: "owner",
    }),
  });
  assert.equal(created.status, 201);
  const joined = await fetch(
    `${base}/v1/collaboration/sessions/session-1/participants`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ participantId: "builder" }),
    },
  );
  assert.equal(joined.status, 200);
  const appended = await fetch(
    `${base}/v1/collaboration/sessions/session-1/events`,
    {
      method: "POST",
      headers: { ...headers, "Idempotency-Key": "collab:event-1" },
      body: JSON.stringify({
        eventId: "event-1",
        authorId: "builder",
        type: "mission.created",
        payload: { missionId: "mission-1" },
        baseRevision: 0,
      }),
    },
  );
  assert.equal(appended.status, 200);
  const conflict = await fetch(
    `${base}/v1/collaboration/sessions/session-1/events`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        eventId: "event-2",
        authorId: "owner",
        type: "mission.updated",
        payload: { status: "building" },
        baseRevision: 0,
      }),
    },
  );
  assert.equal(conflict.status, 409);
  const sessions = await fetch(`${base}/v1/collaboration/sessions`, {
    headers: { Authorization: "Bearer collab-token" },
  });
  assert.equal((await sessions.json()).sessions[0].revision, 1);
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(dir, { recursive: true, force: true });
});

test("MCP Bridge exposes redacted integrity-checked audit exports", async () => {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-audit-export-"),
  );
  const store = createMissionStore(path.join(dir, "state.json"));
  store.addActivity({ action: "test", apiKey: "hidden" });
  const server = createBridgeServer({ store, token: "audit-token" });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const response = await fetch(
    `http://127.0.0.1:${address.port}/v1/audit/export`,
    {
      headers: { Authorization: "Bearer audit-token" },
    },
  );
  const bundle = await response.json();
  assert.equal(response.status, 200);
  assert.equal(bundle.schemaVersion, 1);
  assert.equal(bundle.eventCount, bundle.events.length);
  assert.ok(bundle.sha256);
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(dir, { recursive: true, force: true });
});

test("MCP Bridge enforces opt-in least-privilege token scopes", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-scopes-"));
  const store = createMissionStore(path.join(dir, "state.json"));
  const server = createBridgeServer({
    store,
    token: "read-token",
    tokenScopes: { "read-token": ["snapshot"] },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;
  const read = await fetch(`${base}/v1/snapshot`, {
    headers: { Authorization: "Bearer read-token" },
  });
  assert.equal(read.status, 200);
  const write = await fetch(`${base}/v1/missions`, {
    method: "POST",
    headers: {
      Authorization: "Bearer read-token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ description: "Must be denied" }),
  });
  assert.equal(write.status, 403);
  assert.match((await write.json()).error, /missions:write/);
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(dir, { recursive: true, force: true });
});

test("MCP Bridge accepts configured OIDC scopes and denies missing scopes", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spartancode-oidc-"));
  const store = createMissionStore(path.join(dir, "state.json"));
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const issuer = "https://issuer.example";
  const server = createBridgeServer({
    store,
    oidc: {
      issuer,
      audience: "spartancode",
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({
          keys: [
            {
              ...publicKey.export({ format: "jwk" }),
              kid: "bridge-key",
              alg: "RS256",
            },
          ],
        }),
      }),
      jwksUri: "https://issuer.example/keys",
    },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const authorization = `Bearer ${oidcToken(privateKey, issuer, "spartancode")}`;
  const read = await fetch(`http://127.0.0.1:${address.port}/v1/snapshot`, {
    headers: { Authorization: authorization },
  });
  assert.equal(read.status, 200);
  const write = await fetch(`http://127.0.0.1:${address.port}/v1/missions`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ description: "OIDC cannot write without scope" }),
  });
  assert.equal(write.status, 403);
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(dir, { recursive: true, force: true });
});
