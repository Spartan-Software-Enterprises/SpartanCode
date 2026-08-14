#!/data/data/com.termux/files/usr/bin/sh
set -eu

TERMUX_HOME=${HOME:?HOME is required}
TERMUX_PREFIX=${PREFIX:-/data/data/com.termux/files/usr}
CODEX_REAL_BIN=${CODEX_REAL_BIN:-$TERMUX_PREFIX/bin/codex}
CODEX_BIN_DIR=$TERMUX_HOME/bin
CODEX_WRAPPER=$CODEX_BIN_DIR/codex
CODEX_PROFILE=$TERMUX_HOME/.bash_profile
PATH_MARKER="# SpartanCode: persistent Codex tmux launcher"
PATH_LINE="export PATH=\"$CODEX_BIN_DIR:\$PATH\""

if [ ! -x "$CODEX_REAL_BIN" ]; then
  echo "Codex executable not found: $CODEX_REAL_BIN" >&2
  exit 1
fi
if ! command -v tmux >/dev/null 2>&1; then
  echo "tmux is required; install it with: pkg install tmux" >&2
  exit 1
fi

mkdir -p "$CODEX_BIN_DIR"
umask 077
cat >"$CODEX_WRAPPER" <<EOF
#!$TERMUX_PREFIX/bin/sh
set -eu

SESSION_NAME=\${CODEX_TMUX_SESSION:-codex}
REAL_CODEX=$CODEX_REAL_BIN

if tmux has-session -t "\$SESSION_NAME" 2>/dev/null; then
  exec tmux attach-session -t "\$SESSION_NAME"
fi

exec tmux new-session -s "\$SESSION_NAME" "\$REAL_CODEX" "\$@"
EOF
chmod 700 "$CODEX_WRAPPER"

if ! grep -Fqx "$PATH_MARKER" "$CODEX_PROFILE" 2>/dev/null; then
  printf '\n%s\n' "$PATH_MARKER" >>"$CODEX_PROFILE"
  if ! grep -Fqx "$PATH_LINE" "$CODEX_PROFILE" 2>/dev/null; then
    printf '%s\n' "$PATH_LINE" >>"$CODEX_PROFILE"
  fi
fi

echo "Installed persistent Codex launcher: $CODEX_WRAPPER"
echo "Reload your shell, then run: codex"
