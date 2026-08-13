const test = require("node:test");
const assert = require("node:assert/strict");
const { createBridgeServer } = require("./mcp-bridge");
const { createMissionStore } = require("./mission-store");
const fs = require("fs");
const os = require("os");
const path = require("path");

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
