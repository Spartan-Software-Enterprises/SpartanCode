const { execFile } = require("node:child_process");

const MAX_REFERENCE = 512;
const MAX_OUTPUT = 2 * 1024 * 1024;
const REFERENCE_PATTERN = /^pass:\/\/[^\s/]+\/[^\s/]+(?:\/[^\s/]+)?$/;

function validateReference(reference) {
  if (
    typeof reference !== "string" ||
    reference.length === 0 ||
    reference.length > MAX_REFERENCE ||
    !REFERENCE_PATTERN.test(reference)
  )
    throw new Error("Proton Pass secret reference is invalid");
  return reference;
}

function extractSecret(output) {
  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch {
    throw new Error("Proton Pass returned an unexpected response");
  }
  if (typeof parsed === "string" && parsed.length <= MAX_OUTPUT) return parsed;
  if (!parsed || typeof parsed !== "object")
    throw new Error("Proton Pass returned no secret");
  for (const key of ["value", "secret", "password", "content"]) {
    if (typeof parsed[key] === "string") return parsed[key];
  }
  const fields = Array.isArray(parsed.fields) ? parsed.fields : [];
  const field = fields.find(
    (item) => item && typeof item.value === "string" && item.value.length,
  );
  if (field) return field.value;
  throw new Error("Proton Pass response did not contain a secret value");
}

function createProtonPassProvider({
  environment = process.env,
  execFileImpl = execFile,
} = {}) {
  const binary = () =>
    String(
      environment.SPARTANCODE_PROTON_PASS_CLI ||
        environment.PROTON_PASS_CLI ||
        "pass-cli",
    ).trim();

  function run(args) {
    return new Promise((resolve, reject) => {
      execFileImpl(
        binary(),
        args,
        { shell: false, timeout: 30_000, maxBuffer: MAX_OUTPUT },
        (error, stdout = "", stderr = "") => {
          if (error) {
            const detail = String(stderr || error.message).slice(0, 1_000);
            reject(new Error(`Proton Pass CLI failed: ${detail}`));
            return;
          }
          resolve(String(stdout).slice(0, MAX_OUTPUT));
        },
      );
    });
  }

  return {
    status() {
      const configured = Boolean(
        environment.SPARTANCODE_PROTON_PASS_CLI || environment.PROTON_PASS_CLI,
      );
      return {
        provider: "Proton Pass",
        configured,
        available: configured,
        authenticated: "unknown",
        cli: configured ? binary() : null,
        mode: "explicit pass:// reference resolution",
        message: configured
          ? "Official Proton Pass CLI configured; authenticate with `pass-cli login`"
          : "Install the official Proton Pass CLI and configure its path",
      };
    },
    async version() {
      const output = await run(["--version"]);
      return { ok: true, output: output.trim().slice(0, 512) };
    },
    async get(reference) {
      const safeReference = validateReference(reference);
      const output = await run([
        "item",
        "view",
        safeReference,
        "--output",
        "json",
      ]);
      return {
        ok: true,
        reference: safeReference,
        value: extractSecret(output),
      };
    },
  };
}

module.exports = { createProtonPassProvider, extractSecret, validateReference };
