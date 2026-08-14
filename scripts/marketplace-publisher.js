const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const {
  canonicalize,
  validateMarketplaceIndex,
} = require("../src/main/plugin-marketplace");

function writeExclusive(filePath, contents, mode) {
  if (fs.existsSync(filePath))
    throw new Error(`Refusing to overwrite existing file: ${filePath}`);
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(filePath, contents, { mode, flag: "wx" });
}

function generatePublisherKeyPair(outputDir) {
  if (typeof outputDir !== "string" || !path.isAbsolute(outputDir))
    throw new Error("Publisher key output directory must be absolute");
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519", {
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  const privatePath = path.join(outputDir, "marketplace-signing-private.pem");
  const publicPath = path.join(outputDir, "marketplace-signing-public.pem");
  writeExclusive(privatePath, privateKey, 0o600);
  try {
    writeExclusive(publicPath, publicKey, 0o644);
  } catch (error) {
    fs.unlinkSync(privatePath);
    throw error;
  }
  return { privatePath, publicPath };
}

function loadManifestDirectory(manifestDir) {
  if (typeof manifestDir !== "string" || !path.isAbsolute(manifestDir))
    throw new Error("Manifest directory must be absolute");
  if (!fs.existsSync(manifestDir))
    throw new Error("Manifest directory missing");
  return fs
    .readdirSync(manifestDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) =>
      JSON.parse(fs.readFileSync(path.join(manifestDir, entry.name), "utf8")),
    );
}

function buildSignedMarketplaceIndex({ issuer, manifests, privateKey }) {
  if (typeof issuer !== "string" || !issuer.trim())
    throw new Error("Marketplace issuer is required");
  if (!Array.isArray(manifests))
    throw new Error("Marketplace manifests are required");
  const validated = validateMarketplaceIndex({
    schemaVersion: 1,
    issuer,
    plugins: manifests,
  });
  const unsigned = {
    schemaVersion: validated.schemaVersion,
    issuer: validated.issuer,
    plugins: validated.plugins,
  };
  let signature;
  try {
    signature = crypto
      .sign(null, Buffer.from(canonicalize(unsigned)), privateKey)
      .toString("base64url");
  } catch (error) {
    throw new Error(`Marketplace signing failed: ${error.message}`);
  }
  return { ...unsigned, signature };
}

function writeSignedMarketplaceIndex(index, outputPath) {
  if (typeof outputPath !== "string" || !path.isAbsolute(outputPath))
    throw new Error("Marketplace output path must be absolute");
  writeExclusive(outputPath, `${JSON.stringify(index, null, 2)}\n`, 0o644);
  return outputPath;
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) throw new Error(`Unknown argument: ${token}`);
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--"))
      throw new Error(`Missing value for --${key}`);
    args[key] = value;
    index += 1;
  }
  return args;
}

if (require.main === module) {
  try {
    const [command, ...rest] = process.argv.slice(2);
    const args = parseArgs(rest);
    if (command === "keygen") {
      console.log(
        JSON.stringify(generatePublisherKeyPair(args["output-dir"]), null, 2),
      );
    } else if (command === "build-index") {
      const index = buildSignedMarketplaceIndex({
        issuer: args.issuer,
        manifests: loadManifestDirectory(args["manifest-dir"]),
        privateKey: fs.readFileSync(args["private-key"], "utf8"),
      });
      console.log(writeSignedMarketplaceIndex(index, args.output));
    } else {
      throw new Error(
        "Usage: keygen --output-dir DIR | build-index --issuer NAME --manifest-dir DIR --private-key FILE --output FILE",
      );
    }
  } catch (error) {
    process.stderr.write(`Marketplace publisher failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  buildSignedMarketplaceIndex,
  generatePublisherKeyPair,
  loadManifestDirectory,
  writeSignedMarketplaceIndex,
};
