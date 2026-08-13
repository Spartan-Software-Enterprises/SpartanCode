const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const {
  CollaborationConflictError,
  appendEvent,
  createSession,
  joinSession,
  mergeEvents,
} = require("./collaboration");
const { createMissionStore } = require("./mission-store");

test("collaboration journal appends versioned events from joined participants", () => {
  let session = createSession({
    name: "Roadmap",
    ownerId: "owner",
    now: "2026-08-13T00:00:00.000Z",
  });
  session = joinSession(session, {
    participantId: "builder",
    now: "2026-08-13T00:01:00.000Z",
  });
  session = appendEvent(
    session,
    {
      eventId: "event-1",
      authorId: "builder",
      type: "mission.created",
      payload: { missionId: "mission-1" },
      baseRevision: 0,
    },
    { now: "2026-08-13T00:02:00.000Z" },
  );
  assert.equal(session.revision, 1);
  assert.equal(session.events[0].revision, 1);
  assert.throws(
    () =>
      appendEvent(session, {
        eventId: "event-2",
        authorId: "owner",
        type: "mission.updated",
        payload: { status: "building" },
        baseRevision: 0,
      }),
    CollaborationConflictError,
  );
});

test("collaboration merge is idempotent and deterministic", () => {
  const session = joinSession(
    createSession({ name: "Roadmap", ownerId: "owner" }),
    { participantId: "builder" },
  );
  const event = {
    id: "event-1",
    authorId: "builder",
    type: "artifact.added",
    payload: { artifactId: "artifact-1" },
    createdAt: "2026-08-13T00:02:00.000Z",
  };
  const once = mergeEvents(session, [event]);
  const twice = mergeEvents(once, [event]);
  assert.equal(once.revision, 1);
  assert.equal(twice.revision, 1);
  assert.equal(twice.events[0].id, "event-1");
});

test("collaboration sessions survive workspace reload", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "spartancode-collab-"),
  );
  const filePath = path.join(directory, "workspace.json");
  const first = createMissionStore(filePath);
  first.collaborationCreate({
    name: "Shared roadmap",
    ownerId: "owner",
    id: "session-1",
  });
  first.collaborationJoin("session-1", {
    participantId: "reviewer",
    role: "observer",
  });
  first.collaborationAppend("session-1", {
    eventId: "event-1",
    authorId: "owner",
    type: "review.requested",
    payload: { artifactId: "artifact-1" },
    baseRevision: 0,
  });
  const reloaded = createMissionStore(filePath).collaborationList();
  assert.equal(reloaded[0].revision, 1);
  assert.equal(reloaded[0].participants.length, 2);
  fs.rmSync(directory, { recursive: true, force: true });
});
