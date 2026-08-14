# AR/VR integration boundary

SpartanCode now exposes a small WebXR integration contract for future project
previews and immersive collaboration. It probes `immersive-vr` and
`immersive-ar` support, reports unavailable runtimes honestly, and refuses to
start a session unless the caller supplies an explicit user gesture.

The contract does not collect camera data, infer emotion, or silently request
immersive permissions. Physical headset testing, browser permission UX,
controller/input design, and a production immersive workspace remain release
work; unsupported desktop and Android runtimes are reported rather than shown
as ready.
