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

# Read version from package.json (authoritative source)
version="$(node -p "require('./package.json').version")"
echo "Building SpartanCode v${version}"

# Derive versionCode from version string: major*10000 + minor*100 + patch
major="$(echo "$version" | cut -d. -f1)"
minor="$(echo "$version" | cut -d. -f2)"
patch="$(echo "$version" | cut -d. -f3 | cut -d- -f1)"
versionCode=$(( ${major:-0} * 10000 + ${minor:-0} * 100 + ${patch:-0} ))
echo "versionCode: $versionCode (from $version)"

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

# Patch versionCode and versionName into the generated build.gradle
build_gradle="$native_dir/app/build.gradle"
if [ -f "$build_gradle" ]; then
  sed -i "s/versionCode [0-9]*/versionCode $versionCode/" "$build_gradle"
  sed -i "s/versionName \"[^\"]*\"/versionName \"$version\"/" "$build_gradle"
  echo "Patched build.gradle: versionCode=$versionCode versionName=$version"
fi

# Sync app.json version to match package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('app.json','utf8'));
pkg.expo.version = '$version';
fs.writeFileSync('app.json', JSON.stringify(pkg, null, 2) + '\n');
console.log('app.json version synced to $version');
"

cd "$native_dir"
gradle_arch_args=""
if [ -n "${SPARTANCODE_ANDROID_ARCHITECTURES:-}" ]; then
  gradle_arch_args="-PreactNativeArchitectures=$SPARTANCODE_ANDROID_ARCHITECTURES"
fi
./gradlew bundleRelease assembleRelease $gradle_arch_args
node ../../scripts/release-manifest.js \
  --output "$native_dir/app/build/release-evidence" \
  --scan "$native_dir/app/build/outputs"
# Rename APK to project-version-variant format
apk_dir="$native_dir/app/build/outputs/apk"
if [ -d "$apk_dir/release" ]; then
  for apk in "$apk_dir"/release/*.apk; do
    [ -f "$apk" ] || continue
    dir="$(dirname "$apk")"
    new_name="SpartanCode-v${version}-release.apk"
    mv "$apk" "$dir/$new_name"
    echo "Renamed APK: $dir/$new_name"
  done
fi
echo "Release artifacts are under $native_dir/app/build/outputs/"
