const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizePreviewUrl } = require("./preview-window");

test("preview URLs accept local HTTP development servers", () => {
  assert.equal(
    normalizePreviewUrl("http://localhost:5173/dashboard"),
    "http://localhost:5173/dashboard",
  );
  assert.equal(
    normalizePreviewUrl("https://127.0.0.1:8443/"),
    "https://127.0.0.1:8443/",
  );
});

test("preview URLs reject non-local or non-HTTP destinations", () => {
  assert.throws(() => normalizePreviewUrl("file:///tmp/index.html"), /HTTP/);
  assert.throws(
    () => normalizePreviewUrl("https://example.com"),
    /local development/,
  );
  assert.throws(
    () => normalizePreviewUrl("javascript:alert(1)"),
    /HTTP or HTTPS/,
  );
});
