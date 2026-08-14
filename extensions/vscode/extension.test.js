const assert = require("node:assert");
const test = require("node:test");
const { bridgeRequestOptions, boundedSelection, snapshotPath } = require("./extension");

test("VS Code bridge requests are authenticated and bounded", () => {
  const request = bridgeRequestOptions("http://127.0.0.1:8787", "/v1/snapshot", "secret");
  assert.equal(request.url.pathname, "/v1/snapshot");
  assert.equal(request.options.headers.Authorization, "Bearer secret");
  assert.throws(() => bridgeRequestOptions("file:///tmp", "/v1/snapshot"), /HTTP/);
});

test("selection and snapshot paths are bounded and workspace-local", () => {
  const document = { getText: () => "x".repeat(25_000) };
  assert.equal(boundedSelection(document, {} ).length, 20_000);
  assert.equal(snapshotPath("/workspace"), "/workspace/.spartancode/vscode-snapshot.json");
});
