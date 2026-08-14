# SpartanCode beta acceptance runbook

Target release: **September 1, 2026**

This runbook is the operational checklist for the SpartanCode beta. It turns
the release plan into evidence that can be independently reviewed. A check is
`PASS` only when the named evidence exists, is tied to the exact release
commit, and contains no secrets or private user data. `SKIP` is an honest
environment result and does not satisfy a release blocker.

## Evidence rules

Create a clean evidence directory outside the repository, for example
`release-evidence/<commit>/`. Use stable names and record a SHA-256 for every
artifact that is retained. The minimum release index should contain:

| Evidence                    | Required fields                                                                              |
| --------------------------- | -------------------------------------------------------------------------------------------- |
| `release-index.json`        | release commit, UTC timestamp, target, checker version, status for every gate                |
| `android-verification.json` | exact release commit, static Android checks, environment checks, and verified summary counts |
| `desktop-visual/`           | test command, display configuration, screenshots, console/error summary                      |
| `android-emulator/`         | AVD/API, `/dev/kvm` check, APK hash, install/launch result, screenshot/log hashes            |
| `android-physical/`         | device model, Android version, test scope, consent confirmation, sanitized evidence hashes   |
| `signed-artifacts/`         | AAB/APK names, byte counts, SHA-256, signing-certificate fingerprint                         |
| `dependency-inventory.json` | lockfile revision, production dependency inventory, generation timestamp                     |
| `roadmap-audit.txt`         | exact command, exact commit, complete matrix output                                          |

Do not place private keys, Proton exports, AWS credentials, ADB private data,
raw production data, or unsanitized logcat output in the evidence directory.
Screenshots must use the SpartanCode theme and contain no personal identifiers.

## Critical-path gates

Run these gates against the same commit. The release candidate is not ready
while any required gate is `FAIL`, or while a release blocker is `SKIP`.

| Gate                 | Pass condition                                                                                                                            | Evidence owner      |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Canonical source     | `origin/main`, local checkout, and validation checkout report the same commit and clean worktrees                                         | Release operator    |
| Desktop baseline     | `npm test` passes, including syntax, unit, and formatting checks                                                                          | Desktop operator    |
| Desktop visual smoke | Playwright launches the app, exercises the primary navigation and menus, and produces reviewed screenshots with no renderer errors        | Desktop operator    |
| Android baseline     | `npm run typecheck`, `npm test`, and formatting pass from `android/`                                                                      | Android operator    |
| KVM emulator         | `/dev/kvm` is present and usable; the pinned API 30 AVD boots, installs the APK, launches SpartanCode, and captures sanitized evidence    | Validation operator |
| Physical phone       | An authorized `adb` device passes the agreed gesture/accessibility/permission checklist; device identity and evidence hashes are recorded | Device operator     |
| Signed release       | Release-owned key path produces the intended AAB/APK and the certificate fingerprint matches the release record                           | Release operator    |
| Release integrity    | Release manifest, dependency inventory, checksums, and roadmap audit all describe the same commit                                         | Release operator    |
| Product acceptance   | Product owner records privacy/consent, onboarding, Android-only, and beta scope acceptance                                                | Product owner       |

The physical-phone gate may be satisfied by the local device workflow or by a
short AWS Device Farm session. An EC2 emulator cannot satisfy it. If the
physical gate is unavailable by the beta cutoff, publish the beta only with an
explicitly documented limitation and do not describe that capability as
verified.

## Physical acceptance checklist

Record `PASS`, `FAIL`, or `SKIP` for each item and attach only sanitized hashes:

- [ ] App installs, launches, and survives a force-stop/relaunch.
- [ ] Project creation and save/load work with no desktop, bridge, GitHub, or
      Proton account dependency.
- [ ] Portrait/landscape and font-scale changes remain usable.
- [ ] Gestures, keyboard input, back navigation, and accessibility labels work.
- [ ] Camera/microphone permission denial and re-approval produce truthful UI.
- [ ] Biometric success, cancellation, and fallback paths behave correctly.
- [ ] Offline/network transition and storage-pressure states are understandable.
- [ ] No credentials, tokens, private paths, or personal content appear in
      screenshots or logs.

Use [LOCAL_DEVICE_TESTING.md](LOCAL_DEVICE_TESTING.md) for local ADB capture
and [AWS_DEVICE_FARM.md](AWS_DEVICE_FARM.md) for real-device alternatives.

## Final sign-off record

Copy this block into the release record and complete it only after reviewing
the evidence directory:

```text
Release commit:
Release date (UTC):
Evidence directory:
Release-index SHA-256:
Desktop baseline: PASS / FAIL / SKIP
Desktop visual smoke: PASS / FAIL / SKIP
Android baseline: PASS / FAIL / SKIP
KVM emulator: PASS / FAIL / SKIP
Physical device: PASS / FAIL / SKIP
Signed artifacts: PASS / FAIL / SKIP
Integrity bundle: PASS / FAIL / SKIP
Product acceptance: PASS / FAIL / SKIP
Known limitations:
Product owner:
Release operator:
Signed off (UTC):
```

The runbook supplements [RELEASE_PLAN.md](RELEASE_PLAN.md); it does not turn
an unavailable environment into a passing result.

Generate the machine-readable index from the current commit with:

```sh
node scripts/release-index.js \
  --android-verification dist/android-verification.json \
  --desktop-baseline dist/desktop-baseline.json \
  --canonical-source dist/canonical-source-evidence.json \
  --release-manifest dist/release-evidence/release-manifest.json \
  --visual-result release-evidence/desktop-visual/result.json \
  --kvm-result release-evidence/android-emulator/result.json \
  --target "SpartanCode beta" \
  --output release-evidence/release-index.json
```

Pass `SPARTANCODE_KVM_RESULT=release-evidence/android-emulator/result.json`
to `scripts/android-kvm-smoke.sh` to emit commit-bound emulator evidence after
the APK installs, launches, and produces its screenshot.

Run `npm run desktop:evidence -- --output dist/desktop-baseline.json` to emit
redacted commit-bound desktop test and formatting evidence.

Run `npm run canonical:evidence -- --output dist/canonical-source-evidence.json`
to record the redacted synchronized commit from `scripts/verify-sync.sh`.

The generator fails closed on stale Android evidence and leaves unavailable
physical, signing, emulator, visual, synchronization, and product-owner gates
as `SKIP` until their evidence is supplied.
