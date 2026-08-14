#!/usr/bin/env bash
set -euo pipefail

if [ "${SPARTANCODE_RESIZE_ROOT:-0}" = "1" ]; then
  sudo growpart /dev/sda 1
  sudo xfs_growfs / || sudo resize2fs /dev/sda1
fi

sudo systemctl disable --now spartancode-auto-terminate.timer spartancode-auto-terminate.service 2>/dev/null || true
sudo rm -f /etc/systemd/system/spartancode-auto-terminate.timer \
  /etc/systemd/system/spartancode-auto-terminate.service \
  /usr/local/sbin/spartancode-auto-terminate
sudo systemctl daemon-reload

repo_dir="${SPARTANCODE_REPO_DIR:-$HOME/workspaces/SpartanCode}"
origin_url="${SPARTANCODE_ORIGIN_URL:-git@github.com:Spartan-Software-Enterprises/SpartanCode.git}"
mkdir -p "$(dirname "$repo_dir")"
if [ ! -d "$repo_dir/.git" ]; then
  git clone --branch main "$origin_url" "$repo_dir"
fi
cd "$repo_dir"
git fetch origin main
if [ -n "$(git status --porcelain)" ]; then
  echo "Refusing to overwrite a dirty worktree: $repo_dir" >&2
  exit 2
fi
git pull --ff-only origin main

systemd_dir="$HOME/.config/systemd/user"
mkdir -p "$systemd_dir"
cat > "$systemd_dir/spartancode-sync.service" <<EOF
[Unit]
Description=SpartanCode safe origin/main sync

[Service]
Type=oneshot
WorkingDirectory=$repo_dir
ExecStart=/usr/bin/env bash -lc 'set -euo pipefail; git fetch origin main; test -z "\$(git status --porcelain)"; git pull --ff-only origin main'
EOF
cat > "$systemd_dir/spartancode-sync.timer" <<'EOF'
[Unit]
Description=Check SpartanCode synchronization every five minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
Persistent=true

[Install]
WantedBy=timers.target
EOF
if systemctl --user daemon-reload && systemctl --user enable --now spartancode-sync.timer; then
  echo "SpartanCode sync timer enabled"
else
  echo "SpartanCode sync timer deferred: no user systemd bus in this session"
fi
loginctl enable-linger "$USER" >/dev/null 2>&1 || true
df -h /
git rev-parse HEAD
