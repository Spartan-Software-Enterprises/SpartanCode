# SpartanCode Desktop

SpartanCode is an agent-first, local-first Vibe coding command center. It is
designed around missions, agent stages, artifacts, approvals, and workspace
handoff rather than a conventional editor layout.

## Development

```bash
npm install
npm run dev
```

The desktop shell uses Electron with a context-isolated preload bridge. Mission
state is persisted in the Electron user-data directory. Local workspace tools
are restricted to the selected workspace, including symlink escape protection.

## Verification

```bash
npm test
```

The suite validates the IPC-facing services, mission lifecycle, policy gates,
model licensing rules, workspace isolation, persistence, renderer parsing, and
formatting.

## Production build

```bash
npm run build   # unpacked application directory
npm run dist    # platform installer/artifact for the host platform
```

Electron Builder writes output to `dist/`. Native optional SSH acceleration is
not required for packaging; the SSH transport remains available through the
portable `ssh2` runtime.

## Product boundaries

- Local-first operation remains available without cloud credentials.
- External mutations and dangerous commands require an explicit approval.
- Only explicitly licensed local models are exposed by the model catalog.
- Remote profiles never persist passwords, private keys, or tokens.
- The renderer does not expose Node.js or filesystem primitives directly.
