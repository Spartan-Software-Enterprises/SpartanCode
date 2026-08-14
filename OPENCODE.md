# OpenCode continuation contract

SpartanCode is designed to be handed between Codex and OpenCode without
losing context or work. This file is an operational contract, not a second
source of truth.

## Before starting

1. Read `AGENTS.md`, `docs/CODEX_CONTINUATION.md`,
   `docs/AGENT_HANDOFF.md`, `docs/PROJECT_OPERATING_RULES.md`, and
   `docs/RELEASE_PLAN.md`.
2. Fetch `origin/main` and fast-forward local `main` only when the worktree is
   clean. Never force-push, reset a worktree, or overwrite divergent work.
3. Load the active host from `SPARTANCODE_REMOTE_HOST`; do not assume a stale
   IP. Verify the AWS checkout is clean and on the same commit before editing.
4. Inspect the current roadmap audit and beta blockers. Do not mark an item
   complete from intent, a stub, or a skipped physical test.

## While working

- Keep Android standalone: desktop, server, bridge, and GitHub are optional.
- Keep secrets out of Git, handoff bundles, logs, screenshots, and chat.
- Use disjoint agent scopes and record active/completed agents in the handoff
  report. Close completed agents so new bounded work can be dispatched.
- Commit coherent changes, push `main`, and fast-forward the active AWS mirror
  after verification. Preserve any unexpected dirty state instead of
  reconciling it destructively.

## Before handing back to Codex

Run the checks in `docs/AGENT_HANDOFF.md`, record their exact results and
commit SHA, and leave local and AWS worktrees clean at the same `origin/main`
commit. Update the handoff report with remaining roadmap/beta blockers. Codex
must repeat the same source-control and verification checks before accepting
the handoff.
