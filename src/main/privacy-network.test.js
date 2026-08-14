const test = require("node:test");
const assert = require("node:assert/strict");
const { createPrivacyNetwork } = require("./privacy-network");

test("privacy adapter reports explicit Tor and Proton configuration without secrets", () => {
  const privacy = createPrivacyNetwork({
    environment: {
      SPARTANCODE_TOR_SOCKS_PROXY: "socks5://127.0.0.1:9050",
      SPARTANCODE_PROTON_API_BASE: "https://api.proton.example",
    },
    executableFinder: () => null,
  });
  const status = privacy.status();
  assert.equal(status.tor.status, "configured");
  assert.equal(status.proton.status, "configured");
  assert.equal(
    status.routing,
    "explicit proxy configured; not applied automatically",
  );
  assert.equal("token" in status.proton, false);
});

test("privacy adapter refuses silent Tor routing", () => {
  const privacy = createPrivacyNetwork({
    environment: {},
    executableFinder: () => null,
  });
  assert.equal(
    privacy.configure({ routeThroughTor: true }).code,
    "explicit-routing-required",
  );
});
