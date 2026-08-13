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
the release AAB and APK, and removes the temporary properties file on exit.
The keystore itself remains outside the repository.
