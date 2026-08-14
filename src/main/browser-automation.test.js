const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateBrowserUrl,
  normalizeRequest,
  createBrowserAutomation,
} = require("./browser-automation");

test("browser URL validation requires an explicit allowlist", () => {
  assert.equal(
    validateBrowserUrl("https://docs.example.com/start", ["example.com"]),
    "https://docs.example.com/start",
  );
  assert.throws(
    () => validateBrowserUrl("https://example.com", []),
    /allowlist/,
  );
  assert.throws(
    () => validateBrowserUrl("https://other.example.net", ["example.com"]),
    /not allowlisted/,
  );
  assert.throws(
    () => validateBrowserUrl("file:///tmp/a", ["example.com"]),
    /HTTP/,
  );
});

test("browser requests are bounded and typed", () => {
  assert.deepEqual(
    normalizeRequest(
      { url: "https://example.com", action: "navigate", timeout: 5000 },
      { SPARTANCODE_BROWSER_ALLOWLIST: "example.com" },
    ),
    {
      url: "https://example.com/",
      action: "navigate",
      timeout: 5000,
      selector: "body",
      allowedHosts: ["example.com"],
    },
  );
  assert.throws(
    () =>
      normalizeRequest(
        { url: "https://example.com", action: "click" },
        { SPARTANCODE_BROWSER_ALLOWLIST: "example.com" },
      ),
    /navigate or extractText/,
  );
});

test("browser adapter reports missing Chromium without exposing secrets", () => {
  const browser = createBrowserAutomation({
    playwright: {},
    environment: { SPARTANCODE_BROWSER_ALLOWLIST: "example.com" },
  });
  assert.equal(browser.status().status, "unavailable");
});

test("browser routing requires explicit Tor configuration and opt-in", () => {
  assert.throws(
    () =>
      normalizeRequest(
        { url: "https://example.com", routeThroughTor: true },
        { SPARTANCODE_BROWSER_ALLOWLIST: "example.com" },
      ),
    /configured SOCKS proxy/,
  );
  const request = normalizeRequest(
    { url: "https://example.com", routeThroughTor: true },
    {
      SPARTANCODE_BROWSER_ALLOWLIST: "example.com",
      SPARTANCODE_TOR_SOCKS_PROXY: "socks5://127.0.0.1:9050",
    },
  );
  assert.equal(request.torProxy, "socks5://127.0.0.1:9050");
});
