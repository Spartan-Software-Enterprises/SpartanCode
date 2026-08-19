import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Text } from "react-native";
import { ErrorBoundary } from "../ErrorBoundary";

function ProblemChild() {
  throw new Error("Test error");
  return null;
}

function GoodChild() {
  return <Text>hello</Text>;
}

describe("ErrorBoundary", () => {
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it("renders children when no error", async () => {
    const { getByText } = await render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>,
    );
    expect(getByText("hello")).toBeTruthy();
  });

  it("renders error UI when child throws", async () => {
    const { getByText } = await render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>,
    );
    expect(getByText("Something went wrong")).toBeTruthy();
    expect(getByText("Test error")).toBeTruthy();
    expect(getByText("Try again")).toBeTruthy();
  });

  it("shows generic message when error has no message", async () => {
    function ThrowNoMessage() {
      throw new Error();
      return null;
    }
    const { getByText } = await render(
      <ErrorBoundary>
        <ThrowNoMessage />
      </ErrorBoundary>,
    );
    expect(getByText("Unknown error")).toBeTruthy();
  });

  it("retries by clearing error state", async () => {
    let shouldFail = true;
    function ConditionalChild() {
      if (shouldFail) throw new Error("Fail first");
      return <Text>recovered</Text>;
    }

    const { getByText, queryByText } = await render(
      <ErrorBoundary>
        <ConditionalChild />
      </ErrorBoundary>,
    );

    expect(getByText("Something went wrong")).toBeTruthy();

    shouldFail = false;
    await fireEvent.press(getByText("Try again"));

    expect(queryByText("Something went wrong")).toBeNull();
    expect(getByText("recovered")).toBeTruthy();
  });

  it("renders custom fallback when provided", async () => {
    const fallback = <Text>Custom Error UI</Text>;
    const { getByText } = await render(
      <ErrorBoundary fallback={fallback}>
        <ProblemChild />
      </ErrorBoundary>,
    );
    expect(getByText("Custom Error UI")).toBeTruthy();
  });

  it("logs error to console", async () => {
    await render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>,
    );
    expect(console.error).toHaveBeenCalled();
  });
});
