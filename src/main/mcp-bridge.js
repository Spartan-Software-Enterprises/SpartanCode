const http = require("node:http");

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
  events = null,
  idempotencyCache = new Map(),
}) {
  if (!store || typeof store.snapshot !== "function")
    throw new Error("A mission store is required");
  const authenticate = (request) => {
    if (!token) return true;
    return request.headers.authorization === `Bearer ${token}`;
  };
  return async (request, response) => {
    if (request.method === "OPTIONS") return json(response, 204, {});
    if (!authenticate(request))
      return json(response, 401, { error: "Unauthorized" });
    const url = new URL(request.url || "/", "http://bridge.local");
    if (request.method === "GET" && url.pathname === "/v1/snapshot") {
      return json(response, 200, {
        ...store.snapshot(),
        syncedAt: new Date().toISOString(),
      });
    }
    if (request.method === "GET" && url.pathname === "/v1/audit") {
      return json(response, 200, { auditLog: store.auditLog() });
    }
    if (request.method === "GET" && url.pathname === "/v1/events") {
      if (!events) return json(response, 404, { error: "Events unavailable" });
      return events.connect(response, request.headers["last-event-id"] || "0");
    }
    if (request.method !== "POST")
      return json(response, 404, { error: "Not found" });
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
      if (typeof runMission === "function") runMission(mission);
      return mutationResponse(201, {
        mission,
        operationId: `mission:${mission.id}`,
      });
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
