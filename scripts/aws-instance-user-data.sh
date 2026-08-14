#!/usr/bin/env bash
set -euo pipefail

exec > >(tee -a /var/log/spartancode-bootstrap.log) 2>&1
export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y ca-certificates cloud-guest-utils curl e2fsprogs git xfsprogs
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

root_source="$(findmnt -n -o SOURCE /)"
root_disk="$(lsblk -no PKNAME "$root_source")"
root_part="$(lsblk -no PARTN "$root_source")"
if [ -n "$root_disk" ] && [ -n "$root_part" ]; then
  growpart "/dev/$root_disk" "$root_part" || true
fi
root_fs="$(findmnt -n -o FSTYPE /)"
case "$root_fs" in
  xfs) xfs_growfs / ;;
  ext2|ext3|ext4) resize2fs "$root_source" ;;
esac

systemctl disable --now spartancode-auto-terminate.timer spartancode-auto-terminate.service 2>/dev/null || true
rm -f /etc/systemd/system/spartancode-auto-terminate.timer \
  /etc/systemd/system/spartancode-auto-terminate.service \
  /usr/local/sbin/spartancode-auto-terminate
systemctl daemon-reload

install -d -o ubuntu -g ubuntu /home/ubuntu/workspaces
loginctl enable-linger ubuntu || true
if [ ! -d /home/ubuntu/workspaces/SpartanCode/.git ]; then
  runuser -u ubuntu -- git clone --branch main \
    https://github.com/Spartan-Software-Enterprises/SpartanCode.git \
    /home/ubuntu/workspaces/SpartanCode
fi
runuser -u ubuntu -- env HOME=/home/ubuntu \
  SPARTANCODE_REPO_DIR=/home/ubuntu/workspaces/SpartanCode \
  SPARTANCODE_ORIGIN_URL=https://github.com/Spartan-Software-Enterprises/SpartanCode.git \
  bash -lc 'bash /home/ubuntu/workspaces/SpartanCode/scripts/aws-dev-bootstrap.sh'
