import { approvalGestureDecision } from "./gesture";

describe("approval gestures", () => {
  it("accepts deliberate horizontal swipes", () => {
    expect(approvalGestureDecision(120, 10)).toBe("approved");
    expect(approvalGestureDecision(-120, 10)).toBe("denied");
  });

  it("ignores taps, vertical movement, and diagonal ambiguity", () => {
    expect(approvalGestureDecision(20, 0)).toBeNull();
    expect(approvalGestureDecision(100, 130)).toBeNull();
    expect(approvalGestureDecision(100, 100)).toBeNull();
  });
});
