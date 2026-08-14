# Verification matrix

`android/scripts/verify-matrix.js` is the repeatable clean-checkout entrypoint
for the Android baseline. It runs TypeScript, Jest, formatting, Expo
configuration, and committed visual-asset integrity checks, then records
environment-dependent checks as `pass` or `skip` in a JSON report. A missing
Android SDK, emulator, release keystore, or
AWS host is reported explicitly; it cannot silently become a passing device or
signing claim.

Run it from the repository root:

```bash
node android/scripts/verify-matrix.js --output dist/android-verification.json
```

GitHub Actions runs the same baseline and a bounded API 30 Android emulator
smoke job on every push and pull request. The smoke job provisions the AVD with
the Android SDK tools, starts it headlessly with explicit boot bounds, builds
the debug native binary, installs it, launches the application, and verifies the
package is registered.
The same workflow also runs the Electron Playwright visual smoke suite under
Xvfb and uploads its screenshots as CI evidence. Visual launch, interaction,
navigation, and process execution are explicitly bounded; the Android SDK
download, emulator startup, and package verification phases are bounded
separately so a failed environment gate produces actionable evidence.
Physical TalkBack/gesture checks, additional API-level coverage, and signed
artifacts remain separate release-environment evidence and must be attached
when available. AWS Dev release verification has produced signed AAB and APK
artifacts with the release-owned key; the private keystore remains outside the
repository.

Physical Android/iOS hardware gates use the optional workflow in
[AWS_DEVICE_FARM.md](AWS_DEVICE_FARM.md). EC2 emulator results do not count as
biometric, NPU, camera, AR/VR, or physical-network acceptance.

The complete September 1 beta acceptance sequence, evidence naming convention,
and product-owner sign-off record are in
[BETA_ACCEPTANCE_RUNBOOK.md](BETA_ACCEPTANCE_RUNBOOK.md).

The local Android phone can provide physical Android evidence through
[LOCAL_DEVICE_TESTING.md](LOCAL_DEVICE_TESTING.md); an attached authorized ADB
device is required before those checks count as passed.
