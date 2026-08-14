# SpartanCode synchronization workflow

This document defines how local development, GitHub, and the AWS development
server stay synchronized. It is intentionally conservative: preserving work
comes before making the three locations identical.

## Authorities

| Location | Role | Expected branch/path |
| --- | --- | --- |
| GitHub | Canonical source of truth and durable collaboration history | `origin/main` |
| Local workspace | Active development checkout | `SpartanCode`, branch `main` |
| AWS dev server | Remote validation mirror when reachable | Active replacement host recorded in the release environment, branch `main` |

The AWS host is for development validation. It must not be treated as a second
source of truth, and it must not receive force pushes or destructive resets.
The former `54.152.46.218` host is retired and must not be assumed reachable.
The active replacement is provisioned in `us-east-1c` with a 512-GiB gp3 root
volume and is protected from API stop/termination; use the current operational
host address rather than hard-coding an address in project configuration.

The previous host also contained an idle `spartancode-auto-terminate.timer`
that could terminate the EC2 instance. Replacement hosts must not install that
timer. Use `docs/AWS_RECOVERY.md` and the bootstrap script when recovering or
replacing the host.

## Start-of-session procedure

From the local SpartanCode checkout:

```sh
git fetch origin main
git status --short
git pull --ff-only origin main
```

If the worktree is not clean, preserve the local changes in a commit or a
clearly named backup branch before pulling. Do not use `git reset --hard` or
discard changes to make synchronization convenient.

Check the AWS mirror before using it, substituting the active replacement host:

```sh
ssh -i /data/data/com.termux/files/home/SpartanDev.pem \
  ubuntu@REPLACEMENT_HOST \
  'cd /home/ubuntu/workspaces/SpartanCode && git status --short && git pull --ff-only origin main'
```

If AWS has a dirty worktree or a non-fast-forward state, stop and preserve that
state before taking any further action.

## End-of-session procedure

Run the relevant checks locally, then commit all intended work:

```sh
npm test
git diff --check
git add -A
git commit -m "describe the completed change"
git push origin main
```

Update and validate AWS without changing its history:

```sh
ssh -i /data/data/com.termux/files/home/SpartanDev.pem \
  ubuntu@REPLACEMENT_HOST \
  'set -e; cd /home/ubuntu/workspaces/SpartanCode; git pull --ff-only origin main; npm test; cd android; npm run typecheck; npm test'
```

Finally, compare the commit and worktree state in all locations:

```sh
git rev-parse HEAD
git ls-remote origin refs/heads/main
ssh -i /data/data/com.termux/files/home/SpartanDev.pem \
  ubuntu@REPLACEMENT_HOST \
  'cd /home/ubuntu/workspaces/SpartanCode && git rev-parse HEAD && git status --porcelain'
```

The hashes must match, and both worktrees must be empty. A session is not
complete until this check passes.

## Conflict and recovery rules

When local, AWS, or GitHub diverges:

1. Stop before pulling, rebasing, resetting, or deleting anything.
2. Record each commit with `git log --all --decorate --oneline`.
3. Create a durable backup branch for any unique local or AWS commit.
4. Push the backup branch to GitHub when network access is available.
5. Reconcile with a normal merge or rebase, preserving both sides’ intended
   changes.
6. Run the full verification procedure before updating AWS.

Never force-push `main`. Never overwrite an uncommitted worktree. The current
recovery branch for the previously reconciled local work is
`backup/local-work-a8610f5` on GitHub.

## Verification baseline

The synchronized `main` branch must pass:

- Desktop `npm test` (syntax, unit tests, and Prettier).
- Android `npm run typecheck`.
- Android `npm test`.

The AWS server is a Linux validation environment and does not replace physical
device, signed-release, or platform-specific acceptance testing.
