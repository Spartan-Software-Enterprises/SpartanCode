# Physical-device validation with AWS Device Farm

The persistent AWS Dev EC2 host validates builds, Linux tooling, Android
emulators, Playwright, and release evidence. It cannot prove phone hardware,
biometrics, cameras, NPU behavior, AR/VR, or device-specific UI behavior.

Use AWS Device Farm for those gates instead of keeping a second EC2 host
running continuously. Device Farm provides real Android and iOS phones and
tablets, browser-based remote access, screenshots/video/logs, network shaping,
and an Appium endpoint. Device Farm currently uses `us-west-2`.

## Budget-safe workflow

1. Build the debug APK or signed release artifact on the AWS Dev host.
2. Upload only the required APK/IPA; never upload credentials, Proton exports,
   private keys, or production data.
3. Run a short session for portrait/landscape, gestures, accessibility,
   biometric fallback, and device-specific behavior.
4. Capture screenshots, logs, and video as release evidence.
5. Stop the session immediately and remove uploaded test artifacts when no
   longer needed.
6. Record the device model, OS version, session result, and evidence hash in
   the release manifest.

Example discovery command:

```sh
AWS_DEFAULT_REGION=us-west-2 aws devicefarm list-devices \
  --query 'devices[?formFactor==`PHONE` && availability==`AVAILABLE`].[name,platform,os,arn]' \
  --output table
```

Device Farm is pay-as-you-go by device minute after its promotional free
allocation. Keep sessions short and monitor AWS credits before each run.
Device Farm is optional; Android remains standalone and does not require AWS,
a desktop, or a bridge.

References: <https://docs.aws.amazon.com/devicefarm/latest/developerguide/welcome.html>
and <https://aws.amazon.com/device-farm/pricing/>.
