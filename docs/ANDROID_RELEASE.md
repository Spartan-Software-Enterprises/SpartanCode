# Android release build

The repository does not contain a keystore or signing secret. A release build
must receive those values from the release environment and must never commit
them. From `android/`, provide:

```bash
export ANDROID_HOME=/path/to/android-sdk
export SPARTANCODE_KEYSTORE_FILE=/absolute/path/to/spartancode-upload.jks
export SPARTANCODE_KEYSTORE_PASSWORD='from-your-secret-store'
export SPARTANCODE_KEY_ALIAS='spartancode-upload'
export SPARTANCODE_KEY_PASSWORD='from-your-secret-store'
./scripts/build-release.sh
```

For a constrained emulator validation build, set
`SPARTANCODE_ANDROID_ARCHITECTURES=x86_64`; production release builds should
omit it so all configured device architectures are produced.

The script validates the absolute keystore path, generates the native Expo
project, writes signing properties with restrictive permissions, builds both
the release AAB and APK, generates `release-manifest.json` and
`THIRD_PARTY_NOTICES.txt` with SHA-256 artifact hashes and lockfile component
metadata, and removes the temporary properties file on exit. The keystore
itself remains outside the repository. The manifest also records a
source-backed SSO/audit/compliance control inventory. That inventory is an
implementation evidence map, not a production approval, certification, or
legal review.

Desktop release evidence can be generated after packaging with:

```bash
npm run release:manifest
```

The generated files are ignored build outputs and must be attached to the
release alongside the signed artifacts. The current repository intentionally
does not contain a keystore, signing secret, or signed production artifact.

The release environment now has a dedicated `spartancode-upload` 4096-bit RSA
key, stored outside the repository and mirrored through the four GitHub Actions
secrets below. It was validated on the AWS Dev build host by producing both a
release AAB and APK; `apksigner` verified the APK with Android Signature Scheme
v2. Keep the private keystore and passwords in the release secret store and
rotate them only through a planned application-signing migration.

## GitHub Actions release path

`.github/workflows/android-release.yml` runs only for a manual dispatch or a
`v*` tag. Configure these release-owned secrets before invoking it:

- `SPARTANCODE_ANDROID_KEYSTORE_BASE64`
- `SPARTANCODE_KEYSTORE_PASSWORD`
- `SPARTANCODE_KEY_ALIAS`
- `SPARTANCODE_KEY_PASSWORD`

The workflow decodes the keystore only into the runner temporary directory,
passes it to the guarded release script, uploads the signed AAB/APK and release
evidence as workflow artifacts, and removes the temporary keystore on exit. The
release job has a 30-minute bound so stalled toolchain or build failures become
actionable workflow results.
