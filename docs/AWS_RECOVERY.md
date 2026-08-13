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
