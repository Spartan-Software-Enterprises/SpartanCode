const { execFileSync } = require("node:child_process");

function findExecutable(name, runner = execFileSync) {
  try {
    return (
      runner("which", [name], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim() || null
    );
  } catch {
    return null;
  }
}

function createPrivacyNetwork({
  environment = process.env,
  executableFinder = findExecutable,
} = {}) {
  return {
    status() {
      const torProxy = String(
        environment.SPARTANCODE_TOR_SOCKS_PROXY || "",
      ).trim();
      const torExecutable = executableFinder("tor");
      const protonConfigured = Boolean(
        environment.SPARTANCODE_PROTON_API_BASE || environment.PROTON_API_BASE,
      );
      return {
        tor: {
          status: torProxy || torExecutable ? "configured" : "unavailable",
          proxy: torProxy || null,
          executable: torExecutable,
        },
        proton: {
          status: protonConfigured ? "configured" : "unavailable",
          apiBase: protonConfigured ? "configured" : null,
        },
        routing: torProxy
          ? "explicit proxy configured; not applied automatically"
          : "direct",
      };
    },
    configure(request = {}) {
      if (!request || typeof request !== "object")
        throw new Error("Privacy configuration is required");
      if (request.routeThroughTor === true)
        return {
          ok: false,
          code: "explicit-routing-required",
          message:
            "Tor routing must be configured by the user or system network layer; SpartanCode never silently reroutes traffic",
        };
      return { ok: true, routing: "direct" };
    },
  };
}

module.exports = { findExecutable, createPrivacyNetwork };
