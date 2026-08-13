const { createExecutionPlan } = require("./agent-plan");

function createMissionRunner(
  store,
  window,
  { schedule = queueMicrotask, executeStage = () => ({ ok: true }) } = {},
) {
  return (mission) => {
    const plan = createExecutionPlan(mission.description);
    store.addMissionPlan(mission.id, plan);
    store.addArtifact({
      missionId: mission.id,
      name: "Execution plan",
      type: "plan",
      status: "ready",
      content: JSON.stringify(plan),
    });
    publish();

    const stages = [
      {
        status: "building",
        agent: "Build agent",
        message: "Plan approved; implementing the mission",
      },
      {
        status: "verifying",
        agent: "Verify agent",
        message: "Build complete; running verification",
      },
      {
        status: "complete",
        agent: "Verify agent",
        message: "Verification complete; artifact is ready",
      },
    ];

    schedule(async () => {
      for (const stage of stages) {
        store.updateMission(mission.id, { status: stage.status });
        store.addActivity({ agent: stage.agent, message: stage.message });
        const result = await executeStage(stage, mission, plan);
        if (result && result.ok === false) {
          store.updateMission(mission.id, { status: "failed" });
          store.addActivity({
            agent: stage.agent,
            message: result.message || "Stage failed; mission stopped",
          });
        } else if (stage.status === "complete") {
          store.addArtifact({
            missionId: mission.id,
            name: "Mission verification report",
            type: "verification",
            status: "ready",
            content: `Verified mission: ${mission.description}`,
          });
        }
        publish();
        if (result && result.ok === false) break;
      }
    });
  };

  function publish() {
    if (window && !window.isDestroyed()) {
      window.webContents.send("workspace:changed", store.snapshot());
    }
  }
}

module.exports = { createMissionRunner };
