#!/usr/bin/env bash
set -euo pipefail

apk_path="${1:?Usage: android-kvm-smoke.sh /absolute/path/to/app-debug.apk}"
android_home="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/android-sdk}}"
android_sdk_home="${ANDROID_SDK_HOME:-$HOME/.spartancode-android-home}"
android_avd_home="${ANDROID_AVD_HOME:-$android_sdk_home/avd}"
avd_name="${SPARTANCODE_AVD_NAME:-spartancode-kvm}"
export ANDROID_HOME="$android_home"
export ANDROID_SDK_ROOT="$android_home"
export ANDROID_SDK_HOME="$android_sdk_home"
export ANDROID_AVD_HOME="$android_avd_home"
export PATH="$android_home/cmdline-tools/latest/bin:$android_home/platform-tools:$android_home/emulator:$PATH"

test -r /dev/kvm || {
  echo "KVM device is unavailable or the current user lacks permission" >&2
  exit 2
}
if ! id -nG | tr ' ' '\n' | grep -qx kvm; then
  echo "Current user is not in the kvm group" >&2
  exit 2
fi
test -f "$apk_path" || {
  echo "APK does not exist: $apk_path" >&2
  exit 2
}

mkdir -p "$android_avd_home"
if ! avdmanager list avd 2>/dev/null | grep -q "Name: $avd_name"; then
  echo no | avdmanager create avd \
    --name "$avd_name" \
    --package "system-images;android-30;default;x86_64" \
    --device pixel_2 \
    --force
fi

log_path="${SPARTANCODE_EMULATOR_LOG:-$HOME/${avd_name}-emulator.log}"
screen_path="${SPARTANCODE_EMULATOR_SCREENSHOT:-$HOME/${avd_name}-screen.png}"
emulator -avd "$avd_name" -no-window -no-audio -no-boot-anim -no-snapshot \
  -gpu swiftshader_indirect >"$log_path" 2>&1 &
emulator_pid=$!
cleanup() { kill "$emulator_pid" 2>/dev/null || true; }
trap cleanup EXIT

adb start-server
timeout 180s adb -s emulator-5554 wait-for-device
for attempt in $(seq 1 240); do
  boot_completed="$(timeout 5s adb -s emulator-5554 shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)"
  if [ "$boot_completed" = "1" ] &&
    timeout 10s adb -s emulator-5554 shell pm list packages >/dev/null 2>&1; then
    break
  fi
  if [ "$attempt" -eq 240 ]; then
    tail -100 "$log_path" >&2
    exit 1
  fi
  sleep 1
done

timeout 120s adb install -r "$apk_path"
timeout 30s adb shell monkey -p com.spartansoftware.spartancode 1
timeout 30s adb shell dumpsys package com.spartansoftware.spartancode |
  grep -q com.spartansoftware.spartancode
adb exec-out screencap -p >"$screen_path"
file "$screen_path"
echo "KVM emulator smoke passed"
