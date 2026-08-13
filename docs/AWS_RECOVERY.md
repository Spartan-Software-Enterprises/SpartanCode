# AWS development host recovery

The SSH key at `/data/data/com.termux/files/home/SpartanDev.pem` authenticates
to the development host; it is not an AWS control-plane credential. The AWS
CLI must use a persistent IAM role/profile outside the instance if EC2
provisioning and recovery are required.

The previous development host had an idle `spartancode-auto-terminate.timer`
that ran every 15 minutes after an eight-hour boot window and called
`aws ec2 terminate-instances`. That timer must not be installed on a
replacement host. An instance stop/reboot is recoverable; termination removes
the instance and its instance-role credentials.

After the replacement host is reachable, run as `ubuntu`:

```bash
sudo growpart /dev/sda 1
sudo xfs_growfs / || sudo resize2fs /dev/sda1
```

Then run `scripts/aws-dev-bootstrap.sh`. It removes any stale termination
timer, fast-forwards a clean checkout from `origin/main`, and installs only a
safe synchronization timer that refuses to overwrite dirty work.
