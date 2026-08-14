# AWS development host recovery

The SSH key at `/data/data/com.termux/files/home/SpartanDev.pem` was used for
the retired development host; it is not an AWS control-plane credential. The
AWS CLI must use a persistent IAM role/profile outside the instance if EC2
provisioning and recovery are required. Never commit AWS credentials or place
them in the repository.

The previous development host had an idle `spartancode-auto-terminate.timer`
that ran every 15 minutes after an eight-hour boot window and called
`aws ec2 terminate-instances`. That timer must not be installed on a
replacement host. An instance stop/reboot is recoverable; termination removes
the instance and its instance-role credentials.

If a replacement host is created with a root filesystem that already fills its
larger EBS volume, no resize step is needed. The bootstrap defaults to
preserving that layout and does not delete caches, SDKs, build outputs, or
project data. Only if the new AMI leaves the root partition unexpanded, run as
`ubuntu`:

```bash
sudo growpart /dev/sda 1
sudo xfs_growfs / || sudo resize2fs /dev/sda1
```

Then run `scripts/aws-dev-bootstrap.sh`. It removes any stale termination
timer, fast-forwards a clean checkout from `origin/main`, and installs only a
safe synchronization timer that refuses to overwrite dirty work.

The replacement instance user-data is kept in
`scripts/aws-instance-user-data.sh`. It installs the validation toolchain,
expands the larger root filesystem when the AMI leaves it unexpanded, removes
the retired termination timer, and bootstraps a clean `origin/main` checkout
with the synchronization timer. It contains no credentials. The replacement
uses only the default VPC security group; the retired `spartan-dev-ssh` group
is not required.

The active replacement is a KVM-capable `c8i.xlarge` in `us-east-1c` with
nested virtualization enabled, a 512-GiB gp3 root volume, and no automatic
termination timer. Its current public address is managed operationally rather
than committed as configuration. The former `t2.large` is stopped and
preserved as a fallback instance; stop it again whenever it is restarted for
recovery. GitHub credentials are provisioned separately on the host for
private-repository synchronization; they are never placed in user-data or
committed to this repository.

AWS account budget monitoring is configured as
`SpartanCode-Monthly-Cost-Guardrail` with a $50 monthly limit. This is a
monitoring guardrail, not a billing or credit guarantee: AWS credit balance is
not exposed by the EC2 CLI, and a budget does not automatically stop compute.
Check Cost Explorer and the budget before extending the host's use.

The active KVM host exposes `/dev/kvm` with `660 root:kvm` permissions. Verify
this after every restart with `test -e /dev/kvm` and `stat -c '%a %U:%G' /dev/kvm`.
If the check fails, do not count emulator evidence as passing; use the pinned
GitHub Actions runner until the host is repaired.

The headless emulator path also requires `xvfb`, `libpulse0`, and the X11/GL
runtime libraries installed by the KVM host setup. Run
`scripts/android-kvm-smoke.sh` through an SSH login after the `ubuntu` user has
joined the `kvm` group. Xvfb is intentional: the current emulator may
segfault with `-no-window` even when KVM itself is healthy.
