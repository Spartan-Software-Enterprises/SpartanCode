const { EventEmitter } = require("events");

class DebugPanel extends EventEmitter {
  constructor() {
    super();
    this.breakpoints = new Set();
    this.currentStep = 0;
    this.isPaused = false;
  }

  setBreakpoint(line) {
    this.breakpoints.add(line);
    this.emit("breakpoint:set", line);
  }

  removeBreakpoint(line) {
    this.breakpoints.delete(line);
    this.emit("breakpoint:remove", line);
  }

  toggleBreakpoint(line) {
    if (this.breakpoints.has(line)) {
      this.removeBreakpoint(line);
    } else {
      this.setBreakpoint(line);
    }
  }

  isBreakpoint(line) {
    return this.breakpoints.has(line);
  }

  nextStep() {
    this.currentStep++;
    this.isPaused = false;
    this.emit("step:next");
  }

  pauseStep() {
    this.isPaused = true;
    this.emit("step:paused");
  }

  resumeStep() {
    this.isPaused = false;
    this.emit("step:resumed");
  }
}

module.exports = { DebugPanel };
