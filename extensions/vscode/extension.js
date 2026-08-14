const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const https = require("node:https");

function bridgeRequestOptions(bridgeUrl, route, token, method = "GET", body) {
  const url = new URL(
    route,
    bridgeUrl.endsWith("/") ? bridgeUrl : `${bridgeUrl}/`,
  );
  if (!/^https?:$/.test(url.protocol))
    throw new Error("Bridge URL must use HTTP(S)");
  const payload = body === undefined ? null : JSON.stringify(body);
  return {
    url,
    options: {
      method,
      headers: {
        Accept: "application/json",
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

function requestBridge(bridgeUrl, route, token, method = "GET", body) {
  const { url, options, payload } = bridgeRequestOptions(
    bridgeUrl,
    route,
    token,
    method,
    body,
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
        });
        response.on("end", () => {
          let value;
          try {
            value = raw ? JSON.parse(raw) : {};
          } catch {
            value = { raw: raw.slice(0, 4096) };
          }
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(
              new Error(`SpartanCode bridge returned ${response.statusCode}`),
            );
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
      fs.writeFileSync(
        target,
        `${JSON.stringify({ syncedAt: new Date().toISOString(), snapshot }, null, 2)}\n`,
        { mode: 0o600 },
      );
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
}

module.exports = {
  activate,
  bridgeRequestOptions,
  boundedSelection,
  snapshotPath,
};
