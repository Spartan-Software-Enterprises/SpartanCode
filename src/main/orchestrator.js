const { exec } = require("child_process");
const { classifyCommand } = require("./policy-engine");

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
      exec(step.command, (error, stdout, stderr) => {
        results.push({ step: step.name, error, stdout, stderr });
        index++;
        executeStep();
      });
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
