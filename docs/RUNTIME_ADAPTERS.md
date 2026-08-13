# Runtime adapters

SpartanCode reports optional runtimes as unavailable until an adapter is
actually present. Desktop llama.cpp inference can be enabled without adding a
Node native addon by pointing the process at an existing executable:

```bash
export SPARTANCODE_LLAMA_CLI=/absolute/path/to/llama-cli
```

Requests through the runtime boundary must provide an absolute existing GGUF
`modelPath`, a prompt, and optional bounded `maxTokens` (1–4096) and
`temperature` (0–2). The adapter invokes the executable with `execFile` and
argument arrays; it does not use a shell or interpolate commands.

MLC Chat, PocketPal, and WebLLM remain optional platform adapters. Android
ships the MIT-licensed `@pocketpalai/llama.rn` native adapter through its Expo
config plugin; it is only available in a prebuilt native binary and requires
an absolute local GGUF path. Android does not require a desktop runtime for
offline planning, queueing, collaboration, or review.
