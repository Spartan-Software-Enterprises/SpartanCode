const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createMissionStore } = require("./mission-store");
const { createBridgeServer } = require("./mcp-bridge");
const {
  gitAddAt,
  gitCommitAt,
  gitDiffAt,
  gitInitAt,
  gitStatusAt,
} = require("./git");

const scopes = [
  "git:read",
  "git:write",
  "artifacts:write",
  "collaboration:read",
  "collaboration:write",
];

async function fixture() {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-bridge-integration-"),
  );
  const workspace = path.join(directory, "workspace");
  fs.mkdirSync(workspace);
  fs.writeFileSync(path.join(workspace, "README.md"), "base\n");
  await gitInitAt(workspace);
  execFileSync("git", ["config", "user.name", "SpartanCode Test"], {
    cwd: workspace,
  });
  execFileSync("git", ["config", "user.email", "test@spartancode.invalid"], {
    cwd: workspace,
  });
  await gitAddAt(workspace);
  await gitCommitAt(workspace, "Initial fixture");
  fs.writeFileSync(path.join(workspace, "README.md"), "changed\n");
  const store = createMissionStore(path.join(directory, "state.json"));
  const server = createBridgeServer({
    store,
    tokens: { "client-a": scopes, "client-b": scopes },
    git: {
      status: () => gitStatusAt(workspace),
      diff: () => gitDiffAt(workspace),
      stage: () => gitAddAt(workspace),
      commit: (message) => gitCommitAt(workspace, message),
    },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    directory,
    server,
    client:
      (token) =>
      async (route, options = {}) => {
        const headers = {
          Authorization: `Bearer ${token}`,
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...(options.headers || {}),
        };
        const response = await fetch(`${base}${route}`, {
          ...options,
          headers,
          body:
            options.body && typeof options.body !== "string"
              ? JSON.stringify(options.body)
              : options.body,
        });
        return { response, body: await response.json() };
      },
  };
}

async function close(fixtureValue) {
  await new Promise((resolve) => fixtureValue.server.close(resolve));
  fs.rmSync(fixtureValue.directory, { recursive: true, force: true });
}

test("two authenticated clients share a loopback Git bridge and deduplicate retries", async () => {
  const bridge = await fixture();
  try {
    const clientA = bridge.client("client-a");
    const clientB = bridge.client("client-b");
    assert.equal((await clientA("/v1/git/status")).response.status, 200);
    assert.equal((await clientA("/v1/git/diff")).response.status, 200);
    const staged = await clientA("/v1/git/stage", {
      method: "POST",
      headers: { "Idempotency-Key": "stage-1" },
      body: {},
    });
    assert.equal(staged.response.status, 200);
    const first = await clientA("/v1/git/commit", {
      method: "POST",
      headers: { "Idempotency-Key": "commit-1" },
      body: { message: "Update bridge fixture" },
    });
    const retry = await clientA("/v1/git/commit", {
      method: "POST",
      headers: { "Idempotency-Key": "commit-1" },
      body: { message: "Update bridge fixture" },
    });
    assert.deepEqual(retry.body, first.body);
    assert.equal(
      (await clientB("/v1/git/status")).body.output.includes(
        "nothing to commit",
      ),
      false,
    );
  } finally {
    await close(bridge);
  }
});

test("two authenticated clients receive bounded artifact conflicts through the bridge", async () => {
  const bridge = await fixture();
  try {
    const clientA = bridge.client("client-a");
    const payload = {
      base: [{ id: "artifact-1", content: "base" }],
      local: [{ id: "artifact-1", content: "client-a" }],
      remote: [{ id: "artifact-1", content: "client-b" }],
    };
    const result = await clientA("/v1/artifacts/sync", {
      method: "POST",
      headers: { "Idempotency-Key": "sync-1" },
      body: payload,
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.requiresReview, true);
    assert.equal(result.body.conflicts[0].base.content, "base");
    assert.equal(result.body.conflicts[0].local.content, "client-a");
    assert.equal(result.body.conflicts[0].remote.content, "client-b");
  } finally {
    await close(bridge);
  }
});

test("two authenticated clients resolve collaboration revision conflicts and retries", async () => {
  const bridge = await fixture();
  try {
    const clientA = bridge.client("client-a");
    const clientB = bridge.client("client-b");
    const created = await clientA("/v1/collaboration/sessions", {
      method: "POST",
      body: { name: "Bridge test", ownerId: "client-a" },
    });
    const sessionId = created.body.session.id;
    await clientB(`/v1/collaboration/sessions/${sessionId}/participants`, {
      method: "POST",
      body: { participantId: "client-b" },
    });
    await clientA(`/v1/collaboration/sessions/${sessionId}/events`, {
      method: "POST",
      body: {
        eventId: "event-a",
        authorId: "client-a",
        type: "note",
        payload: { text: "a" },
        baseRevision: 0,
      },
    });
    const stale = await clientB(
      `/v1/collaboration/sessions/${sessionId}/events`,
      {
        method: "POST",
        body: {
          eventId: "event-b",
          authorId: "client-b",
          type: "note",
          payload: { text: "b" },
          baseRevision: 0,
        },
      },
    );
    assert.equal(stale.response.status, 409);
    const accepted = await clientB(
      `/v1/collaboration/sessions/${sessionId}/events`,
      {
        method: "POST",
        headers: { "Idempotency-Key": "event-b" },
        body: {
          eventId: "event-b",
          authorId: "client-b",
          type: "note",
          payload: { text: "b" },
          baseRevision: stale.body.session.revision,
        },
      },
    );
    const retry = await clientB(
      `/v1/collaboration/sessions/${sessionId}/events`,
      {
        method: "POST",
        headers: { "Idempotency-Key": "event-b" },
        body: {
          eventId: "event-b",
          authorId: "client-b",
          type: "note",
          payload: { text: "b" },
          baseRevision: 1,
        },
      },
    );
    assert.equal(accepted.body.session.revision, 2);
    assert.deepEqual(retry.body, accepted.body);
    const listed = await clientA("/v1/collaboration/sessions", {
      method: "GET",
    });
    assert.equal(listed.body.sessions[0].events.length, 2);
  } finally {
    await close(bridge);
  }
});
