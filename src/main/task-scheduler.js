const crypto = require("node:crypto");

class TaskScheduler {
  constructor({ onNotification = () => {} } = {}) {
    this.tasks = new Map();
    this.timers = new Map();
    this.onNotification = onNotification;
  }

  schedule({
    prompt,
    durationSeconds = null,
    cronExpression = null,
    condition = "never",
    maxIterations = null,
  }) {
    if (!prompt || typeof prompt !== "string") {
      throw new Error("Task prompt is required");
    }
    if (durationSeconds == null && !cronExpression) {
      throw new Error(
        "Either durationSeconds or cronExpression must be specified",
      );
    }

    const taskId = `task-${crypto.randomUUID().slice(0, 8)}`;
    const isCron = Boolean(cronExpression);

    const task = {
      taskId,
      type: isCron ? "cron" : "timer",
      prompt: String(prompt).slice(0, 1000),
      durationSeconds: durationSeconds ? Number(durationSeconds) : null,
      cronExpression: cronExpression
        ? String(cronExpression).slice(0, 64)
        : null,
      condition: isCron ? "recurring" : condition,
      maxIterations: maxIterations ? Number(maxIterations) : null,
      iterationsRun: 0,
      status: "active",
      createdAt: new Date().toISOString(),
      lastFiredAt: null,
      logs: [],
    };

    this.tasks.set(taskId, task);

    if (!isCron && durationSeconds) {
      const ms = Math.max(
        10,
        Math.min(durationSeconds * 1000, 24 * 60 * 60 * 1000),
      );
      const timerHandle = setTimeout(() => {
        this.fireTask(taskId, "Timer expired");
      }, ms);
      this.timers.set(taskId, timerHandle);
    }

    return task;
  }

  fireTask(taskId, reason = "Scheduled event") {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== "active") return;

    task.iterationsRun += 1;
    task.lastFiredAt = new Date().toISOString();
    task.logs.push({
      timestamp: task.lastFiredAt,
      event: "FIRED",
      reason,
    });

    if (task.type === "timer") {
      task.status = "completed";
      const timerHandle = this.timers.get(taskId);
      if (timerHandle) clearTimeout(timerHandle);
      this.timers.delete(taskId);
    } else if (
      task.type === "cron" &&
      task.maxIterations &&
      task.iterationsRun >= task.maxIterations
    ) {
      task.status = "completed";
    }

    try {
      this.onNotification({
        taskId: task.taskId,
        prompt: task.prompt,
        type: task.type,
        reason,
        timestamp: task.lastFiredAt,
      });
    } catch {
      /* Notification callback failure should not crash scheduler */
    }
  }

  cancelTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    task.status = "cancelled";
    task.logs.push({
      timestamp: new Date().toISOString(),
      event: "CANCELLED",
    });
    const timerHandle = this.timers.get(taskId);
    if (timerHandle) {
      clearTimeout(timerHandle);
      this.timers.delete(taskId);
    }
    return true;
  }

  listTasks() {
    return Array.from(this.tasks.values()).map((t) => ({ ...t }));
  }

  getTaskStatus(taskId) {
    return this.tasks.get(taskId) || null;
  }

  sendInput(taskId, input) {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    task.logs.push({
      timestamp: new Date().toISOString(),
      event: "INPUT_RECEIVED",
      input: String(input).slice(0, 1000),
    });
    return task;
  }

  clear() {
    for (const timerHandle of this.timers.values()) {
      clearTimeout(timerHandle);
    }
    this.timers.clear();
    this.tasks.clear();
  }
}

function createTaskScheduler(options) {
  return new TaskScheduler(options);
}

module.exports = {
  TaskScheduler,
  createTaskScheduler,
};
