#!/usr/bin/env sh
set -eu

: "${ANDROID_HOME:?ANDROID_HOME is required}"
: "${SPARTANCODE_KEYSTORE_FILE:?SPARTANCODE_KEYSTORE_FILE is required}"
: "${SPARTANCODE_KEYSTORE_PASSWORD:?SPARTANCODE_KEYSTORE_PASSWORD is required}"
: "${SPARTANCODE_KEY_ALIAS:?SPARTANCODE_KEY_ALIAS is required}"
: "${SPARTANCODE_KEY_PASSWORD:?SPARTANCODE_KEY_PASSWORD is required}"

case "$SPARTANCODE_KEYSTORE_FILE" in
  /*) ;;
  *) echo "SPARTANCODE_KEYSTORE_FILE must be an absolute path" >&2; exit 1 ;;
esac
[ -f "$SPARTANCODE_KEYSTORE_FILE" ] || {
  echo "Keystore file does not exist" >&2
  exit 1
}

npx expo prebuild --platform android --no-install
native_dir="$(pwd)/android"
properties_file="$native_dir/keystore.properties"
cleanup() { rm -f "$properties_file"; }
trap cleanup EXIT INT TERM

umask 077
cat > "$properties_file" <<EOF
storeFile=$SPARTANCODE_KEYSTORE_FILE
storePassword=$SPARTANCODE_KEYSTORE_PASSWORD
keyAlias=$SPARTANCODE_KEY_ALIAS
keyPassword=$SPARTANCODE_KEY_PASSWORD
EOF

cd "$native_dir"
gradle_arch_args=""
if [ -n "${SPARTANCODE_ANDROID_ARCHITECTURES:-}" ]; then
  gradle_arch_args="-PreactNativeArchitectures=$SPARTANCODE_ANDROID_ARCHITECTURES"
fi
./gradlew bundleRelease assembleRelease $gradle_arch_args
node ../../scripts/release-manifest.js \
  --output "$native_dir/app/build/release-evidence" \
  --scan "$native_dir/app/build/outputs"
echo "Release artifacts are under $native_dir/app/build/outputs/"
