# 0007 — Platform tenancy abstraction: three platform classes

The platform server exports three self-contained platform classes —
`SingleTenantPlatform`, `SharedTenantPlatform`, and `IsolatedTenantPlatform` —
one per tenancy architecture. The developer picks a class at application
startup and commits to it for the application's lifetime. There is no single
`Platform` class on the server and no `tenancy` config field. The class choice
IS the mode. Each class has its own config type (`SingleTenantConfig`,
`SharedTenantConfig`, `IsolatedTenantConfig`), its own `create()` static
factory, its own `prepareInfra()`, `run()`, `destroy()`, `getModule()`, and
`getUnit()`. The same module code — workflows, services, schemas — works
transparently across all three.

The `run()` signature differs per class to enforce correct usage at the type
level: `SingleTenantPlatform.run(fn)` takes no tenant ID;
`SharedTenantPlatform.run(tenantId, fn)` and
`IsolatedTenantPlatform.run(tenantId, fn)` require one. These are not
overloads — each class has exactly one `run()` signature.

`DatabaseUnit` is constructed with `{ mode: "single" | "shared" | "isolated" }`
internally by each platform's `create()`. The mode is not exposed as a
config field to the application developer.

We rejected three alternatives:

- **Single `Platform` class with a `tenancy: { mode }` config field** (the
  original ADR-0007 approach): simpler mental model but the `run()` signature
  had to be overloaded (`run(fn)` vs `run(tenantId, fn)`), making the
  type-level guarantee impossible. A single class also meant all tenancy
  branching logic lived behind runtime conditionals rather than being
  structurally separated. Three classes make the mode a compile-time fact,
  not a runtime check.
- **Strategy pattern (TenancyStrategy interface with 3 implementations)**:
  cleaner OOP but adds a new abstraction layer and indirection. The
  config-flag approach is simpler and the mode branching lives in one place
  (`DatabaseUnit`).
- **Separate TenancyUnit (8th core unit)**: more explicit but changes every
  module's `$initialize()` signature and adds a unit to the required set. The
  tenancy logic is fundamentally about database connection routing, so it
  belongs in `DatabaseUnit`.

Key sub-decisions:

- **`tenant_id` column always present** on every table (except auth tables),
  with `DEFAULT 'default'`. Avoids conditional schema definitions. In
  single-tenant mode it's always `"default"`. In RLS mode it varies per row.
  In isolated mode it's redundant but harmless.
- **RLS policies applied via post-push SQL**, not drizzle's `pgPolicy()`.
  Applied after `pushSchema()` in shared mode only, via
  `DatabaseUnit.applyRlsPolicies()`.
- **Per-request client + `SET LOCAL`** for shared mode. `run(tenantId, fn)`
  acquires a dedicated client, starts a transaction, sets
  `SET LOCAL app.tenant_id` and `SET LOCAL ROLE tenant_role`, creates a
  drizzle instance wrapping that client, and releases after `fn()`.
- **Per-tenant DB resolution** in isolated mode. `run(tenantId, fn)` resolves
  the per-tenant `DatabaseConfig` via the resolver and creates a drizzle
  instance. `prepareInfra()` iterates all tenants from `resolver.list()` and
  calls `$prepareTenant(tenantId)` on each module.
- **Module `$dependencies`** — the `Module` interface gains
  `$dependencies: readonly string[]` for initialization ordering. Validated
  at `create()` time: if a module declares a dependency that wasn't provided,
  the platform throws.
- **Control-plane connection always**. `DatabaseUnit` always holds a
  control-plane pool. `AuthUnit` always uses `controlPlaneDb`. Auth tables
  are exempt from `tenant_id` and RLS.
- **Client framework unchanged**. The client still has a single `Framework`
  class (3 units, no DB, no tenancy). The server/client split is orthogonal
  to the tenancy platform choice.

This revises the original ADR-0007, which described a single `Framework`
class with a `tenancy` config field. ADR-0005 and ADR-0006 (which committed
to database-per-tenant as the only option) are still valid for the
`isolated` mode specifically.

## Consequences

- No `tenancy` field in config. The platform class choice implies the mode.
  Each config type (`SingleTenantConfig`, `SharedTenantConfig`,
  `IsolatedTenantConfig`) omits `tenancy` entirely.
- `run()` is not overloaded. `SingleTenantPlatform.run(fn)` and
  `SharedTenantPlatform.run(tenantId, fn)` are structurally different methods
  on different classes. The type system enforces correct usage.
- `PlatformInstance<M>` is a structural type (not tied to a specific class)
  used by the CLI for dynamic loading. Use the platform-specific instance
  types (`SingleTenantPlatformInstance<M>`, etc.) for typed access including
  `run()`.
- `DatabaseUnit` exposes `tenancyMode`, `controlPlaneDb`, `resolver`, `pool`,
  `applyRlsPolicies()`. `f.tenancyMode` reads through to the db unit.
- The `Module` interface gains `$dependencies: readonly string[]` and
  optional `$prepareTenant(tenantId)`.
- Every table (except auth tables) gains a `tenant_id` column with
  `DEFAULT 'default'`.
- Unique constraints on existing tables need composite variants including
  `tenant_id`.
- In isolated mode, the app provides a `TenantResolver` (resolve + list
  functions) via `IsolatedTenantConfig.db`. (Note: the `resolver` field on
  `IsolatedTenantConfig` is currently commented out — a dummy resolver is
  used inline. This is a known WIP gap.)
- `SingleTenantPlatform` is marked EXPERIMENTAL (constructor emits
  `console.warn`).
- In isolated mode, `prepareInfra()` iterates tenants from `resolver.list()`
  and calls `$prepareTenant(tenantId)` on each module within
  `AsyncLocalStorage` context.
- In shared mode, `prepareInfra()` applies RLS policies via
  `DatabaseUnit.applyRlsPolicies()` after schema push.
