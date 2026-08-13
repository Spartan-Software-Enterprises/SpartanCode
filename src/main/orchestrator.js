const { exec } = require("child_process");

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
