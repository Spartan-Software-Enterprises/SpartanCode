# Local Android device testing

The local Android phone can provide physical-device evidence that an emulator
or EC2 instance cannot. It is useful for gestures, TalkBack, font scaling,
reduced motion, biometric prompts and fallback, camera/microphone permissions,
storage pressure, process restarts, network transitions, and device-specific
rendering.

## Termux setup

Install Android Platform Tools once:

```sh
pkg install android-tools
adb start-server
adb devices -l
```

Enable Developer Options and USB debugging on the phone, then authorize the
computer. Wireless debugging can be used instead:

```sh
adb pair PHONE_IP:PAIRING_PORT
adb connect PHONE_IP:ADB_PORT
adb devices -l
```

The device must appear as `device`, not `unauthorized` or `offline`, before a
physical test is counted. Do not commit `adb` keys, screenshots containing
private data, or device logs with credentials.

## Release-evidence workflow

1. Build the debug APK or signed artifact from the verified checkout.
2. Install it with `adb install -r path/to/SpartanCode.apk`.
3. Launch the package and exercise the target checklist on the phone.
4. Capture only sanitized evidence:

```sh
adb shell am force-stop com.spartansoftware.spartancode
adb shell monkey -p com.spartansoftware.spartancode 1
adb exec-out screencap -p > local-device-screen.png
adb logcat -d -t 300 | rg -i 'spartancode|fatal exception|androidruntime'
```

5. Record the model, Android version, test result, timestamp, and evidence
   hash. Remove the local screenshot/log if it contains user data.

This local-device path is optional and does not make the desktop app, bridge,
AWS, GitHub, or Proton services required for Android project creation. It also
does not prove iOS, NPU, AR/VR headset, or router hardware behavior; those
remain separate release-environment gates.
