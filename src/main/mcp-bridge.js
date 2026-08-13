const http = require("node:http");
const { exportAuditLog } = require("./audit-export");
const { createOidcAuthenticator } = require("./oidc");

function createBridgeEventHub({ maxEvents = 100 } = {}) {
  let sequence = 0;
  const events = [];
  const clients = new Set();
  return {
    publish(type, data) {
      const event = { id: String(++sequence), type, data };
      events.push(event);
      while (events.length > maxEvents) events.shift();
      for (const client of clients) {
        client.write(
          `id: ${event.id}\nevent: ${type}\ndata: ${JSON.stringify(data)}\n\n`,
        );
      }
      return event;
    },
    connect(response, lastEventId = "0") {
      response.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-store",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });
      response.write(": connected\n\n");
      for (const event of events) {
        if (Number(event.id) > Number(lastEventId))
          response.write(
            `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`,
          );
      }
      clients.add(response);
      response.on("close", () => clients.delete(response));
    },
  };
}

const json = (response, status, body) => {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });
  response.end(JSON.stringify(body));
};

function createBridgeRequestHandler({
  store,
  runMission,
  token = null,
  tokenScopes = null,
  oidc = null,
  events = null,
  allowUnauthenticated = false,
  requiresMissionApproval = () => false,
  idempotencyCache = new Map(),
}) {
  if (!store || typeof store.snapshot !== "function")
    throw new Error("A mission store is required");
  const oidcAuthenticator = oidc ? createOidcAuthenticator(oidc) : null;
  const authenticate = async (request) => {
    if (token && request.headers.authorization === `Bearer ${token}`) {
      const scopes = tokenScopes?.[token];
      return {
        authenticated: true,
        // A plain token remains a trusted local-development credential. Scoped
        // credentials opt into least-privilege enforcement.
        scopes: Array.isArray(scopes) ? scopes : ["*"],
      };
    }
    if (oidcAuthenticator)
      return oidcAuthenticator.authenticate(request.headers.authorization);
    if (!token && allowUnauthenticated)
      return { authenticated: true, scopes: ["*"] };
    return { authenticated: false, scopes: [] };
  };
  return async (request, response) => {
    if (request.method === "OPTIONS") return json(response, 204, {});
    const identity = await authenticate(request);
    if (!identity.authenticated)
      return json(response, 401, { error: "Unauthorized" });
    const requireScope = (scope) =>
      identity.scopes.includes("*") || identity.scopes.includes(scope);
    const forbidden = (scope) =>
      json(response, 403, { error: `Scope required: ${scope}` });
    const url = new URL(request.url || "/", "http://bridge.local");
    if (request.method === "GET" && url.pathname === "/v1/snapshot") {
      if (!requireScope("snapshot")) return forbidden("snapshot");
      return json(response, 200, {
        ...store.snapshot(),
        syncedAt: new Date().toISOString(),
      });
    }
    if (request.method === "GET" && url.pathname === "/v1/audit") {
      if (!requireScope("audit")) return forbidden("audit");
      return json(response, 200, { auditLog: store.auditLog() });
    }
    if (request.method === "GET" && url.pathname === "/v1/audit/export") {
      if (!requireScope("audit")) return forbidden("audit");
      return json(response, 200, exportAuditLog(store.auditLog()));
    }
    if (
      request.method === "GET" &&
      url.pathname === "/v1/collaboration/sessions"
    ) {
      if (!requireScope("collaboration:read"))
        return forbidden("collaboration:read");
      if (typeof store.collaborationList !== "function")
        return json(response, 404, { error: "Collaboration unavailable" });
      return json(response, 200, {
        sessions: store.collaborationList(),
      });
    }
    if (request.method === "GET" && url.pathname === "/v1/events") {
      if (!requireScope("events:read")) return forbidden("events:read");
      if (!events) return json(response, 404, { error: "Events unavailable" });
      return events.connect(response, request.headers["last-event-id"] || "0");
    }
    if (request.method !== "POST")
      return json(response, 404, { error: "Not found" });
    const mutationScope =
      url.pathname === "/v1/missions"
        ? "missions:write"
        : url.pathname.startsWith("/v1/approvals/")
          ? "approvals:write"
          : url.pathname.startsWith("/v1/artifacts/")
            ? "artifacts:write"
            : url.pathname.startsWith("/v1/collaboration/")
              ? "collaboration:write"
              : null;
    if (mutationScope && !requireScope(mutationScope))
      return forbidden(mutationScope);
    const idempotencyKey = request.headers["idempotency-key"];
    const cacheKey =
      typeof idempotencyKey === "string" && idempotencyKey.length <= 256
        ? `${request.method}:${url.pathname}:${idempotencyKey}`
        : null;
    const cached = cacheKey ? idempotencyCache.get(cacheKey) : null;
    if (cached) return json(response, cached.status, cached.body);
    const mutationResponse = (status, body) => {
      if (cacheKey) {
        while (idempotencyCache.size >= 1000)
          idempotencyCache.delete(idempotencyCache.keys().next().value);
        idempotencyCache.set(cacheKey, { status, body });
      }
      return json(response, status, body);
    };
    let body;
    try {
      body = await readJson(request);
    } catch (error) {
      return json(response, 400, { error: error.message || "Invalid JSON" });
    }
    if (url.pathname === "/v1/missions") {
      if (
        !body ||
        typeof body.description !== "string" ||
        !body.description.trim()
      )
        return json(response, 400, {
          error: "A mission description is required",
        });
      const mission = store.addMission(body.description.trim());
      if (requiresMissionApproval(mission.description)) {
        const approval = store.requestApproval({
          missionId: mission.id,
          title: "Permission needed before execution",
          detail:
            "This mission may change your system or publish data. Review and approve before the agents continue.",
        });
        store.updateMission(mission.id, {
          status: "awaiting_approval",
          approvalId: approval.id,
        });
        return mutationResponse(202, {
          mission: store.snapshot().missions.find((item) => item.id === mission.id),
          approval,
          operationId: `mission:${mission.id}`,
        });
      }
      if (typeof runMission === "function") runMission(mission);
      return mutationResponse(201, { mission, operationId: `mission:${mission.id}` });
    }
    if (url.pathname === "/v1/collaboration/sessions") {
      if (typeof store.collaborationCreate !== "function")
        return json(response, 404, { error: "Collaboration unavailable" });
      try {
        const session = store.collaborationCreate(body || {});
        events?.publish("collaboration.session-created", { session });
        return mutationResponse(201, {
          session,
          operationId: `collaboration-session:${session.id}`,
        });
      } catch (error) {
        return json(response, 400, { error: error.message });
      }
    }
    const collaborationMatch = url.pathname.match(
      /^\/v1\/collaboration\/sessions\/([^/]+)\/(participants|events|merge)$/,
    );
    if (collaborationMatch) {
      if (
        typeof store.collaborationJoin !== "function" ||
        typeof store.collaborationAppend !== "function" ||
        typeof store.collaborationMerge !== "function"
      )
        return json(response, 404, { error: "Collaboration unavailable" });
      const [, sessionId, action] = collaborationMatch;
      try {
        let session;
        if (action === "participants")
          session = store.collaborationJoin(sessionId, body || {});
        else if (action === "events")
          session = store.collaborationAppend(
            sessionId,
            body?.event || body || {},
            body?.options || {},
          );
        else
          session = store.collaborationMerge(
            sessionId,
            Array.isArray(body?.events) ? body.events : body,
            body?.options || {},
          );
        events?.publish(`collaboration.${action}`, { session });
        return mutationResponse(200, {
          session,
          operationId: `collaboration:${session.id}:${session.revision}`,
        });
      } catch (error) {
        if (error.name === "CollaborationConflictError")
          return json(response, 409, {
            error: error.message,
            session: error.session,
          });
        if (/not found/i.test(error.message))
          return json(response, 404, { error: error.message });
        return json(response, 400, { error: error.message });
      }
    }
    const approvalMatch = url.pathname.match(
      /^\/v1\/approvals\/([^/]+)\/decision$/,
    );
    if (approvalMatch) {
      if (!body || !["approved", "denied"].includes(body.decision))
        return json(response, 400, {
          error: "Decision must be approved or denied",
        });
      const approval = store.resolveApproval(approvalMatch[1], body.decision);
      if (!approval)
        return json(response, 404, { error: "Approval not found" });
      return mutationResponse(200, {
        approval,
        operationId: `approval:${approval.id}`,
      });
    }
    const artifactMatch = url.pathname.match(
      /^\/v1\/artifacts\/([^/]+)\/review$/,
    );
    if (artifactMatch) {
      if (!body || !["accepted", "rejected"].includes(body.decision))
        return json(response, 400, {
          error: "Decision must be accepted or rejected",
        });
      const artifact = store.reviewArtifact(
        artifactMatch[1],
        body.decision,
        body.note || "",
      );
      if (!artifact)
        return json(response, 404, { error: "Artifact not found" });
      return mutationResponse(200, {
        artifact,
        operationId: `artifact:${artifact.id}`,
      });
    }
    return json(response, 404, { error: "Not found" });
  };
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024)
        request.destroy(new Error("Request too large"));
    });
    request.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    request.on("error", reject);
  });
}

function createBridgeServer(options) {
  const events = options.events || createBridgeEventHub();
  const server = http.createServer(
    createBridgeRequestHandler({ ...options, events }),
  );
  server.events = events;
  return server;
}

module.exports = {
  createBridgeEventHub,
  createBridgeRequestHandler,
  createBridgeServer,
};
