# Agent handoff protocol

This protocol keeps SpartanCode recoverable when Codex usage limits are
reached and work moves to OpenCode, then back to Codex.

The complete standing rules and priorities are in
[PROJECT_OPERATING_RULES.md](PROJECT_OPERATING_RULES.md). Read that document
before accepting a handoff; this protocol defines the evidence exchange.

## Required handoff record

The outgoing agent must provide a short record containing:

- project: `SpartanCode` (not Spartan IDE or Spartan Gaming);
- current commit and `origin/main` commit;
- active AWS host from `SPARTANCODE_REMOTE_HOST`, instance state, and KVM
  result;
- clean/dirty status for local and AWS worktrees;
- tests run and exact pass/fail counts;
- active/completed delegated agents;
- files intentionally changed but not yet committed (if any), stored in a
  clearly named patch or backup branch;
- remaining roadmap and September 1, 2026 beta blockers;
- whether the old fallback AWS instance is stopped and preserved.

Never include private keys, access tokens, Proton credentials, secure-vault
state, or raw user data in this record.

## Incoming-agent acceptance

The incoming agent must independently verify before editing:

```sh
git fetch origin main
git rev-parse HEAD
git ls-remote origin refs/heads/main
git status --short --branch
test -n "$SPARTANCODE_REMOTE_HOST"
ssh -i "$SPARTANCODE_REMOTE_KEY" "$SPARTANCODE_REMOTE_USER@$SPARTANCODE_REMOTE_HOST" \
  'cd /home/ubuntu/workspaces/SpartanCode && git rev-parse HEAD && git status --porcelain'
npm run roadmap:audit
```

If either worktree is dirty or hashes differ, preserve the divergence before
pulling or editing. The incoming agent must read `AGENTS.md` and
`docs/SYNC_WORKFLOW.md` before reconciling it.

## Verification before return

At minimum, run:

```sh
npm test
cd android && npm run typecheck && npm test && npm run format:check
cd .. && node --test extensions/vscode/extension.test.js
node scripts/roadmap-audit.js
git diff --check
```

For beta-release validation, also run the KVM emulator smoke, desktop visual
smoke, release manifest generation, and `npm run release:verify` when their
environmental prerequisites are available. Record unavailable physical or
store gates as `SKIP` with evidence; never convert them to `PASS`.

The returning agent must commit intended changes, push `main`, fast-forward
AWS, and report matching commit hashes and clean worktrees. The next agent
repeats this acceptance protocol, so the handoff is bidirectional.
