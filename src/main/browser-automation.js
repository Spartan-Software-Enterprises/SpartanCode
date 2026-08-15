const fs = require("fs");

const MAX_URL_LENGTH = 2048;
const MAX_TEXT_LENGTH = 200_000;
const MAX_TIMEOUT = 30_000;

function normalizeHost(host) {
  return String(host || "")
    .trim()
    .toLowerCase()
    .replace(/^\.+/, "");
}

function validateBrowserUrl(value, allowedHosts = []) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_URL_LENGTH
  )
    throw new Error("A bounded browser URL is required");
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Browser URL must be valid HTTP or HTTPS");
  }
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("Browser automation only permits HTTP and HTTPS");
  const hosts = allowedHosts.map(normalizeHost).filter(Boolean);
  if (!hosts.length)
    throw new Error("Browser automation requires an explicit domain allowlist");
  const hostname = normalizeHost(url.hostname);
  const allowed = hosts.some(
    (host) => hostname === host || hostname.endsWith(`.${host}`),
  );
  if (!allowed)
    throw new Error(`Browser domain is not allowlisted: ${hostname}`);
  return url.toString();
}

function normalizeRequest(request, environment = process.env) {
  if (!request || typeof request !== "object")
    throw new Error("Browser request must be an object");
  const configuredHosts = String(
    environment.SPARTANCODE_BROWSER_ALLOWLIST || "",
  )
    .split(",")
    .map((host) => normalizeHost(host))
    .filter(Boolean);
  if (!configuredHosts.length)
    throw new Error(
      "Browser automation requires a configured domain allowlist",
    );
  const requestedHosts = Array.isArray(request.allowedHosts)
    ? request.allowedHosts.map(normalizeHost).filter(Boolean)
    : configuredHosts;
  const allowedHosts = requestedHosts.filter((host) =>
    configuredHosts.some(
      (configured) => host === configured || host.endsWith(`.${configured}`),
    ),
  );
  const url = validateBrowserUrl(request.url, allowedHosts);
  const action = request.action || "extractText";
  if (!["navigate", "extractText"].includes(action))
    throw new Error("Browser action must be navigate or extractText");
  const timeout = request.timeout === undefined ? 10_000 : request.timeout;
  if (!Number.isInteger(timeout) || timeout < 100 || timeout > MAX_TIMEOUT)
    throw new Error(
      `Browser timeout must be an integer from 100 to ${MAX_TIMEOUT}`,
    );
  const selector = request.selector === undefined ? "body" : request.selector;
  if (typeof selector !== "string" || selector.length > 512)
    throw new Error("Browser selector must be at most 512 characters");
  const normalized = { url, action, timeout, selector, allowedHosts };
  if (request.routeThroughTor === true) {
    const proxy = String(environment.SPARTANCODE_TOR_SOCKS_PROXY || "").trim();
    if (!proxy)
      throw new Error("Explicit Tor routing requires a configured SOCKS proxy");
    let proxyUrl;
    try {
      proxyUrl = new URL(proxy);
    } catch {
      throw new Error("Tor proxy must be a valid URL");
    }
    if (!["socks5:", "socks5h:", "http:"].includes(proxyUrl.protocol))
      throw new Error("Tor proxy must use SOCKS5 or HTTP protocol");
    normalized.torProxy = proxyUrl.toString();
  }
  return normalized;
}

function createBrowserAutomation({
  playwright,
  environment = process.env,
  audit,
} = {}) {
  let runtime = playwright;
  const load = () => {
    if (!runtime) {
      try {
        runtime = require("playwright");
      } catch {
        return null;
      }
    }
    return runtime;
  };
  return {
    status() {
      const loaded = load();
      let executable = null;
      try {
        executable = loaded?.chromium?.executablePath?.() || null;
      } catch {
        executable = null;
      }
      return {
        id: "playwright-browser",
        status:
          loaded?.chromium && executable && fs.existsSync(executable)
            ? "available"
            : loaded?.chromium
              ? "browser-download-required"
              : "unavailable",
        module: loaded ? "playwright" : null,
        executable,
        allowlistConfigured: Boolean(
          String(environment.SPARTANCODE_BROWSER_ALLOWLIST || "").trim(),
        ),
      };
    },
    async run(request) {
      const config = normalizeRequest(request, environment);
      const loaded = load();
      if (!loaded?.chromium)
        return {
          ok: false,
          code: "browser-unavailable",
          message: "Playwright Chromium is not installed in this environment",
        };
      let browser;
      try {
        browser = await loaded.chromium.launch({
          headless: true,
          ...(config.torProxy ? { proxy: { server: config.torProxy } } : {}),
        });
        const context = await browser.newContext({ acceptDownloads: false });
        await context.route("**/*", async (route) => {
          try {
            validateBrowserUrl(route.request().url(), config.allowedHosts);
            await route.continue();
          } catch {
            await route.abort("blockedbyclient");
          }
        });
        const page = await context.newPage();
        await page.goto(config.url, {
          waitUntil: "domcontentloaded",
          timeout: config.timeout,
        });
        validateBrowserUrl(page.url(), config.allowedHosts);
        const result = {
          ok: true,
          action: config.action,
          url: page.url(),
          title: await page.title(),
        };
        if (config.action === "extractText") {
          result.text = (
            await page.locator(config.selector).innerText({
              timeout: config.timeout,
            })
          ).slice(0, MAX_TEXT_LENGTH);
        }
        audit?.({ action: config.action, host: new URL(config.url).hostname });
        return result;
      } catch (error) {
        return {
          ok: false,
          code: "browser-failed",
          message: String(error?.message || "Browser action failed").slice(
            0,
            1000,
          ),
        };
      } finally {
        await browser?.close().catch(() => {});
      }
    },
  };
}

module.exports = {
  MAX_TEXT_LENGTH,
  validateBrowserUrl,
  normalizeRequest,
  createBrowserAutomation,
};
