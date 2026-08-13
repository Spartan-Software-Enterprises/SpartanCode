import { normalizeBridgeSnapshot } from "./bridge";

describe("MCP Bridge snapshots", () => {
  it("normalizes a valid remote snapshot as online", () => {
    expect(
      normalizeBridgeSnapshot({
        missions: [
          {
            id: "m1",
            description: "Build it",
            status: "planning",
            updatedAt: "2026-08-13T00:00:00.000Z",
          },
        ],
        connections: [],
        pendingApprovals: 2,
      }),
    ).toEqual({
      missions: [
        {
          id: "m1",
          description: "Build it",
          status: "planning",
          updatedAt: "2026-08-13T00:00:00.000Z",
        },
      ],
      connections: [],
      pendingApprovals: 2,
      offline: false,
    });
  });

  it("rejects malformed bridge responses", () => {
    expect(() => normalizeBridgeSnapshot(null)).toThrow("invalid snapshot");
  });

  it("rejects malformed mission and connection items", () => {
    expect(() =>
      normalizeBridgeSnapshot({ missions: [{ id: "bad" }], connections: [] }),
    ).toThrow("malformed snapshot items");
    expect(() =>
      normalizeBridgeSnapshot({ missions: [], connections: [{ id: "bad" }] }),
    ).toThrow("malformed snapshot items");
  });
});
