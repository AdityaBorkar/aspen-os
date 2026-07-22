# 0007 — Framework tenancy abstraction: three selectable modes

The framework supports three tenancy architectures as a config-time choice: Single Tenant,
Multi-Tenant (Shared DB + RLS), and Multi-Tenant (Isolated DB). The developer picks one mode in
`FrameworkConfig.tenancy` and commits to it for the application's lifetime. The same module code
— workflows, services, schemas — works transparently across all three modes.

A `tenancy: { mode: "single" | "shared" | "isolated" }` config field selects the mode.
`DatabaseUnit` checks the mode internally (conditionals, not a strategy pattern). The `db`
property becomes a getter returning a stable wrapper object (a JavaScript `Proxy`) that resolves
the correct per-request drizzle instance via `AsyncLocalStorage`. Workflows keep
`this.db = units.db.db` — no workflow code changes.

We rejected three alternatives:

- **Strategy pattern (TenancyStrategy interface with 3 implementations)**: cleaner OOP but adds
  a new abstraction layer and indirection. The config-flag approach is simpler and the mode
  branching lives in one place (`DatabaseUnit`).
- **Separate TenancyUnit (8th core unit)**: more explicit but changes every module's
  `$initialize()` signature and adds a unit to the required set. The tenancy logic is
  fundamentally about database connection routing, so it belongs in `DatabaseUnit`.
- **Proxy drizzle instance (full proxy)**: the stable wrapper IS effectively a proxy, but it's
  minimal — it only intercepts `get` to delegate to the per-request instance. We don't proxy
  individual query builders or intercept SQL execution.

Key sub-decisions:

- **`tenant_id` column always present** on every table (except auth tables), with
  `DEFAULT 'default'`. Avoids conditional schema definitions. In single-tenant mode it's always
  `"default"`. In RLS mode it varies per row. In isolated mode it's redundant but harmless.
- **RLS policies applied via post-push SQL**, not drizzle's `pgPolicy()`. Drizzle's `pgPolicy`
  is inline in the table definition and can't be conditionally included. Post-push SQL
  (`ALTER TABLE ... ENABLE RLS; CREATE POLICY ...`) is applied after `pushSchema()` in RLS mode
  only.
- **Per-request client + `SET LOCAL`** for RLS mode. `run(tenantId, fn)` acquires a dedicated
  client, starts a transaction, sets `SET LOCAL app.tenant_id`, creates a drizzle instance
  wrapping that client, and releases after `fn()`.
- **Per-tenant PubSub instances** in isolated mode. Each tenant DB has its own pg-boss.
  `PubSubUnit` routes based on context `tenantId`. A new `$prepareTenant(tenantId)` module
  lifecycle method registers per-tenant crons/subscriptions.
- **Control-plane connection always**. `DatabaseUnit` always holds a control-plane pool.
  `AuthUnit` always uses `controlPlaneDb`. Auth tables are exempt from `tenant_id` and RLS.

This revises ADR-0005 and ADR-0006, which previously committed to database-per-tenant as the
only option. The framework now supports all three; the app developer chooses one.

## Consequences

- `FrameworkConfig` gains a required `tenancy` field. Existing apps must add
  `tenancy: { mode: "single" }` to their config.
- `DatabaseUnit.db` becomes a getter returning a stable wrapper. The wrapper is transparent to
  workflows — `this.db.select()` works as before.
- `Framework.run()` gains a `tenantId` parameter overload for multi-tenant modes.
- The `Module` interface gains an optional `$prepareTenant(tenantId)` method.
- Every table (except auth tables) gains a `tenant_id` column with `DEFAULT 'default'`.
- Unique constraints on existing tables need composite variants including `tenant_id`.
- In isolated mode, the app provides a `TenantResolver` (resolve + list functions).
- `PubSubUnit` gains per-tenant pg-boss management in isolated mode.
- `StorageUnit` and `KvStoreUnit` prefix keys with `tenantId`.
- The CLI gains a `--tenant` flag for `db-studio`.
