const { execFile } = require("child_process");
const { classifyCommand } = require("./policy-engine");

const SAFE_TOKEN = /^[A-Za-z0-9_./:@%+=,-]+$/;

function parseCommand(command) {
  const normalized = String(command || "").trim();
  if (
    !normalized ||
    normalized.length > 400 ||
    /[;&|`$()<>\\\n\r]/.test(normalized)
  ) {
    return null;
  }
  const tokens = normalized.split(/\s+/);
  return tokens.every((token) => SAFE_TOKEN.test(token))
    ? { executable: tokens[0], args: tokens.slice(1) }
    : null;
}

function executePlan(steps) {
  return new Promise((resolve, reject) => {
    let results = [];
    let index = 0;

    function executeStep() {
      if (index >= steps.length) {
        resolve(results);
        return;
      }

      const step = steps[index];
      const classification = classifyCommand(step.command);
      if (classification.requiresApproval) {
        results.push({
          step: step.name,
          blocked: true,
          reason: classification.reason,
        });
        index++;
        executeStep();
        return;
      }
      const parsed = parseCommand(step.command);
      if (!parsed) {
        results.push({
          step: step.name,
          blocked: true,
          reason: "command is not a safe tokenized invocation",
        });
        index++;
        executeStep();
        return;
      }
      execFile(
        parsed.executable,
        parsed.args,
        { timeout: 120000 },
        (error, stdout, stderr) => {
          results.push({ step: step.name, error, stdout, stderr });
          index++;
          executeStep();
        },
      );
    }

    executeStep();
  });
}

function approveCommand(command) {
  return new Promise((resolve) => {
    console.log(`Approve command: ${command}? (y/n)`);
    const readline = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    readline.question("", (answer) => {
      resolve(answer === "y");
      readline.close();
    });
  });
}

function validatePlan(steps) {
  if (!Array.isArray(steps)) throw new TypeError("Plan steps must be an array");
  return steps.map((step) => ({
    ...step,
    policy: classifyCommand(step.command),
  }));
}

async function orchestrate(steps) {
  const results = await executePlan(steps);

  for (const result of results) {
    if (
      result.error ||
      !(await approveCommand(result.stderr || result.stdout || ""))
    ) {
      console.log(`Skipped: ${result.step}`);
      continue;
    }

    console.log(`Executed: ${result.step}`);
  }

  return results;
}

module.exports = { orchestrate, approveCommand };
module.exports.validatePlan = validatePlan;
module.exports.parseCommand = parseCommand;
