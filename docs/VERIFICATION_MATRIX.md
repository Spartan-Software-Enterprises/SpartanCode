# Verification matrix

`android/scripts/verify-matrix.js` is the repeatable clean-checkout entrypoint
for the Android baseline. It runs TypeScript, Jest, formatting, and Expo
configuration checks, then records environment-dependent checks as `pass` or
`skip` in a JSON report. A missing emulator, release keystore, or AWS host is
reported explicitly; it cannot silently become a passing device or signing
claim.

Run it from the repository root:

```bash
node android/scripts/verify-matrix.js --output dist/android-verification.json
```

GitHub Actions runs the same baseline on every push and pull request. Native
Android builds, physical TalkBack/gesture checks, API-level emulator smoke
tests, and signed artifacts remain separate release-environment evidence and
must be attached when available.
