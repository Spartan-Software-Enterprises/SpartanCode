# Settings hierarchy contract

Desktop and Android use the same deterministic settings contract for local
configuration. The supported fields are:

| Field               | Default      | Notes                                       |
| ------------------- | ------------ | ------------------------------------------- |
| `model`             | `Qwen3-1.7B` | Bounded model identifier                    |
| `defaultAgent`      | `leo`        | Bundled agent identifier                    |
| `protocol`          | `MCP Lite`   | `MCP Lite`, `MCP Bridge`, or `Full MCP`     |
| `apiProvider`       | `local`      | Local or configured API provider identifier |
| `memoryEnabled`     | `true`       | Boolean                                     |
| `executionMode`     | `guided`     | `guided` or `yolo`                          |
| `quantization`      | `Q4_K_M`     | Supported local quantization                |
| `voiceEnabled`      | `false`      | Boolean                                     |
| `autoSync`          | `true`       | Automatic bridge refresh on resume          |
| `personaName`       | `Leo`        | Trimmed to 48 characters                    |
| `wakeWord`          | `Leo`        | Trimmed to 48 characters                    |
| `emotionMode`       | `explicit`   | `off` or `explicit`                         |
| `interactionSignal` | `calm`       | Explicit bounded user-selected signal       |

Values are resolved in this order, with later layers taking precedence:

1. Base settings
2. Global `default`
3. Project `default`, then the selected project ID
4. Agent `default`, then the selected agent ID
5. Session `default`, then the selected session ID

Both clients trim scope identifiers to 160 characters and ignore invalid
override values instead of replacing an existing value with a platform default.
Desktop global scoped writes also update the canonical settings view. Android
accepts the former persisted `provider` key as a migration alias and writes
only the parity name `apiProvider` thereafter.
