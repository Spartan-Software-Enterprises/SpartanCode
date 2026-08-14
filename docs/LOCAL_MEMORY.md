# Encrypted local memory

SpartanCode’s local memory stores bounded user preferences, context, and
successful workflow notes as hashed feature vectors. The record bundle is
encrypted through the OS-backed secure vault with AES-256-GCM; it is not stored
in the ordinary workspace JSON file.

Memory is enabled by default and can be disabled in **Settings → Remember useful
interactions**. Users can inspect, search, delete, or clear memory through the
desktop API. Secret-like content—API keys, tokens, passwords, private keys, and
similar material—is rejected before indexing. Memory is local-only and is not
sent to GitHub, API providers, or external skill repositories.

The vector implementation is deliberately bounded and dependency-light. It is
an encrypted local retrieval layer, not a claim of perfect semantic recall or
an “unbreakable” encryption guarantee.
