import { normalizeBridgeEndpoint, normalizeBridgeSnapshot } from "./bridge";

describe("MCP Bridge snapshots", () => {
  it("normalizes secure endpoints and allows local development", () => {
    expect(normalizeBridgeEndpoint("https://bridge.example/")).toBe(
      "https://bridge.example",
    );
    expect(normalizeBridgeEndpoint("http://localhost:8787/")).toBe(
      "http://localhost:8787",
    );
    expect(() => normalizeBridgeEndpoint("http://bridge.example")).toThrow(
      "HTTPS",
    );
  });
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
        syncedAt: "2026-08-13T00:00:00.000Z",
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
      syncedAt: "2026-08-13T00:00:00.000Z",
      artifacts: [],
      approvals: [],
      activity: [],
      auditLog: [],
      offline: false,
    });
  });

  it("adds a verified sync timestamp when the bridge omits one", () => {
    const snapshot = normalizeBridgeSnapshot({ missions: [], connections: [] });
    expect(snapshot.offline).toBe(false);
    expect(Date.parse(snapshot.syncedAt ?? "")).not.toBeNaN();
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
