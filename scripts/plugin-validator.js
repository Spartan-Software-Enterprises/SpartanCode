const fs = require("node:fs");
const path = require("node:path");
const { validatePlugin } = require("../src/main/plugin-registry");

function validatePluginFile(filePath) {
  if (typeof filePath !== "string" || !path.isAbsolute(filePath))
    throw new Error("Plugin manifest path must be absolute");
  const manifest = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return validatePlugin(manifest, "author");
}

if (require.main === module) {
  const filePath = process.argv[2];
  try {
    if (!filePath)
      throw new Error(
        "Usage: node scripts/plugin-validator.js /absolute/plugin.json",
      );
    process.stdout.write(
      `${JSON.stringify(validatePluginFile(filePath), null, 2)}\n`,
    );
  } catch (error) {
    process.stderr.write(`Plugin validation failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { validatePluginFile };
