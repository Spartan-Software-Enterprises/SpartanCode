import { chooseWorkloadRoute, workloadLabel } from "./runtime";

describe("adaptive workload routing", () => {
  it("prefers the Dev server for every workload when connected", () => {
    expect(chooseWorkloadRoute("verification", true)).toBe("dev-server");
  });

  it("queues heavy work on constrained devices", () => {
    expect(
      chooseWorkloadRoute("build", false, {
        totalMemoryMb: 2048,
        thermalState: "nominal",
      }),
    ).toBe("queue");
  });

  it("allows lightweight planning locally without a server", () => {
    expect(chooseWorkloadRoute("planning", false)).toBe("on-device");
    expect(workloadLabel("on-device")).toBe("Running on this device");
  });

  it("requires storage and acceleration before downloading models", () => {
    expect(
      chooseWorkloadRoute("model-download", false, {
        availableStorageMb: 4096,
        hasAccelerator: false,
      }),
    ).toBe("queue");
    expect(
      chooseWorkloadRoute("model-download", false, {
        availableStorageMb: 4096,
        hasAccelerator: true,
      }),
    ).toBe("on-device");
  });
});
