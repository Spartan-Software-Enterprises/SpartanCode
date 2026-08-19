import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import AppNavigator from "../AppNavigator";

jest.mock("../../screens/ChatScreen", () => {
  const { Text } = require("react-native");
  return { __esModule: true, default: () => <Text>Chat</Text> };
});
jest.mock("../../screens/MissionsScreen", () => {
  const { Text } = require("react-native");
  return { __esModule: true, default: () => <Text>Missions</Text> };
});
jest.mock("../../screens/ModelsScreen", () => {
  const { Text } = require("react-native");
  return { __esModule: true, default: () => <Text>Models</Text> };
});
jest.mock("../../screens/SettingsScreen", () => {
  const { Text } = require("react-native");
  return { __esModule: true, default: () => <Text>Settings</Text> };
});

describe("AppNavigator", () => {
  it("renders all four tab screens", async () => {
    const { getByText } = await render(<AppNavigator />);
    expect(getByText("Chat")).toBeTruthy();
    expect(getByText("Missions")).toBeTruthy();
    expect(getByText("Models")).toBeTruthy();
    expect(getByText("Settings")).toBeTruthy();
  });
});
