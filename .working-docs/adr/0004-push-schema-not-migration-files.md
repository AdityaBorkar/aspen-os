# 0004 — Schema migrations via pushSchema, not migration files

DatabaseUnit.prepareInfra() uses `pushSchema()` from drizzle-kit/api to automatically apply schema changes at runtime, rather than generating and running migration SQL files.

This was chosen for development velocity — schema changes are applied automatically when `platform.prepareInfra()` is called, with no separate migration step. The trade-off is that `pushSchema` can produce data-loss warnings for destructive changes (column drops, type changes) and doesn't generate a migration history. Production deployments may need a different approach.
