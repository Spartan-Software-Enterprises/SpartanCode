const http = require("node:http");

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

function createBridgeRequestHandler({ store, runMission, token = null }) {
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
    if (request.method !== "POST")
      return json(response, 404, { error: "Not found" });
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
      return json(response, 201, {
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
      return json(response, 200, {
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
      return json(response, 200, {
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
  const server = http.createServer(createBridgeRequestHandler(options));
  return server;
}

module.exports = { createBridgeRequestHandler, createBridgeServer };
