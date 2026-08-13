import {
  createMobileCollaborationSession,
  mergeCollaborationSessions,
  normalizeCollaborationSessions,
} from "./collaboration";

describe("standalone Android collaboration sessions", () => {
  it("creates a local session without a bridge", () => {
    const session = createMobileCollaborationSession(
      "Android roadmap",
      "owner",
      "2026-08-13T00:00:00.000Z",
    );
    expect(session.id).toMatch(/^android-session:/);
    expect(session.participants[0]).toMatchObject({
      id: "owner",
      role: "owner",
    });
    expect(session.revision).toBe(0);
  });

  it("keeps the newest valid session during remote merge", () => {
    const local = createMobileCollaborationSession(
      "Roadmap",
      "owner",
      "2026-08-13T00:00:00.000Z",
    );
    const remote = {
      ...local,
      revision: 2,
      updatedAt: "2026-08-13T00:02:00.000Z",
    };
    expect(mergeCollaborationSessions([local], [remote])[0]!.revision).toBe(2);
    expect(
      normalizeCollaborationSessions([remote, { malformed: true }]),
    ).toHaveLength(1);
  });
});
