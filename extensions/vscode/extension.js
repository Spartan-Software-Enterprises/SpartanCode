const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const http = require("node:http");
const https = require("node:https");

const MAX_BRIDGE_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_SNAPSHOT_BYTES = 2 * 1024 * 1024;

class BridgeRequestError extends Error {
  constructor(status, body) {
    super(`SpartanCode bridge returned ${status}`);
    this.name = "BridgeRequestError";
    this.status = status;
    this.body = body;
  }
}

function bridgeRequestOptions(
  bridgeUrl,
  route,
  token,
  method = "GET",
  body,
  extraHeaders = {},
) {
  if (typeof bridgeUrl !== "string" || bridgeUrl.length > 2048)
    throw new Error("Bridge URL is required and must be bounded");
  const url = new URL(
    route,
    bridgeUrl.endsWith("/") ? bridgeUrl : `${bridgeUrl}/`,
  );
  if (!/^https?:$/.test(url.protocol))
    throw new Error("Bridge URL must use HTTP(S)");
  if (typeof token !== "string" || !token.trim() || token.length > 16 * 1024)
    throw new Error("A bounded bridge token from SecretStorage is required");
  const payload = body === undefined ? null : JSON.stringify(body);
  return {
    url,
    options: {
      method,
      headers: {
        Accept: "application/json",
        ...extraHeaders,
        ...(payload
          ? {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(payload),
            }
          : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
    payload,
  };
}

function requestBridge(
  bridgeUrl,
  route,
  token,
  method = "GET",
  body,
  extraHeaders = {},
) {
  const { url, options, payload } = bridgeRequestOptions(
    bridgeUrl,
    route,
    token,
    method,
    body,
    extraHeaders,
  );
  return new Promise((resolve, reject) => {
    const transport = url.protocol === "https:" ? https : http;
    const request = transport.request(
      url,
      { ...options, timeout: 10_000 },
      (response) => {
        let raw = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          raw += chunk;
          if (Buffer.byteLength(raw, "utf8") > MAX_BRIDGE_RESPONSE_BYTES)
            response.destroy(
              new Error("SpartanCode bridge response is too large"),
            );
        });
        response.on("end", () => {
          let value;
          try {
            value = raw ? JSON.parse(raw) : {};
          } catch {
            value = { raw: raw.slice(0, 4096) };
          }
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new BridgeRequestError(response.statusCode, value));
            return;
          }
          resolve(value);
        });
      },
    );
    request.on("timeout", () =>
      request.destroy(new Error("SpartanCode bridge request timed out")),
    );
    request.on("error", reject);
    if (payload) request.write(payload);
    request.end();
  });
}

function boundedSelection(document, selection) {
  const text = document.getText(selection).trim();
  return text.slice(0, 20_000);
}

function snapshotPath(workspaceFolder) {
  return path.join(workspaceFolder, ".spartancode", "vscode-snapshot.json");
}

function snapshotRevision(snapshot = {}) {
  const serialized = JSON.stringify(snapshot);
  return crypto.createHash("sha256").update(serialized).digest("hex");
}

function snapshotEnvelope(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot))
    throw new Error("SpartanCode snapshot is invalid");
  const envelope = {
    schemaVersion: 1,
    syncedAt: new Date().toISOString(),
    snapshotRevision: snapshotRevision(snapshot),
    summary: summarizeSnapshot(snapshot),
    snapshot,
  };
  const serialized = `${JSON.stringify(envelope, null, 2)}\n`;
  if (Buffer.byteLength(serialized, "utf8") > MAX_SNAPSHOT_BYTES)
    throw new Error("SpartanCode snapshot is too large to persist");
  return serialized;
}

function summarizeSnapshot(snapshot = {}) {
  const missions = Array.isArray(snapshot.missions) ? snapshot.missions : [];
  const approvals = Array.isArray(snapshot.approvals) ? snapshot.approvals : [];
  const artifacts = Array.isArray(snapshot.artifacts) ? snapshot.artifacts : [];
  return {
    missions: missions.length,
    activeMissions: missions.filter(
      (mission) => !["complete", "failed"].includes(mission.status),
    ).length,
    pendingApprovals: approvals.filter(
      (approval) => approval.status === "pending",
    ).length,
    artifacts: artifacts.length,
  };
}

