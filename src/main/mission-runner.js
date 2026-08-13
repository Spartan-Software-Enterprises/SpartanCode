const { createExecutionPlan } = require("./agent-plan");

function createMissionRunner(
  store,
  window,
  { schedule = queueMicrotask, executeStage = () => ({ ok: true }) } = {},
) {
  return (mission) => {
    const plan = createExecutionPlan(mission.description);
    store.addMissionPlan(mission.id, plan);
    const planArtifact = store.addArtifact({
      missionId: mission.id,
      name: "Execution plan",
      type: "plan",
      status: "ready",
      content: JSON.stringify(plan),
    });
    publish();

    const stages = [
      {
        planId: "build",
        status: "building",
        agent: "Build agent",
        message: "Plan approved; implementing the mission",
      },
      {
        planId: "verify",
        status: "verifying",
        agent: "Verify agent",
        message: "Build complete; running verification",
      },
      {
        planId: "verify",
        status: "complete",
        agent: "Verify agent",
        message: "Verification complete; artifact is ready",
      },
    ];

    schedule(async () => {
      for (const stage of stages) {
        const stageIndex = plan.stages.findIndex(
          (item) => item.id === stage.planId,
        );
        if (stageIndex >= 0) {
          plan.stages = plan.stages.map((item, index) => ({
            ...item,
            status:
              index < stageIndex
                ? "complete"
                : index === stageIndex
                  ? "running"
                  : "queued",
          }));
          store.updateArtifact(planArtifact.id, {
            content: JSON.stringify(plan),
          });
        }
        store.updateMission(mission.id, { status: stage.status });
        store.addActivity({ agent: stage.agent, message: stage.message });
        let result;
        try {
          result = await executeStage(stage, mission, plan);
        } catch (error) {
          result = {
            ok: false,
            message: error instanceof Error ? error.message : String(error),
          };
        }
        if (result && result.ok === false) {
          store.updateMission(mission.id, { status: "failed" });
          store.addActivity({
            agent: stage.agent,
            message: result.message || "Stage failed; mission stopped",
          });
        } else if (stage.status === "complete") {
          plan.stages = plan.stages.map((item) => ({
            ...item,
            status: "complete",
          }));
          store.updateArtifact(planArtifact.id, {
            content: JSON.stringify(plan),
          });
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
