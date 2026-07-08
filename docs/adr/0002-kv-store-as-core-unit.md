# 0002 — KV Store promoted to core unit

KV Store was originally designed as an optional "extra" unit under a `~kv-store/` directory prefix, with the intent that users could opt in or out. It has been promoted to a core unit alongside db, auth, logs, pubsub, rpc, and storage.

The reason: caching is fundamental enough to most business applications that making it optional added complexity (conditional imports, broken `~` prefix convention, missing subpath exports) without meaningful benefit. The `FrameworkConfig` now requires `kvStore` as one of its 7 fields. The `~` prefix convention for "extra" units has been abandoned entirely.
