# Interaction personalization

SpartanCode supports a small, explicit interaction-personalization contract.
The user can select a current signal—calm, focused, frustrated, uncertain,
excited, or tired—and Leo uses bounded tone guidance for that session or
settings scope.

The product does not infer emotion from a camera, microphone, facial
recognition, voice characteristics, biometric data, or hidden telemetry. The
status API reports `inference: "disabled"` and
`biometricCollection: false`. Users can also set adaptive interaction to
`off`; the assistant then uses its configured persona without adaptive tone
guidance.

The same explicit controls are available in the standalone Android app and
persist in app-private storage, without requiring a desktop or bridge. This is
intentionally an explicit preference rather than a claim that the assistant
can reliably determine a person's emotional state. Any future
inference feature would require separate consent, retention, privacy, and
physical-device validation before it could be enabled.

Android also persists the four settings scopes (global, project, agent, and
session) and resolves them in the same precedence order as the desktop store.
