const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const sources = require("../config/external-skills.json");

const targetRoot = path.resolve(
  process.argv[2] ||
    path.join(process.cwd(), ".spartancode", "external-skills"),
);
fs.mkdirSync(targetRoot, { recursive: true });

for (const source of sources) {
  const destination = path.join(targetRoot, source.id);
  if (
    fs.existsSync(destination) &&
    !fs.existsSync(path.join(destination, ".git"))
  )
    throw new Error(`Skill destination is not a git checkout: ${destination}`);
  if (!fs.existsSync(destination)) {
    const temporary = fs.mkdtempSync(
      path.join(os.tmpdir(), "spartancode-skill-"),
    );
    execFileSync(
      "git",
      ["clone", "--filter=blob:none", source.repository, temporary],
      {
        stdio: "inherit",
      },
    );
    fs.renameSync(temporary, destination);
  } else {
    execFileSync(
      "git",
      ["-C", destination, "fetch", "--depth", "1", "origin", source.commit],
      {
        stdio: "inherit",
      },
    );
  }
  execFileSync(
    "git",
    ["-C", destination, "checkout", "--detach", source.commit],
    {
      stdio: "inherit",
    },
  );
  const actual = execFileSync("git", ["-C", destination, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  if (actual !== source.commit)
    throw new Error(`Skill source pin mismatch for ${source.id}`);
  console.log(`${source.id}: ${actual}`);
}
