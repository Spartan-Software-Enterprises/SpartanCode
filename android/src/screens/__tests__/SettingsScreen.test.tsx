import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SettingsScreen from "../SettingsScreen";
import * as storage from "../../core/storage";

jest.mock("../../core/storage", () => ({
  readSnapshot: jest.fn(async () => ({
    missions: [],
    connections: [],
    pendingApprovals: 0,
    offline: true,
  })),
  writeSnapshot: jest.fn(async () => {}),
  readBiometricSetting: jest.fn(async () => false),
  writeBiometricSetting: jest.fn(async () => {}),
  readMobileSettings: jest.fn(async () => ({
    model: "Qwen3-1.7B",
    defaultAgent: "leo",
    protocol: "MCP Lite",
    apiProvider: "local",
    memoryEnabled: true,
    executionMode: "guided",
    quantization: "Q4_K_M",
    voiceEnabled: false,
    autoSync: true,
    personaName: "Leo",
    wakeWord: "Leo",
    emotionMode: "explicit",
    interactionSignal: "calm",
  })),
  writeMobileSettings: jest.fn(async () => {}),
  readMobileSettingsLayers: jest.fn(async () => ({})),
  writeMobileSettingsLayers: jest.fn(async () => {}),
  resolveMobileSettings: jest.fn(() => ({
    model: "Qwen3-1.7B",
    defaultAgent: "leo",
    protocol: "MCP Lite",
    apiProvider: "local",
    memoryEnabled: true,
    executionMode: "guided",
    quantization: "Q4_K_M",
    voiceEnabled: false,
    autoSync: true,
    personaName: "Leo",
    wakeWord: "Leo",
    emotionMode: "explicit",
    interactionSignal: "calm",
  })),
  updateMobileScopedSettings: jest.fn(async () => {}),
  saveBridgeToken: jest.fn(async () => {}),
  readBridgeToken: jest.fn(async () => null),
  clearBridgeToken: jest.fn(async () => {}),
  clearAllBridgeTokens: jest.fn(async () => {}),
}));

jest.mock("../../core/voice", () => ({
  normalizeSpeechText: jest.fn((text: string) => text),
}));

jest.mock("../../core/bridge", () => ({
  normalizeBridgeEndpoint: jest.fn((ep: string) => ep),
}));

jest.mock("../../core/github", () => ({
  readGitHubToken: jest.fn(async () => ""),
  writeGitHubToken: jest.fn(async () => {}),
  clearGitHubToken: jest.fn(async () => {}),
  readGitHubUser: jest.fn(async () => null),
  clearGitHubUser: jest.fn(async () => {}),
  fetchGitHubUser: jest.fn(async () => ({})),
  fetchRepos: jest.fn(async () => []),
  fetchIssues: jest.fn(async () => []),
  fetchPullRequests: jest.fn(async () => []),
}));

jest.mock("expo-speech", () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));

beforeEach(() => {
  AsyncStorage.clear();
  jest.clearAllMocks();
});

describe("SettingsScreen", () => {
  it("renders title and eyebrow", async () => {
    const { getByText } = await render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByText("SPARTANCODE / SETTINGS")).toBeTruthy();
      expect(getByText("Settings")).toBeTruthy();
    });
  });

  it("renders settings menu categories", async () => {
    const { getByText } = await render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByText("Security")).toBeTruthy();
      expect(getByText("Runtime")).toBeTruthy();
      expect(getByText("Voice & identity")).toBeTruthy();
      expect(getByText("Scoped settings")).toBeTruthy();
      expect(getByText("Bridge & Git")).toBeTruthy();
    });
  });

  it("shows Security panel by default", async () => {
    const { getByText } = await render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByText("Local storage and security")).toBeTruthy();
    });
  });

  it("switches to Runtime panel", async () => {
    const { getByText } = await render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByText("Runtime")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText("Runtime"));
    });

    await waitFor(() => {
      expect(getByText("Execution preference")).toBeTruthy();
      expect(getByText("Default local model")).toBeTruthy();
    });
  });

  it("switches to Voice & identity panel", async () => {
    const { getByText, getByPlaceholderText } = await render(
      <SettingsScreen />,
    );
    await waitFor(() => {
      expect(getByText("Voice & identity")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText("Voice & identity"));
    });

    await waitFor(() => {
      expect(getByText("Test voice output")).toBeTruthy();
      expect(getByText("Persona and wake word")).toBeTruthy();
      expect(getByPlaceholderText("Assistant name")).toBeTruthy();
    });
  });

  it("switches to Bridge & Git panel with GitHub integration", async () => {
    const { getByText } = await render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByText("Bridge & Git")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText("Bridge & Git"));
    });

    await waitFor(() => {
      expect(getByText("GitHub integration")).toBeTruthy();
      expect(getByText(/Connect your GitHub/)).toBeTruthy();
    });
  });

  it("switches to Scoped settings panel", async () => {
    const { getByText } = await render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByText("Scoped settings")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText("Scoped settings"));
    });

    await waitFor(() => {
      expect(getByText("Save scope")).toBeTruthy();
      expect(getByText("Load scope")).toBeTruthy();
    });
  });

  it("writes mobile settings when toggling execution mode", async () => {
    const { getByText, getAllByText } = await render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByText("Runtime")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText("Runtime"));
    });

    await waitFor(() => {
      const changeButtons = getAllByText("Change");
      expect(changeButtons.length).toBeGreaterThan(0);
    });

    await act(async () => {
      const changeButtons = getAllByText("Change");
      fireEvent.press(changeButtons[0]!);
    });

    expect(storage.writeMobileSettings).toHaveBeenCalled();
  });

  it("renders GitHub token input", async () => {
    const { getByText, getByPlaceholderText } = await render(
      <SettingsScreen />,
    );
    await waitFor(() => {
      fireEvent.press(getByText("Bridge & Git"));
    });

    await waitFor(() => {
      expect(getByPlaceholderText("ghp_xxxxxxxxxxxx")).toBeTruthy();
    });
  });
});
