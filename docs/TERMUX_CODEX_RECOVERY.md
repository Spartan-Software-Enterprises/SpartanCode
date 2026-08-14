# Termux Codex recovery

Use the persistent `tmux` session for Codex work on the Android development
checkout. This keeps the Codex process alive if the Termux activity or its PTY
is interrupted.

## Start or reconnect

```sh
cd /data/data/com.termux/files/home/SpartanCode
codex
```

The Termux launcher resolves `codex` to the tmux-backed wrapper in
`~/bin/codex`. It creates or attaches to the session named `codex`.
The wrapper checks that tmux and the real Codex executable exist, detects a
dead pane or recovery shell left by a crash or forced process kill, and
recreates that stale session instead of attaching to it. If Codex exits, the
pane stays open in a recovery shell with the exit status visible, so the
session does not disappear before it can be inspected or recovered.

To reconnect explicitly:

```sh
tmux attach -t codex
```

To inspect sessions without terminating them:

```sh
tmux ls
```

## Recovery rules

- Reopen Termux and run `codex`; do not start a second Codex process while the
  `codex` tmux session exists.
- If Codex was killed, run `codex` again; the launcher removes the stale dead
  pane or recovery shell and starts a fresh process in the same named session.
- Detach with `Ctrl-b` followed by `d`; do not type `exit` unless the session
  should be intentionally closed.
- Keep project changes in Git and run the verification commands before ending
  a work session.
- The local `~/bin/codex` wrapper is operational device configuration and is
  intentionally outside the repository; this document records the contract
  without storing credentials or device-specific secrets.
