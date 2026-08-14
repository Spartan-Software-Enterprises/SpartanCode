const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createWindowsAutomation,
  READ_ONLY_COMMANDS,
} = require("./windows-automation");

test("Windows automation reports unavailable off Windows", async () => {
  const adapter = createWindowsAutomation({ platform: "linux" });
  assert.equal(adapter.status().status, "unavailable");
  assert.equal(
    (await adapter.execute({ command: [...READ_ONLY_COMMANDS][0] })).code,
    "platform-unavailable",
  );
});

test("Windows automation uses fixed PowerShell arguments and bounded commands", async () => {
  const calls = [];
  const adapter = createWindowsAutomation({
    platform: "win32",
    runner: (file, args, options, callback) => {
      calls.push({ file, args, options });
      callback(null, "computer output", "");
    },
  });
  const result = await adapter.execute({
    command: "Get-Process | Select-Object -First 100 Name,Id,CPU",
  });
  assert.equal(result.ok, true);
  assert.equal(calls[0].file, "powershell.exe");
  assert.ok(calls[0].args.includes("-NoProfile"));
  assert.equal(calls[0].options.windowsHide, true);
  assert.equal(
    (await adapter.execute({ command: "Remove-Item C:\\" })).code,
    "approval-required",
  );
});
