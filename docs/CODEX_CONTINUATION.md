# Codex continuation and handoff

SpartanCode is designed to be picked up by a new Codex desktop installation or
Codex CLI session without access to prior conversation history.

## Fresh-session bootstrap

```sh
git clone https://github.com/Spartan-Software-Enterprises/SpartanCode.git
cd SpartanCode
git checkout main
npm ci
cd android && npm ci && cd ..
npm run roadmap:audit
npm test
cd android && npm run typecheck && npm test
```

For Termux sessions, use the persistent tmux-backed `codex` launcher and the
reconnect procedure in [TERMUX_CODEX_RECOVERY.md](TERMUX_CODEX_RECOVERY.md).
This protects the live agent session from a Termux activity or PTY restart;
it does not replace Git commits or the verification gates below.

If a checkout already exists, use the start-of-session procedure in
[SYNC_WORKFLOW.md](SYNC_WORKFLOW.md). A new agent must inspect `git status`
before pulling and preserve any divergence.

## Project context

Read these files in order:

1. `AGENTS.md`
2. `docs/ROADMAP_MATRIX.md`
3. `docs/ROADMAP_STATUS.md`
4. `docs/VERIFICATION_MATRIX.md`
5. `docs/SYNC_WORKFLOW.md`
6. `docs/PROTON_PASS.md` and `docs/PROTON_DRIVE.md`

`origin/main` is canonical. The AWS checkout is only a validation mirror and
must be reached using the current `SPARTANCODE_REMOTE_HOST` operational
environment value. The documented retired host must not be reused.

## Development handoff invariant

Every completed session must leave:

- intended changes committed and pushed to `origin/main`;
- AWS fast-forwarded to the same commit when reachable;
- local and AWS worktrees clean;
- desktop and Android verification results recorded or explicitly identified
  as environment-gated;
- no credentials, private keys, Proton exports, caches, or build directories
  in Git or handoff archives.

The roadmap audit is authoritative for progress. `Partial` means work remains;
it is not a release-ready status. Physical device, headset, server, staffing,
legal, and production-distribution claims require evidence from those actual
environments.

## User-independent operation

Android can create and release target-independent projects on a phone without
the desktop app, a bridge, GitHub, AWS, or Proton. Optional integrations must
degrade truthfully and must never become hidden dependencies.
