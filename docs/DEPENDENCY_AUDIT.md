# Dependency audit status

The desktop production dependency tree currently reports no vulnerabilities
with `npm audit --omit=dev`.

The Android Expo/React Native tree currently reports 18 transitive findings
(7 moderate, 11 high, 0 critical) with `npm audit --omit=dev`. The findings are
in the Expo/Metro/image-size/postcss/uuid toolchain and are not resolved by a
non-breaking automatic update; `npm audit fix --force` proposes an Expo major
upgrade. That upgrade is intentionally not applied without a compatibility
pass and new Android emulator evidence.

Android release remains gated on a reviewed dependency upgrade plan, physical
device validation, and signed-artifact review. CI treats the existing lockfile
as authoritative and records this audit status rather than hiding it behind a
forced upgrade.
