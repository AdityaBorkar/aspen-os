# 0007 — Platform tenancy: single isolated-DB platform class

> **Supersedes the earlier revisions of this ADR** (single `Framework` class
> with a `tenancy` config field, then three and two platform classes). The
> shared/single-tenancy machinery (`runWithTenant`, `applyRlsPolicies`,
> `tenancyMode`, RLS) has been removed — the passages below describing it are
> historical. The platform server now exports one class,
> `IsolatedTenantPlatform`, with database-per-tenant isolation.

The platform server exports `IsolatedTenantPlatform` — control-plane DB plus
one database per tenant (physical isolation). There is no `tenancy` config
field. The config type is `IsolatedTenantConfig` (`CommonConfig` plus an
`IsolatedTenantDatabaseConfig` `db`). The same module code — workflows,
services, schemas — works for control-plane and tenant contexts.

`run(tenantId, fn)` requires a tenant ID (no overloads): `"$global"` routes to
the control-plane DB, any other ID resolves the per-tenant pool via
`getTenantDb`.

`DatabaseUnit` is constructed internally by `IsolatedTenantPlatform.create()`
with the control-plane connection plus the tenant-resolution config
(`controlPlaneDbName`, `tenantDbPrefix`, `tenantDbDefaults`, `resolver`).

We rejected three alternatives (historical — recorded when multiple
architectures existed):

- **Single `Platform` class with a `tenancy: { mode }` config field** (the
  original ADR-0007 approach): simpler mental model but the `run()` signature
  had to be overloaded (`run(fn)` vs `run(tenantId, fn)`), making the
  type-level guarantee impossible.
- **Strategy pattern (TenancyStrategy interface with multiple
  implementations)**: cleaner OOP but adds a new abstraction layer and
  indirection.
- **Separate TenancyUnit (8th core unit)**: more explicit but changes every
  module's `$initialize()` signature and adds a unit to the required set. The
  tenancy logic is fundamentally about database connection routing, so it
  belongs in `DatabaseUnit`.

Key sub-decisions:

- **`tenant_id` column always present** on every table (except auth tables),
  with `DEFAULT 'default'`. Avoids conditional schema definitions. Redundant
  but harmless given physical isolation.
- **Per-tenant DB resolution**. `run(tenantId, fn)` resolves
  the per-tenant `DatabaseConfig` via the resolver and creates a drizzle
  instance. `prepareInfra()` iterates all tenants from `resolver.list()` and
  calls `$prepareTenant(tenantId)` on each module.
- **Module `$dependencies`** — the `Module` interface gains
  `$dependencies: readonly string[]` for initialization ordering. Validated
  at `create()` time: if a module declares a dependency that wasn't provided,
  the platform throws.
- **Control-plane connection always**. `DatabaseUnit` always holds a
  control-plane pool. `AuthUnit` always uses `controlPlaneDb`. Auth tables
  are exempt from `tenant_id`.
- **Client framework unchanged**. The client still has a single `Platform`
  class (3 units, no DB, no tenancy). The server/client split is orthogonal
  to the tenancy platform choice.

This revises the original ADR-0007, which described a single `Framework`
class with a `tenancy` config field. ADR-0005 and ADR-0006 (which committed
to database-per-tenant as the only option) describe the `isolated` mode
specifically. The client framework later renamed its
`Framework` class to `Platform` (matching the server's terminology) with 3
units (auth, logs, rpc) — the name change is cosmetic, this ADR's "client
unchanged" point still holds structurally.

## Consequences

- No `tenancy` field in config. `IsolatedTenantConfig` omits `tenancy`
  entirely.
- `run()` is not overloaded. `IsolatedTenantPlatform.run(tenantId, fn)` is
  the only signature. The type system enforces correct usage.
- `PlatformInstance<M>` is a structural type (not tied to a specific class)
  used by the CLI for dynamic loading. Use `IsolatedTenantPlatformInstance<M>`
  for typed access including `run()`.
- `DatabaseUnit` exposes `controlPlaneDb`, `resolver`, `pool`,
  `prepareWithModules()`, `getTenantDb()`, `provisionTenant()`,
  `seedTenantDb()`.
- The `Module` interface gains `$dependencies: readonly string[]` and
  optional `$prepareTenant(tenantId)`.
- Every table (except auth tables) gains a `tenant_id` column with
  `DEFAULT 'default'`.
- Unique constraints on existing tables need composite variants including
  `tenant_id`.
- The app provides a `TenantResolver` (resolve + list
  functions) via `IsolatedTenantConfig.db`. (Note: the `resolver` field on
  `IsolatedTenantConfig` is currently commented out — a dummy resolver is
  used inline. This is a known WIP gap.)
- `prepareInfra()` iterates tenants from `resolver.list()`
  and calls `$prepareTenant(tenantId)` on each module within
  `AsyncLocalStorage` context.
