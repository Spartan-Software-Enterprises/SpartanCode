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

The script validates the absolute keystore path, generates the native Expo
project, writes signing properties with restrictive permissions, builds both
the release AAB and APK, generates `release-manifest.json` and
`THIRD_PARTY_NOTICES.txt` with SHA-256 artifact hashes and lockfile component
metadata, and removes the temporary properties file on exit. The keystore
itself remains outside the repository.

Desktop release evidence can be generated after packaging with:

```bash
npm run release:manifest
```

The generated files are ignored build outputs and must be attached to the
release alongside the signed artifacts. The current repository intentionally
does not contain a keystore, signing secret, or signed production artifact.