function collaborationEventsRoute(sessionId) {
  const id = String(sessionId || "").trim();
  if (!id || id.length > 120)
    throw new Error("Collaboration session id is invalid");
  return `/v1/collaboration/sessions/${encodeURIComponent(id)}/events`;
}

function collaborationParticipantsRoute(sessionId) {
  return `${collaborationEventsRoute(sessionId).replace(/\/events$/, "")}/participants`;
}

function collaborationEventId() {
  return `vscode-${crypto.randomUUID()}`;
}

function gitRoute(operation) {
  if (!["status", "diff", "stage", "commit"].includes(operation))
    throw new Error("Git operation is invalid");
  return `/v1/git/${operation}`;
}

function boundedGitOutput(value) {
  const output = value && typeof value.output === "string" ? value.output : "";
  return output.slice(0, 50_000);
}

function gitCommitMessage(value) {
  const message = String(value || "").trim();
  if (!message) throw new Error("Git commit message is required");
  if (message.length > 72) throw new Error("Git commit message is too long");
  return message;
}

function boundedNote(value) {
  return String(value || "")
    .trim()
    .slice(0, 4_000);
}

async function activate(context) {
  const vscode = require("vscode");
  const output = vscode.window.createOutputChannel("SpartanCode");
  const status = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    50,
  );
  status.text = "$(sync) SpartanCode";
  status.command = "spartancode.syncSnapshot";
  status.show();
  context.subscriptions.push(output, status);

  const token = () => context.secrets.get("spartancode.bridgeToken");
  const bridgeUrl = () =>
    vscode.workspace.getConfiguration("spartancode").get("bridgeUrl");
  const workspaceFolder = () =>
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  context.subscriptions.push(
    vscode.commands.registerCommand("spartancode.setBridgeToken", async () => {
      const value = await vscode.window.showInputBox({
        prompt: "SpartanCode bridge token",
        password: true,
        ignoreFocusOut: true,
      });
      if (value)
        await context.secrets.store("spartancode.bridgeToken", value.trim());
      vscode.window.showInformationMessage(
        "SpartanCode bridge token saved in VS Code SecretStorage.",
      );
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("spartancode.syncSnapshot", async () => {
      const folder = workspaceFolder();
      if (!folder)
        throw new Error("Open a workspace folder before syncing SpartanCode.");
      const snapshot = await requestBridge(
        bridgeUrl(),
        "/v1/snapshot",
        await token(),
      );
      const target = snapshotPath(folder);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, snapshotEnvelope(snapshot), { mode: 0o600 });
      status.text = `$(check) SpartanCode synced ${new Date().toLocaleTimeString()}`;
      output.appendLine(`Synced snapshot to ${target}`);
      vscode.window.showInformationMessage(
        "SpartanCode workspace snapshot synced.",
      );
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "spartancode.startMissionFromSelection",
      async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
          throw new Error(
            "Open a file and select a mission description first.",
          );
        const description = boundedSelection(editor.document, editor.selection);
        if (!description)
          throw new Error("Select a non-empty mission description first.");
        await requestBridge(
          bridgeUrl(),
          "/v1/missions",
          await token(),
          "POST",
          { description },
        );
        vscode.window.showInformationMessage("SpartanCode mission queued.");
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("spartancode.showStatus", async () => {
      const workspaceStatus = await requestBridge(
        bridgeUrl(),
        "/v1/workspace/status",
        await token(),
      );
      const summary = workspaceStatus.summary || {};
      const revision = String(workspaceStatus.revision || "unknown").slice(
        0,
        12,
      );
      const message = `${summary.activeMissions} active mission${summary.activeMissions === 1 ? "" : "s"} · ${summary.pendingApprovals} pending approval${summary.pendingApprovals === 1 ? "" : "s"} · ${summary.artifacts} artifact${summary.artifacts === 1 ? "" : "s"} · rev ${revision}`;
      status.text = `$(pulse) ${message}`;
      output.appendLine(`Workspace status: ${message}`);
      vscode.window.showInformationMessage(`SpartanCode: ${message}`);
    }),
  );

  for (const [operation, title] of [
    ["status", "Show Git Status"],
    ["diff", "Show Git Diff"],
    ["stage", "Stage Git Changes"],
  ]) {
    context.subscriptions.push(
      vscode.commands.registerCommand(
        `spartancode.git${operation[0].toUpperCase()}${operation.slice(1)}`,
        async () => {
          const result = await requestBridge(
            bridgeUrl(),
            gitRoute(operation),
            await token(),
            operation === "stage" ? "POST" : "GET",
            operation === "stage" ? {} : undefined,
          );
          const resultOutput = boundedGitOutput(result);
          output.appendLine(`Git ${operation}:\n${resultOutput}`);
          vscode.window.showInformationMessage(
            `SpartanCode Git ${operation} completed${resultOutput ? `: ${resultOutput.slice(0, 160)}` : "."}`,
          );
        },
      ),
    );
  }

  context.subscriptions.push(
    vscode.commands.registerCommand("spartancode.gitCommit", async () => {
      const message = gitCommitMessage(
        await vscode.window.showInputBox({
          prompt: "Commit staged SpartanCode workspace changes",
          placeHolder: "Describe the change",
          ignoreFocusOut: true,
          validateInput: (value) => {
            try {
              gitCommitMessage(value);
              return undefined;
            } catch (error) {
              return error.message;
            }
          },
        }),
      );
      const result = await requestBridge(
        bridgeUrl(),
        gitRoute("commit"),
        await token(),
        "POST",
        { message },
      );
      const resultOutput = boundedGitOutput(result);
      output.appendLine(`Git commit:\n${resultOutput}`);
      vscode.window.showInformationMessage("SpartanCode Git commit completed.");
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "spartancode.listCollaborationSessions",
      async () => {
        const result = await requestBridge(
          bridgeUrl(),
          "/v1/collaboration/sessions",
          await token(),
        );
        const sessions = Array.isArray(result.sessions) ? result.sessions : [];
        const message = sessions.length
          ? sessions
              .map(
                (session) => `${session.name} · revision ${session.revision}`,
              )
              .join("\n")
          : "No collaboration sessions available.";
        output.appendLine(`Collaboration sessions:\n${message}`);
        vscode.window.showInformationMessage(message);
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "spartancode.appendCollaborationNote",
      async () => {
        const result = await requestBridge(
          bridgeUrl(),
          "/v1/collaboration/sessions",
          await token(),
        );
        const sessions = Array.isArray(result.sessions) ? result.sessions : [];
        if (!sessions.length)
          throw new Error("No collaboration sessions are available.");
        const choice = await vscode.window.showQuickPick(
          sessions.map((session) => ({
            label: session.name,
            description: `revision ${session.revision}`,
            session,
          })),
          { placeHolder: "Choose a collaboration session" },
        );
        if (!choice) return;
        const note = boundedNote(
          await vscode.window.showInputBox({
            prompt: "Collaboration note",
            ignoreFocusOut: true,
          }),
        );
        if (!note) throw new Error("Collaboration note is empty");
        const authorId = boundedNote(
          await vscode.window.showInputBox({
            prompt: "Joined participant ID",
            value: "vscode",
          }),
        );
        if (!authorId) throw new Error("Participant ID is required");
        try {
          const joined = await requestBridge(
            bridgeUrl(),
            collaborationParticipantsRoute(choice.session.id),
            await token(),
            "POST",
            { participantId: authorId, role: "member" },
          );
          const baseRevision = Number.isInteger(joined.session?.revision)
            ? joined.session.revision
            : choice.session.revision;
          const eventId = collaborationEventId();
          await requestBridge(
            bridgeUrl(),
            collaborationEventsRoute(choice.session.id),
            await token(),
            "POST",
            {
              eventId,
              event: {
                eventId,
                authorId,
                type: "vscode.note",
                payload: { text: note },
                baseRevision,
              },
              options: { baseRevision },
            },
            { "Idempotency-Key": `vscode:collaboration:${eventId}` },
          );
        } catch (error) {
          if (error instanceof BridgeRequestError && error.status === 409) {
            const latest = error.body?.session;
            const revision = Number.isInteger(latest?.revision)
              ? latest.revision
              : "unknown";
            throw new Error(
              `Collaboration changed before this note was saved; refresh and retry at revision ${revision}.`,
            );
          }
          throw error;
        }
        vscode.window.showInformationMessage("Collaboration note appended.");
      },
    ),
  );
}

module.exports = {
  activate,
  bridgeRequestOptions,
  boundedSelection,
  boundedNote,
  BridgeRequestError,
  collaborationEventsRoute,
  collaborationParticipantsRoute,
  collaborationEventId,
  gitRoute,
  boundedGitOutput,
  gitCommitMessage,
  snapshotPath,
  snapshotRevision,
  snapshotEnvelope,
  summarizeSnapshot,
};
