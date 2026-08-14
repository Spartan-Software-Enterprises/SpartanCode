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
- Detach with `Ctrl-b` followed by `d`; do not type `exit` unless the session
  should be intentionally closed.
- Keep project changes in Git and run the verification commands before ending
  a work session.
- The local `~/bin/codex` wrapper is operational device configuration and is
  intentionally outside the repository; this document records the contract
  without storing credentials or device-specific secrets.

## Reinstall the launcher

If the wrapper or shell PATH hook is lost, from the checkout run:

```sh
sh scripts/install-termux-codex-wrapper.sh
```

The installer requires the Termux `codex` executable and `tmux`, recreates only
`~/bin/codex`, and adds one marked PATH entry to `~/.bash_profile` if needed.
