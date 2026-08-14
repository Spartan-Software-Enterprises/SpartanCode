import {
  bridgeRequest,
  normalizeBridgeEndpoint,
  normalizeBridgeSnapshot,
  syncArtifactSets,
} from "./bridge";

const artifact = {
  id: "a1",
  name: "README",
  type: "document",
  status: "draft",
  createdAt: "2026-08-13T00:00:00.000Z",
};

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

  it("cancels before retrying an unavailable bridge", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      bridgeRequest("http://localhost:8787", "/v1/snapshot", {
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("validates and returns the bridge artifact merge contract", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          merged: [artifact],
          conflicts: [],
          requiresReview: false,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ) as jest.Mock;
    await expect(
      syncArtifactSets("http://localhost:8787", [], [artifact], [artifact]),
    ).resolves.toEqual({
      merged: [artifact],
      conflicts: [],
      requiresReview: false,
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8787/v1/artifacts/sync",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("rejects a malformed artifact merge response", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ merged: [{ id: "bad" }] }), {
        status: 200,
      }),
    ) as jest.Mock;
    await expect(
      syncArtifactSets("http://localhost:8787", [], [], []),
    ).rejects.toThrow("malformed artifact sync data");
  });
});
