#!/usr/bin/env bash
set -euo pipefail

remote_host="${SPARTANCODE_REMOTE_HOST:-}"
remote_dir="${SPARTANCODE_REMOTE_DIR:-/home/ubuntu/workspaces/SpartanCode}"
ssh_key="${SPARTANCODE_SSH_KEY:-$HOME/SpartanDev.pem}"
if [ -z "$remote_host" ]; then
  echo "SPARTANCODE_REMOTE_HOST must identify the active replacement AWS host" >&2
  exit 2
fi
git fetch origin main
local_commit="$(git rev-parse HEAD)"
test "$local_commit" = "$(git rev-parse origin/main)"
test -z "$(git status --porcelain)"
remote_commit="$(ssh -i "$ssh_key" -o BatchMode=yes "$remote_host" "cd '$remote_dir' && test -z \"\$(git status --porcelain)\" && git rev-parse HEAD")"
test "$local_commit" = "$remote_commit"
printf 'synchronized_commit=%s\n' "$local_commit"
