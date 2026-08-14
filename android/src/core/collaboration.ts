export type MobileCollaborationParticipant = {
  id: string;
  role: "owner" | "member" | "observer";
  joinedAt: string;
};

export type MobileCollaborationEvent = {
  id: string;
  sessionId: string;
  authorId: string;
  type: string;
  payload: Record<string, unknown>;
  baseRevision: number;
  revision: number;
  createdAt: string;
};

export type MobileCollaborationSession = {
  id: string;
  name: string;
  revision: number;
  participants: MobileCollaborationParticipant[];
  events: MobileCollaborationEvent[];
  createdAt: string;
  updatedAt: string;
};

export function isCollaborationSession(
  value: unknown,
): value is MobileCollaborationSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<MobileCollaborationSession>;
  return (
    typeof session.id === "string" &&
    typeof session.name === "string" &&
    typeof session.revision === "number" &&
    Number.isInteger(session.revision) &&
    session.revision >= 0 &&
    Array.isArray(session.participants) &&
    session.participants.every(isParticipant) &&
    Array.isArray(session.events) &&
    session.events.every(isEvent) &&
    typeof session.createdAt === "string" &&
    typeof session.updatedAt === "string"
  );
}

function isParticipant(
  value: unknown,
): value is MobileCollaborationParticipant {
  if (!value || typeof value !== "object") return false;
  const participant = value as Partial<MobileCollaborationParticipant>;
  return (
    typeof participant.id === "string" &&
    ["owner", "member", "observer"].includes(participant.role as string) &&
    typeof participant.joinedAt === "string"
  );
}

function isEvent(value: unknown): value is MobileCollaborationEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<MobileCollaborationEvent>;
  return (
    typeof event.id === "string" &&
    typeof event.sessionId === "string" &&
    typeof event.authorId === "string" &&
    typeof event.type === "string" &&
    !!event.payload &&
    typeof event.payload === "object" &&
    !Array.isArray(event.payload) &&
    typeof event.baseRevision === "number" &&
    Number.isInteger(event.baseRevision) &&
    typeof event.revision === "number" &&
    Number.isInteger(event.revision) &&
    typeof event.createdAt === "string"
  );
}

export function normalizeCollaborationSessions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter(isCollaborationSession);
}

export function mergeCollaborationSessions(
  local: MobileCollaborationSession[],
  remote: MobileCollaborationSession[],
) {
  const merged = new Map(local.map((session) => [session.id, session]));
  for (const session of remote) {
    const current = merged.get(session.id);
    if (!current || session.revision > current.revision)
      merged.set(session.id, session);
  }
  return [...merged.values()].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export function createMobileCollaborationSession(
  name: string,
  ownerId = "android-local",
  now = new Date().toISOString(),
): MobileCollaborationSession {
  const safeName = name.trim();
  if (!safeName) throw new Error("Session name is required");
  const id = `android-session:${Date.now()}`;
  return {
    id,
    name: safeName,
    revision: 0,
    participants: [{ id: ownerId, role: "owner", joinedAt: now }],
    events: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function appendMobileCollaborationEvent(
  session: MobileCollaborationSession,
  input: {
    authorId: string;
    type: string;
    payload: Record<string, unknown>;
    expectedRevision?: number;
  },
  now = new Date().toISOString(),
): MobileCollaborationSession {
  if (!input.authorId.trim()) throw new Error("Event author is required");
  if (!input.type.trim()) throw new Error("Event type is required");
  if (!input.payload || Array.isArray(input.payload))
    throw new Error("Event payload must be an object");
  const expectedRevision = input.expectedRevision ?? session.revision;
  if (expectedRevision !== session.revision)
    throw new Error("Collaboration revision conflict; refresh the session");
  const participant = session.participants.find(
    (item) => item.id === input.authorId,
  );
  if (!participant || participant.role === "observer")
    throw new Error("Only a session owner or member can append events");
  const revision = session.revision + 1;
  return {
    ...session,
    revision,
    updatedAt: now,
    events: [
      ...session.events,
      {
        id: `${session.id}:event:${revision}`,
        sessionId: session.id,
        authorId: input.authorId,
        type: input.type.trim().slice(0, 80),
        payload: { ...input.payload },
        baseRevision: session.revision,
        revision,
        createdAt: now,
      },
    ],
  };
}
