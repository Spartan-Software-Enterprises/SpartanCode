# SpartanCode VS Code extension

This dependency-free extension provides the first VS Code synchronization
slice. It talks only to the optional authenticated MCP Bridge and never starts
one, opens a public listener, or stores a bridge token in ordinary settings.

Commands:

- `SpartanCode: Set Bridge Token` stores the token in VS Code SecretStorage.
- `SpartanCode: Sync Workspace Snapshot` writes a bounded bridge snapshot to
  `.spartancode/vscode-snapshot.json` with restrictive file permissions.
- `SpartanCode: Show Workspace Status` displays active missions, pending
  approvals, and artifact counts from the authenticated snapshot route.
- `SpartanCode: Start Mission From Selection` queues the selected text through
  the bridge’s normal mission and approval policy.

Set `spartancode.bridgeUrl` to the trusted local/private bridge URL. Full
editor parity, live collaboration UI, and marketplace distribution remain
future work; the extension does not claim those capabilities.
