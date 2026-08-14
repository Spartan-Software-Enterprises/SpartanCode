const ALLOWED_PATHS = new Set(["/api/core/v4/users", "/api/mail/v4/messages"]);
const MAX_RESPONSE_BYTES = 200_000;

function createProtonAdapter({
  environment = process.env,
  secureVault,
  fetchImpl = globalThis.fetch,
} = {}) {
  function baseUrl() {
    const value = String(
      environment.SPARTANCODE_PROTON_API_BASE ||
        environment.PROTON_API_BASE ||
        "",
    ).trim();
    if (!value) return null;
    let url;
    try {
      url = new URL(value);
    } catch {
      return null;
    }
    return url.protocol === "https:" ? url : null;
  }

  function token() {
    try {
      return secureVault?.get("PROTON_API_TOKEN") || null;
    } catch {
      return null;
    }
  }

  return {
    status() {
      const base = baseUrl();
      const hasToken = Boolean(token());
      return {
        configured: Boolean(base),
        authenticated: hasToken,
        available: Boolean(base && hasToken && typeof fetchImpl === "function"),
        apiBase: base ? "configured" : null,
        message: base
          ? hasToken
            ? "Proton adapter is configured for bounded read-only requests"
            : "Store PROTON_API_TOKEN in encrypted local storage to authenticate"
          : "Configure an HTTPS Proton API base URL",
      };
    },
    async request(input = {}) {
      if (!input || typeof input !== "object")
        throw new Error("Proton request is required");
      const base = baseUrl();
      const apiToken = token();
      if (!base || !apiToken)
        return {
          ok: false,
          code: "proton-not-configured",
          message: "Proton adapter is not configured",
        };
      if (typeof fetchImpl !== "function")
        return {
          ok: false,
          code: "fetch-unavailable",
          message: "Network fetch is unavailable",
        };
      const path = String(input.path || "").trim();
      if (!ALLOWED_PATHS.has(path))
        return {
          ok: false,
          code: "path-not-allowlisted",
          message: "Proton API path is not allowlisted",
        };
      const url = new URL(path, base);
      const response = await fetchImpl(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: "application/json",
        },
      });
      const body = await response.text();
      if (Buffer.byteLength(body, "utf8") > MAX_RESPONSE_BYTES)
        return {
          ok: false,
          code: "response-too-large",
          message: "Proton response exceeded the safety limit",
        };
      let data;
      try {
        data = JSON.parse(body);
      } catch {
        data = { text: body.slice(0, MAX_RESPONSE_BYTES) };
      }
      return { ok: response.ok, status: response.status, data };
    },
  };
}

module.exports = { ALLOWED_PATHS, MAX_RESPONSE_BYTES, createProtonAdapter };
