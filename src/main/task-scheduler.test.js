const test = require("node:test");
const assert = require("node:assert");
const { createTaskScheduler } = require("./task-scheduler");

test("task scheduler creates and tracks one-shot timers", (t, done) => {
  let notified = false;
  const scheduler = createTaskScheduler({
    onNotification: (payload) => {
      notified = true;
      assert.strictEqual(payload.type, "timer");
      assert.strictEqual(payload.prompt, "Check background health");
      scheduler.clear();
      done();
    },
  });

  const task = scheduler.schedule({
    prompt: "Check background health",
    durationSeconds: 0.05,
    condition: "never",
  });

  assert.ok(task.taskId);
  assert.strictEqual(task.status, "active");
  assert.strictEqual(task.type, "timer");

  const list = scheduler.listTasks();
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].taskId, task.taskId);
});

test("task scheduler cancels tasks and records logs", () => {
  const scheduler = createTaskScheduler();
  const task = scheduler.schedule({
    prompt: "Long running check",
    durationSeconds: 600,
  });

  assert.strictEqual(task.status, "active");
  const cancelled = scheduler.cancelTask(task.taskId);
  assert.strictEqual(cancelled, true);

  const status = scheduler.getTaskStatus(task.taskId);
  assert.strictEqual(status.status, "cancelled");
  assert.ok(status.logs.some((l) => l.event === "CANCELLED"));
  scheduler.clear();
});

test("task scheduler handles manual input to tasks", () => {
  const scheduler = createTaskScheduler();
  const task = scheduler.schedule({
    prompt: "Interactive job",
    durationSeconds: 300,
  });

  scheduler.sendInput(task.taskId, "operator-ack");
  const status = scheduler.getTaskStatus(task.taskId);
  assert.ok(status.logs.some((l) => l.input === "operator-ack"));
  scheduler.clear();
});
