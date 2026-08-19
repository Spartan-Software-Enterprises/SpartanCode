import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MissionsScreen from "../MissionsScreen";
import * as storage from "../../core/storage";
import * as projectRelease from "../../core/project-release";

jest.mock("../../core/storage", () => ({
  readSnapshot: jest.fn(async () => ({
    missions: [],
    connections: [],
    pendingApprovals: 0,
    offline: true,
    approvals: [],
    artifacts: [],
  })),
  writeSnapshot: jest.fn(async () => {}),
  readMobileProjects: jest.fn(async () => []),
  writeMobileProjects: jest.fn(async () => {}),
  enqueueOperation: jest.fn(async () => {}),
}));

jest.mock("../../core/project-release", () => ({
  createMobileProject: jest.fn(
    (name: string, desc: string, target: string) => ({
      id: "proj-1",
      name,
      description: desc,
      target,
      createdAt: new Date().toISOString(),
      checks: [],
      releaseCheck: false,
    }),
  ),
  projectTargets: ["android", "ios", "web"],
  releaseTargetLabel: (t: string) => t.toUpperCase(),
  setReleaseCheck: jest.fn(),
}));

beforeEach(() => {
  AsyncStorage.clear();
  jest.clearAllMocks();
  (storage.readSnapshot as jest.Mock).mockResolvedValue({
    missions: [],
    connections: [],
    pendingApprovals: 0,
    offline: true,
    approvals: [],
    artifacts: [],
  });
  (storage.readMobileProjects as jest.Mock).mockResolvedValue([]);
});

describe("MissionsScreen", () => {
  it("renders title and eyebrow", async () => {
    const { getByText } = await render(<MissionsScreen />);
    await waitFor(() => {
      expect(getByText("SPARTANCODE / MISSIONS")).toBeTruthy();
      expect(getByText("Mission Control")).toBeTruthy();
    });
  });

  it("shows offline status", async () => {
    const { getByText } = await render(<MissionsScreen />);
    await waitFor(() => {
      expect(getByText("LOCAL")).toBeTruthy();
    });
  });

  it("shows online status when synced", async () => {
    (storage.readSnapshot as jest.Mock).mockResolvedValue({
      missions: [],
      connections: [],
      pendingApprovals: 0,
      offline: false,
    });
    const { getByText } = await render(<MissionsScreen />);
    await waitFor(() => {
      expect(getByText("SYNCED")).toBeTruthy();
    });
  });

  it("shows empty missions state", async () => {
    const { getByText } = await render(<MissionsScreen />);
    await waitFor(() => {
      expect(getByText("No missions yet")).toBeTruthy();
    });
  });

  it("renders project creation form", async () => {
    const { getByPlaceholderText, getByText } = await render(
      <MissionsScreen />,
    );
    await waitFor(() => {
      expect(getByPlaceholderText("Project name")).toBeTruthy();
      expect(getByPlaceholderText("What should this product do?")).toBeTruthy();
      expect(getByText("Create project offline")).toBeTruthy();
    });
  });

  it("creates a project offline", async () => {
    const { getByPlaceholderText, getByText } = await render(
      <MissionsScreen />,
    );
    await waitFor(() => {
      expect(getByPlaceholderText("Project name")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(getByPlaceholderText("Project name"), "My App");
      fireEvent.changeText(
        getByPlaceholderText("What should this product do?"),
        "A test app",
      );
    });

    await act(async () => {
      fireEvent.press(getByText("Create project offline"));
    });

    expect(storage.writeMobileProjects).toHaveBeenCalledTimes(1);
    const saved = (storage.writeMobileProjects as jest.Mock).mock.calls[0][0];
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe("My App");
  });

  it("shows empty approvals state", async () => {
    const { getByText } = await render(<MissionsScreen />);
    await waitFor(() => {
      expect(getByText("No approval decisions waiting.")).toBeTruthy();
    });
  });

  it("shows empty artifacts message", async () => {
    const { getByText } = await render(<MissionsScreen />);
    await waitFor(() => {
      expect(
        getByText("No artifacts yet. Queue a mission to generate one."),
      ).toBeTruthy();
    });
  });

  it("renders approval items with approve/deny buttons", async () => {
    (storage.readSnapshot as jest.Mock).mockResolvedValue({
      missions: [],
      connections: [],
      pendingApprovals: 1,
      offline: true,
      approvals: [
        {
          id: "a1",
          missionId: "m1",
          title: "Deploy to staging",
          detail: "Build verified",
          status: "pending",
          createdAt: new Date().toISOString(),
        },
      ],
      artifacts: [],
    });

    const { getByText } = await render(<MissionsScreen />);
    await waitFor(() => {
      expect(getByText("Deploy to staging")).toBeTruthy();
      expect(getByText("Approve")).toBeTruthy();
      expect(getByText("Deny")).toBeTruthy();
    });
  });

  it("renders mission items with status", async () => {
    (storage.readSnapshot as jest.Mock).mockResolvedValue({
      missions: [
        {
          id: "m1",
          description: "Build the login page",
          status: "in_progress",
          createdAt: new Date().toISOString(),
        },
      ],
      connections: [],
      pendingApprovals: 0,
      offline: true,
    });

    const { getByText } = await render(<MissionsScreen />);
    await waitFor(() => {
      expect(getByText("Build the login page")).toBeTruthy();
      expect(getByText("IN PROGRESS")).toBeTruthy();
    });
  });

  it("renders artifact items", async () => {
    (storage.readSnapshot as jest.Mock).mockResolvedValue({
      missions: [],
      connections: [],
      pendingApprovals: 0,
      offline: true,
      artifacts: [
        {
          id: "art1",
          name: "app.apk",
          type: "release",
          status: "ready",
          createdAt: new Date().toISOString(),
        },
      ],
    });

    const { getByText } = await render(<MissionsScreen />);
    await waitFor(() => {
      expect(getByText("app.apk")).toBeTruthy();
    });
  });
});
