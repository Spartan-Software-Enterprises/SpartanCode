# SpartanCode release plan

Target beta release date: **2026-09-01**

This plan is the beta-release critical path for SpartanCode. `origin/main` remains
the source of truth; the KVM-capable AWS host is the active validation mirror,
and the preserved legacy host is a stopped fallback.

Use [BETA_ACCEPTANCE_RUNBOOK.md](BETA_ACCEPTANCE_RUNBOOK.md) to execute and
record each release gate. The runbook is the evidence format for the September
1 beta and keeps physical-device and signing limitations explicit.

## Beta release blockers

- [x] Desktop unit, syntax, and formatting gates pass on local and AWS hosts.
- [x] Android TypeScript, Jest, and formatting gates pass on local and AWS
      hosts.
- [x] Signed marketplace catalog publisher and verification workflow exist.
- [x] KVM-capable AWS host provisioned with nested virtualization enabled.
- [x] Android API 30 emulator boots on the KVM host, installs the x86_64
      release APK, launches SpartanCode, and captures reviewed screenshot/log
      evidence with `scripts/android-kvm-smoke.sh`.
- [x] Desktop Playwright visual and browser smoke runs on the validation host
      with current screenshots and no renderer errors.
- [x] Signed Android release AAB/APK can be produced by the release-owned key
      path and independently verified (APK v2, AAB JAR signature, and
      certificate fingerprint recorded in validation evidence). This proves
      artifact signing only; it does not approve public distribution.
- [x] Final release manifest, dependency inventory, checksums, and roadmap
      audit are generated from the exact release commit.
- [ ] Product owner completes physical-phone, privacy/consent, dependency,
      and public-beta acceptance gates documented in `COMPLIANCE.md`,
      `DEPENDENCY_AUDIT.md`, and `VERIFICATION_MATRIX.md`. Production store and
      legal review remain outside the beta claim.

## Operating cadence through the September 1 beta

1. Keep the old AWS host stopped but preserved as fallback; do not terminate it
   until the release archive and KVM validation are complete.
2. Keep the KVM host running only for active build/emulator work, then stop it
   between validation sessions to limit compute charges.
3. Every implementation change must pass the local gates, be committed and
   pushed to `origin/main`, then be fast-forwarded to the KVM checkout.
4. Re-run the full desktop and Android gates after the final release commit.
5. Archive non-secret evidence locally and to the release artifact store; never
   place private keys, provider tokens, or Proton credentials in Git.

The date does not waive beta blockers. A missing physical, signing, or beta
acceptance gate must remain visible in the release evidence instead of being
represented as a successful test.
