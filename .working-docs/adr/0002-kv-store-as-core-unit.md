# 0002 — KV Store promoted to core unit

KV Store was originally designed as an optional "extra" unit under a `~kv-store/` directory prefix, with the intent that users could opt in or out. It has been promoted to a core unit alongside db, auth, logs, pubsub, rpc, and storage.

The reason: caching is fundamental enough to most business applications that making it optional added complexity (conditional imports, broken `~` prefix convention, missing subpath exports) without meaningful benefit. `PlatformConfig` requires `kvStore` as one of its fields (now 9: db, auth, logs, pubsub, storage, rpc, kvStore, audit — a required core unit; the "7 fields" figure predates the audit unit). The `~` prefix convention for "extra" units has been abandoned entirely.
