const crypto = require("crypto");

const MAX_PAYLOAD_BYTES = 64 * 1024;

class CollaborationConflictError extends Error {
  constructor(message, session) {
    super(message);
    this.name = "CollaborationConflictError";
    this.session = session;
  }
}

function requiredString(value, label, max = 200) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result || result.length > max) throw new Error(`${label} is invalid`);
  return result;
}

function safePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    throw new Error("Collaboration payload must be an object");
  const serialized = JSON.stringify(payload);
  if (Buffer.byteLength(serialized, "utf8") > MAX_PAYLOAD_BYTES)
    throw new Error("Collaboration payload is too large");
  return JSON.parse(serialized);
}

function createSession({ id = crypto.randomUUID(), name, ownerId, now } = {}) {
  const createdAt = now || new Date().toISOString();
  return {
    id: requiredString(id, "Session id", 120),
    name: requiredString(name, "Session name"),
    revision: 0,
    participants: [
      {
        id: requiredString(ownerId, "Owner id", 120),
        role: "owner",
        joinedAt: createdAt,
      },
    ],
    events: [],
    createdAt,
    updatedAt: createdAt,
  };
}

function joinSession(session, { participantId, role = "member", now } = {}) {
  const id = requiredString(participantId, "Participant id", 120);
  if (!["owner", "member", "observer"].includes(role))
    throw new Error("Participant role is invalid");
  if (session.participants.some((participant) => participant.id === id))
    return session;
  const joinedAt = now || new Date().toISOString();
  return {
    ...session,
    participants: [...session.participants, { id, role, joinedAt }],
    updatedAt: joinedAt,
  };
}

function appendEvent(
  session,
  { eventId, authorId, type, payload, baseRevision } = {},
  { now } = {},
) {
  const id = requiredString(eventId || crypto.randomUUID(), "Event id", 160);
  const existing = session.events.find((event) => event.id === id);
  if (existing) return session;
  const author = requiredString(authorId, "Author id", 120);
  if (!session.participants.some((participant) => participant.id === author))
    throw new Error("Author must join the collaboration session");
  if (baseRevision !== session.revision)
    throw new CollaborationConflictError(
      `Session revision conflict: expected ${session.revision}`,
      session,
    );
  const eventType = requiredString(type, "Event type", 100);
  const createdAt = now || new Date().toISOString();
  return {
    ...session,
    revision: session.revision + 1,
    events: [
      ...session.events,
      {
        id,
        sessionId: session.id,
        authorId: author,
        type: eventType,
        payload: safePayload(payload),
        baseRevision,
        revision: session.revision + 1,
        createdAt,
      },
    ],
    updatedAt: createdAt,
  };
}

function mergeEvents(session, incomingEvents, { now } = {}) {
  if (!Array.isArray(incomingEvents))
    throw new Error("Events must be an array");
  let merged = session;
  const events = [...incomingEvents].sort((left, right) =>
    `${left.createdAt}:${left.id}`.localeCompare(
      `${right.createdAt}:${right.id}`,
    ),
  );
  for (const event of events) {
    if (merged.events.some((existing) => existing.id === event.id)) continue;
    merged = appendEvent(
      merged,
      {
        eventId: event.id,
        authorId: event.authorId,
        type: event.type,
        payload: event.payload,
        baseRevision: merged.revision,
      },
      { now: now || event.createdAt },
    );
  }
  return merged;
}

function createCollaborationStore({ persist, initialSessions = [] } = {}) {
  const sessions = new Map(
    initialSessions.map((session) => [session.id, session]),
  );
  const save = () => {
    if (typeof persist === "function") persist([...sessions.values()]);
  };
  const get = (id) =>
    sessions.get(requiredString(id, "Session id", 120)) || null;
  return {
    list() {
      return [...sessions.values()].map((session) =>
        JSON.parse(JSON.stringify(session)),
      );
    },
    get,
    create(input) {
      const session = createSession(input);
      sessions.set(session.id, session);
      save();
      return session;
    },
    join(id, input) {
      const session = get(id);
      if (!session) throw new Error("Collaboration session was not found");
      const next = joinSession(session, input);
      sessions.set(next.id, next);
      save();
      return next;
    },
    append(id, event, options) {
      const session = get(id);
      if (!session) throw new Error("Collaboration session was not found");
      const next = appendEvent(session, event, options);
      sessions.set(next.id, next);
      save();
      return next;
    },
    merge(id, events, options) {
      const session = get(id);
      if (!session) throw new Error("Collaboration session was not found");
      const next = mergeEvents(session, events, options);
      sessions.set(next.id, next);
      save();
      return next;
    },
  };
}

module.exports = {
  CollaborationConflictError,
  appendEvent,
  createCollaborationStore,
  createSession,
  joinSession,
  mergeEvents,
};
