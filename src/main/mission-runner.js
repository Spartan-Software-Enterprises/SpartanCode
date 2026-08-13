const { createExecutionPlan } = require("./agent-plan");

function createMissionRunner(store, window, { schedule = setTimeout } = {}) {
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

    stages.forEach((stage, index) => {
      schedule(
        () => {
          store.updateMission(mission.id, { status: stage.status });
          store.addActivity({ agent: stage.agent, message: stage.message });
          if (stage.status === "complete") {
            store.addArtifact({
              missionId: mission.id,
              name: "Mission verification report",
              type: "verification",
              status: "ready",
              content: `Verified mission: ${mission.description}`,
            });
          }
          publish();
        },
        900 * (index + 1),
      );
    });
  };

  function publish() {
    if (window && !window.isDestroyed()) {
      window.webContents.send("workspace:changed", store.snapshot());
    }
  }
}

module.exports = { createMissionRunner };
