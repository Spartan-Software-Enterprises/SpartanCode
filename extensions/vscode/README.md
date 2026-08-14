# SpartanCode VS Code extension

This dependency-free extension provides the first VS Code synchronization
slice. It talks only to the optional authenticated MCP Bridge and never starts
one, opens a public listener, or stores a bridge token in ordinary settings.

Commands:

- `SpartanCode: Set Bridge Token` stores the token in VS Code SecretStorage.
- `SpartanCode: Sync Workspace Snapshot` writes a bounded bridge snapshot to
  `.spartancode/vscode-snapshot.json` with restrictive file permissions. The
  file contains a schema version, bounded status summary, and SHA-256 snapshot
  revision so local consumers can detect changed bridge state.
- `SpartanCode: Show Workspace Status` displays active missions, pending
  approvals, artifact counts, and a short snapshot revision from the bounded
  authenticated `/v1/workspace/status` route. It does not download the full
  workspace snapshot just to render status.
- `SpartanCode: Start Mission From Selection` queues the selected text through
  the bridge’s normal mission and approval policy.
- `SpartanCode: List Collaboration Sessions` reads authenticated session
  summaries through the bridge.
- `SpartanCode: Append Collaboration Note` appends a revision-checked note as
  a joined participant with an idempotent request key and explicit base
  revision; stale revisions are rejected with the current remote revision and
  require an explicit refresh/retry.
- `SpartanCode: Show Git Status` reads bounded workspace status through the
  authenticated `git:read` bridge scope.
- `SpartanCode: Show Git Diff` displays the bounded, redacted bridge diff.
- `SpartanCode: Stage Git Changes` stages workspace changes through the
  authenticated `git:write` bridge scope.
- `SpartanCode: Commit Git Changes` prompts for a bounded commit subject and
  commits through the authenticated bridge.

Every bridge request requires a non-empty token retrieved from VS Code
SecretStorage; response bodies and persisted snapshots are bounded. Set
`spartancode.bridgeUrl` to the trusted local/private bridge URL. Full
editor parity, live collaboration UI, and marketplace distribution remain
future work; the extension does not claim those capabilities. Git commands
remain optional and do not replace the standalone desktop or Android workflow.

The desktop host also provides a bounded, read-only importer for a selected
project's `.vscode/settings.json`, `tasks.json`, `launch.json`, and
`extensions.json`. It accepts JSONC, returns metadata summaries only, redacts
command and argument values, reports extension recommendations without
installing or activating them, and does not execute imported tasks or launch
configurations.

The desktop host also exposes a separate read-only JetBrains importer for
`.idea` metadata, shared run configurations, modules, and build-system markers.
It does not execute JetBrains plugins, run configurations, or build tools.
