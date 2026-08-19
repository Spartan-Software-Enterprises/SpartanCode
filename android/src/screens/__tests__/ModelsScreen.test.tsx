import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ModelsScreen from "../ModelsScreen";
import * as storage from "../../core/storage";

jest.mock("../../core/storage", () => ({
  readSnapshot: jest.fn(async () => ({
    missions: [],
    connections: [],
    pendingApprovals: 0,
    offline: true,
  })),
  readCommunityModels: jest.fn(async () => []),
  writeCommunityModels: jest.fn(async () => {}),
}));

jest.mock("../../core/model-catalog", () => ({
  listCompatibleModels: jest.fn(
    (_profile: unknown, models: unknown[]) => models,
  ),
  licensedMobileModels: [
    {
      id: "qwen-1.7b",
      provider: "local",
      license: "MIT",
      minimumMemoryMb: 2048,
      source: "builtin",
    },
  ],
  createHuggingFaceModel: jest.fn(
    (data: {
      id: string;
      license: string;
      uncensored: boolean;
      distilled: boolean;
    }) => ({
      id: data.id,
      provider: "huggingface",
      license: data.license,
      minimumMemoryMb: 1024,
      source: "huggingface",
      uncensored: data.uncensored,
      distilled: data.distilled,
    }),
  ),
}));

jest.mock("../../core/huggingface-catalog", () => ({
  searchHuggingFaceModels: jest.fn(async (query: string) => {
    if (!query) return [];
    return [
      {
        id: "test-org/test-model",
        model: {
          id: "test-org/test-model",
          license: "Apache-2.0",
          uncensored: false,
          distilled: false,
        },
        downloads: 1000,
      },
    ];
  }),
}));

jest.mock("../../core/device-profile", () => ({
  platformDeviceProbe: jest.fn(() => ({
    chipset: "test-chipset",
    totalMemoryMb: 8192,
  })),
  normalizeDeviceProfile: jest.fn((p: unknown) => p),
  deviceDiagnostics: jest.fn(() => ["Device looks capable"]),
  verifyDeviceReadiness: jest.fn(() => [
    { id: "ram", label: "RAM", detail: "8192 MB", status: "pass" },
  ]),
}));

jest.mock("../../core/secure-offline-store", () => ({
  getOfflineCryptoStatus: jest.fn(() => ({ enabled: true })),
}));

jest.mock("../../core/llama-rn-runtime", () => ({
  loadLlamaRnRuntime: jest.fn(() => ({
    id: "llama-rn",
    status: "available",
    reason: null,
  })),
}));

jest.mock("../../core/local-runtime", () => ({
  createMobileRuntimeRegistry: jest.fn(() => ({
    list: () => [{ id: "llama-rn", status: "available", reason: null }],
  })),
}));

jest.mock("../../core/extensions", () => ({
  listExtensions: jest.fn(() => [
    {
      id: "ext-1",
      name: "Test Extension",
      kind: "tool",
      description: "A test extension",
    },
  ]),
}));

beforeEach(() => {
  AsyncStorage.clear();
  jest.clearAllMocks();
});

describe("ModelsScreen", () => {
  it("renders title and eyebrow", async () => {
    const { getByText } = await render(<ModelsScreen />);
    await waitFor(() => {
      expect(getByText("SPARTANCODE / MODELS")).toBeTruthy();
      expect(getByText("Local Models")).toBeTruthy();
    });
  });

  it("shows offline status", async () => {
    const { getByText } = await render(<ModelsScreen />);
    await waitFor(() => {
      expect(getByText("LOCAL")).toBeTruthy();
    });
  });

  it("renders device readiness section", async () => {
    const { getByText } = await render(<ModelsScreen />);
    await waitFor(() => {
      expect(getByText("Device readiness")).toBeTruthy();
      expect(getByText(/test-chipset/)).toBeTruthy();
    });
  });

  it("renders licensed local models", async () => {
    const { getByText } = await render(<ModelsScreen />);
    await waitFor(() => {
      expect(getByText("Licensed local models")).toBeTruthy();
      expect(getByText("qwen-1.7b")).toBeTruthy();
    });
  });

  it("renders HuggingFace search input", async () => {
    const { getByPlaceholderText } = await render(<ModelsScreen />);
    await waitFor(() => {
      expect(getByPlaceholderText("Search all community models")).toBeTruthy();
    });
  });

  it("searches HuggingFace models", async () => {
    const { getByPlaceholderText, getByText } = await render(<ModelsScreen />);
    await waitFor(() => {
      expect(getByPlaceholderText("Search all community models")).toBeTruthy();
    });

    const searchInput = getByPlaceholderText("Search all community models");

    await act(async () => {
      fireEvent.changeText(searchInput, "llama");
    });

    await act(async () => {
      fireEvent.press(getByText("Search Hugging Face"));
    });

    await waitFor(
      () => {
        expect(getByText("test-org/test-model")).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });

  it("renders community model form inputs", async () => {
    const { getByPlaceholderText } = await render(<ModelsScreen />);
    await waitFor(() => {
      expect(getByPlaceholderText("owner/model")).toBeTruthy();
      expect(getByPlaceholderText("Declared license")).toBeTruthy();
    });
  });

  it("renders extensions section", async () => {
    const { getByText } = await render(<ModelsScreen />);
    await waitFor(() => {
      expect(getByText("Offline extensions")).toBeTruthy();
      expect(getByText("Test Extension")).toBeTruthy();
    });
  });

  it("renders device verification checks", async () => {
    const { getByText } = await render(<ModelsScreen />);
    await waitFor(() => {
      expect(getByText(/RAM.*8192 MB/)).toBeTruthy();
    });
  });

  it("renders device diagnostics", async () => {
    const { getByText } = await render(<ModelsScreen />);
    await waitFor(() => {
      expect(getByText("Device looks capable")).toBeTruthy();
    });
  });

  it("renders uncensored and distilled toggles", async () => {
    const { getByText } = await render(<ModelsScreen />);
    await waitFor(() => {
      expect(getByText("Uncensored model")).toBeTruthy();
      expect(getByText("Distilled model")).toBeTruthy();
    });
  });
});
