#!/usr/bin/env bash
set -euo pipefail

if [ -z "${SPARTANCODE_REMOTE_HOST:-}" ]; then
  remote_profile="${SPARTANCODE_REMOTE_PROFILE:-${XDG_CONFIG_HOME:-$HOME/.config}/spartancode/remote.env}"
  if [ -r "$remote_profile" ]; then
    # This file contains only the active host, user, and private-key path.
    # Explicitly exported variables remain authoritative when present.
    . "$remote_profile"
  fi
fi

remote_host="${SPARTANCODE_REMOTE_HOST:-}"
remote_dir="${SPARTANCODE_REMOTE_DIR:-/home/ubuntu/workspaces/SpartanCode}"
remote_user="${SPARTANCODE_REMOTE_USER:-ubuntu}"
ssh_key="${SPARTANCODE_REMOTE_KEY:-}"
if [ -z "$remote_host" ]; then
  echo "SPARTANCODE_REMOTE_HOST must identify the active replacement AWS host" >&2
  exit 2
fi
if [ -z "$ssh_key" ] || [ ! -r "$ssh_key" ]; then
  echo "SPARTANCODE_REMOTE_KEY must identify a readable SSH key" >&2
  exit 2
fi
case "$remote_dir" in
  /*[!A-Za-z0-9_./-]*)
    echo "SPARTANCODE_REMOTE_DIR contains unsupported characters" >&2
    exit 2
    ;;
esac
git fetch origin main
local_commit="$(git rev-parse HEAD)"
test "$local_commit" = "$(git rev-parse origin/main)"
test -z "$(git status --porcelain)"
remote_report="$(ssh -i "$ssh_key" -o BatchMode=yes "$remote_user@$remote_host" \
  "cd '$remote_dir' && test \"\$(git branch --show-current)\" = main && test -z \"\$(git status --porcelain)\" && test \"\$(git remote get-url origin)\" = git@github.com:Spartan-Software-Enterprises/SpartanCode.git && git fetch origin main >/dev/null && test \"\$(git rev-parse HEAD)\" = \"\$(git rev-parse origin/main)\" && git rev-parse HEAD")"
remote_commit="${remote_report##*$'\n'}"
test "$local_commit" = "$remote_commit"
printf 'synchronized_commit=%s\n' "$local_commit"
