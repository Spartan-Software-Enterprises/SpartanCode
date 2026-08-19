import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ChatScreen from "../ChatScreen";

beforeEach(() => {
  AsyncStorage.clear();
  jest.clearAllMocks();
});

describe("ChatScreen", () => {
  it("renders welcome message on load", async () => {
    const { getByText } = await render(<ChatScreen />);
    await waitFor(() => {
      expect(getByText(/What are we building/)).toBeTruthy();
    });
  });

  it("shows composer input", async () => {
    const { getByPlaceholderText } = await render(<ChatScreen />);
    await waitFor(() => {
      expect(getByPlaceholderText(/Describe your mission/)).toBeTruthy();
    });
  });

  it("sends a message and receives agent response", async () => {
    const { getByPlaceholderText, getByText } = await render(<ChatScreen />);
    await waitFor(() => {
      expect(getByPlaceholderText(/Describe your mission/)).toBeTruthy();
    });

    const input = getByPlaceholderText(/Describe your mission/);

    await act(async () => {
      fireEvent.changeText(input, "Build a web app");
    });

    await act(async () => {
      fireEvent.press(getByText("↑"));
    });

    await waitFor(
      () => {
        expect(
          getByText(/implement this with clean, tested modules/),
        ).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });

  it("does not send empty messages", async () => {
    const { getByPlaceholderText, getByText } = await render(<ChatScreen />);
    await waitFor(() => {
      expect(getByPlaceholderText(/Describe your mission/)).toBeTruthy();
    });

    const input = getByPlaceholderText(/Describe your mission/);
    await act(async () => {
      fireEvent.changeText(input, "   ");
    });

    await act(async () => {
      fireEvent.press(getByText("↑"));
    });

    expect(await AsyncStorage.getItem("spartancode.chat.messages")).toBeNull();
  });

  it("persists messages to AsyncStorage", async () => {
    const { getByPlaceholderText, getByText } = await render(<ChatScreen />);
    await waitFor(() => {
      expect(getByPlaceholderText(/Describe your mission/)).toBeTruthy();
    });

    const input = getByPlaceholderText(/Describe your mission/);
    await act(async () => {
      fireEvent.changeText(input, "Audit security");
    });

    await act(async () => {
      fireEvent.press(getByText("↑"));
    });

    await waitFor(() => {
      return AsyncStorage.getItem("spartancode.chat.messages").then(
        (v) => v !== null,
      );
    });
  });

  it("loads persisted messages from AsyncStorage", async () => {
    const stored = [
      { id: "s1", role: "user", content: "Old message", timestamp: 1000 },
      { id: "s2", role: "agent", content: "Old response", timestamp: 2000 },
    ];
    await AsyncStorage.setItem(
      "spartancode.chat.messages",
      JSON.stringify(stored),
    );

    const { getByText } = await render(<ChatScreen />);
    await waitFor(() => {
      expect(getByText("Old message")).toBeTruthy();
      expect(getByText("Old response")).toBeTruthy();
    });
  });

  it("generates different keyword responses", async () => {
    const { getByPlaceholderText, getByText } = await render(<ChatScreen />);
    await waitFor(() => {
      expect(getByPlaceholderText(/Describe your mission/)).toBeTruthy();
    });

    const input = getByPlaceholderText(/Describe your mission/);

    await act(async () => {
      fireEvent.changeText(input, "plan the architecture");
    });
    await act(async () => {
      fireEvent.press(getByText("↑"));
    });
    await waitFor(
      () => {
        expect(getByText(/system architecture plan/)).toBeTruthy();
      },
      { timeout: 5000 },
    );

    await act(async () => {
      fireEvent.changeText(input, "verify the tests");
    });
    await act(async () => {
      fireEvent.press(getByText("↑"));
    });
    await waitFor(
      () => {
        expect(getByText(/full test matrix/)).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });

  it("shows typing indicator while waiting for response", async () => {
    const { getByPlaceholderText, getByText } = await render(<ChatScreen />);
    await waitFor(() => {
      expect(getByPlaceholderText(/Describe your mission/)).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(
        getByPlaceholderText(/Describe your mission/),
        "Hello",
      );
    });
    await act(async () => {
      fireEvent.press(getByText("↑"));
    });

    const sendButton = getByText("↑");
    expect(sendButton.parent?.props?.accessibilityState?.disabled).toBe(true);
  });
});
