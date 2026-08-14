# SpartanCode extension and connector compatibility

Status: roadmap specification. Compatibility is being implemented in stages;
an ecosystem is not considered supported merely because its package can be
downloaded or renamed. The application must report what it can import,
configure, invoke, test, and release for each host and target.

## Compatibility contract

SpartanCode uses an adapter boundary for extensions, plugins, language servers,
debuggers, build systems, AI agents, and service connectors. Every adapter
declares:

- supported host applications and versions;
- package or configuration formats it can inspect or import;
- commands, events, tools, and UI contributions it exposes;
- required runtimes, SDKs, licenses, credentials, and network access;
- permissions and whether execution is declarative, sandboxed, or external;
- desktop, Android, and phone-only behavior;
- offline behavior, test coverage, and known limitations; and
- install, update, rollback, disable, uninstall, and provenance behavior.

Unsupported or partially supported capabilities must be shown explicitly.
SpartanCode must never claim that a generic VS Code, JetBrains, desktop, or
web integration proves native support for another product or console target.

## Major coding-program families

| Ecosystem | Compatibility target | Safe first capability | Native execution boundary |
| --- | --- | --- | --- |
| Visual Studio Code, Cursor, Windsurf, VSCodium | VSIX metadata, settings, tasks, launch files, MCP, LSP, DAP | Import and map project configuration; expose supported tools | VS Code-compatible extension execution requires a reviewed adapter and declared runtime |
| JetBrains IDEs, Android Studio, IntelliJ, PyCharm, WebStorm, CLion, Rider, GoLand | plugin metadata, run configurations, inspections, LSP, DAP, Gradle/Maven/CMake | Inspect/import project settings and orchestrate official build commands | JetBrains plugin binaries remain external unless a reviewed runtime adapter exists |
| Visual Studio | VSIX metadata, solutions, projects, MSBuild, CMake, debugger profiles | Import solution/build metadata and invoke approved MSBuild workflows | VSIX execution requires Windows and an approved host integration |
| Eclipse and Eclipse Theia | plug-in metadata, OSGi/p2 descriptors, workspace settings, LSP, Maven/Gradle | Inspect/import workspace configuration and build profiles | OSGi bundle execution requires a declared Java runtime and sandbox boundary |
| Xcode and Swift Package Manager | `.xcodeproj`, `.xcworkspace`, Swift packages, schemes, signing profiles | Inspect project targets and generate bounded build plans | Xcode builds require authorized macOS/Xcode infrastructure and signing evidence |
| Neovim, Vim, Emacs, Sublime Text, Zed | Lua/Vimscript/Emacs Lisp/package metadata, settings, LSP, DAP | Import editor configuration and map language/tool integrations | Editor package execution remains host-specific and opt-in |
| Terminal coding agents | Codex CLI, Claude Code, OpenCode, Aider, Continue, Cline, Roo Code | Provider/agent configuration, MCP, task handoff, Git/workspace contracts | Credentials stay in the secure key store; commands remain policy-gated |
| General developer tooling | Git, GitHub, GitLab, Bitbucket, Docker, dev containers, CI/CD, package managers | Connector status, repository operations, build/test orchestration | Provider-specific authentication, billing, permissions, and runners remain explicit |

This list is the initial major-program coverage map, not a promise that every
third-party extension is interchangeable. New ecosystems are added through
the same adapter manifest and capability test suite.

## Connector classes

Connectors should share stable contracts for:

1. source control and code hosting;
2. issue tracking, review, and code-quality services;
3. language servers, debuggers, formatters, linters, and test runners;
4. build systems, package managers, containers, and remote workers;
5. AI model and agent APIs, MCP servers, and local runtimes; and
6. deployment, observability, artifact storage, and release services.

The connector UI should group these by user goal instead of showing a flat
catalog. A connector may be configured from Android, but a target-specific
operation must identify when it requires a desktop, server, SDK, devkit,
licensed toolchain, or external account.

## Security and lifecycle requirements

Extension and connector support must preserve SpartanCode's local-first
security model:

- package signatures, publisher identity, digest, license, and provenance are
  verified before activation;
- the main process, not the renderer, owns privileged connector state;
- secrets are references to Proton Pass or the optional OS backup, never
  plaintext project settings;
- permissions are least-privilege and visible before first use;
- network access uses bounded HTTPS requests and explicit allowlists;
- install, update, rollback, disable, uninstall, and quarantine are auditable;
- adapters cannot silently route around policy, approval, or target gates; and
- Android can author and configure projects without requiring a desktop, while
  unsupported execution is reported honestly.

## Acceptance sequence

1. The shared versioned adapter manifest and capability-report contract is now
   implemented as a bounded declarative validator in
   `src/main/adapter-manifest.js` with negative tests for unsafe declarations.
2. The bounded read-only VS Code importer is implemented in
   `src/main/vscode-project-importer.js` and exposed through the approved
   workspace API. It summarizes JSONC settings, tasks, launch metadata, and
   extension recommendation metadata from `.vscode/extensions.json`; it never
   returns command arguments or secret values and never executes tasks or
   extensions. The bounded read-only JetBrains importer is implemented in
   `src/main/jetbrains-project-importer.js`; it summarizes shared `.idea`
   settings, run-configuration names/types, modules, and build-system markers
   without executing IDEs, plugins, run configurations, or build tools. Add
   read-only Visual Studio importing is implemented in
   `src/main/visual-studio-project-importer.js`; it summarizes solution/project
   metadata without executing Visual Studio, MSBuild, debuggers, or VSIX files.
   Read-only Eclipse importing is implemented in
   `src/main/eclipse-project-importer.js`; it summarizes `.project`,
   `.classpath`, and Maven/Gradle markers without executing Java, OSGi, Maven,
   or Gradle. Read-only Xcode/Swift Package importing is implemented in
   `src/main/xcode-project-importer.js`; it summarizes project products,
   workspaces, and Swift Package metadata while rejecting signing metadata and
   never invoking Xcode or a simulator. Read-only editor configuration importing
   is implemented in `src/main/editor-config-importer.js` for Neovim/Vim,
   Emacs, Zed, and Sublime project/workspace metadata; it summarizes configuration
   structure without evaluating scripts. A bounded terminal-agent metadata
   importer also covers Aider, OpenCode, Cline, Continue, and Roo configuration
   files and bounded rule directories without returning credentials or executing
   agent commands. Remaining
   editor packages remain future work.
3. Add connector adapters for Git hosting, LSP/DAP, build/test tools, MCP,
   major agent APIs, and remote workers.
4. Add Android settings and project-level configuration with offline storage.
5. Add desktop and remote execution only where the declared runtime and
   permissions are available.
6. Add compatibility fixtures, negative permission tests, visual settings
   coverage, and target-specific release evidence.

This work expands SpartanCode's interoperability. It does not replace the
official editor, engine, SDK, devkit, or certification process owned by each
vendor.
