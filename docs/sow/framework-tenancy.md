# Framework Tenancy Transformation — Scope of Work

> Scope of Work for transforming `@aspen-os/framework` to support three selectable tenancy
> architectures: Single Tenant, Multi-Tenant (Shared DB + RLS), and Multi-Tenant (Isolated DB).
>
> The developer chooses one mode at config time and commits to it for the entire application.
> The same module code works transparently across all three modes.
>
> This SOW was produced by a `/grill-with-docs` session. The architectural decision is recorded in
> [ADR-0007](../adr/0007-framework-tenancy-abstraction.md). ADR-0005 and ADR-0006 are revised in
> place to reflect the three-mode design. Domain language is captured in
> [CONTEXT.md → Tenancy](../../CONTEXT.md).

## Overview

The framework today is hardcoded single-tenant: one `pg.Pool`, one drizzle instance, one
`DatabaseConfig`. Every workflow captures `this.db = units.db.db` at init time and holds it
forever. There is zero tenant awareness anywhere — no tenant context, no `tenant_id` columns,
no RLS, no per-tenant connection routing.

This SOW transforms the framework so that the tenancy mode is a **config-time choice**. Three
modes are supported:

| Mode | Databases | Isolation | `tenant_id` columns | Connection routing |
|---|---|---|---|---|
| **Single Tenant** | 1 | None needed | Present (always `"default"`) | Static pool |
| **Shared DB + RLS** | 1 (shared) | Postgres RLS policies | Present (varies per row) | Per-request client + `SET LOCAL` |
| **Isolated DB** | N+1 (control-plane + per-tenant) | Physical (separate DBs) | Present (redundant per DB) | Per-tenant pool resolution |

The same module code — workflows, services, schemas — works in all three modes without
modification. The framework handles mode-specific behavior internally.

---

## Key Architectural Decisions

1. **Config flag with conditionals** — A `tenancy` field in `FrameworkConfig` selects the mode.
   `DatabaseUnit` checks the mode internally. No strategy pattern, no separate tenancy unit.

2. **Stable DB wrapper** — `DatabaseUnit.db` becomes a getter that returns a stable wrapper object
   (created once at init). The wrapper resolves the correct per-request drizzle instance via
   `AsyncLocalStorage` at query time. Workflows keep `this.db = units.db.db` — no workflow code
   changes.

3. **Per-request client + `SET LOCAL`** — In RLS mode, `run()` acquires a dedicated client from
   the pool, starts a transaction, executes `SET LOCAL app.tenant_id = <tenantId>`, creates a
   drizzle instance wrapping that client, and provides it via context. The client is released
   after `fn()` completes.

4. **`run(tenantId, fn)`** — The caller resolves the tenant ID (e.g., from the auth session's
   `activeOrganizationId`) and passes it to `run()`. The framework doesn't know about auth — it
   just takes a tenant ID.

5. **Always include `tenant_id` column** — Every table in every module gets a `tenant_id` column
   with `DEFAULT 'default'`. In single-tenant mode it's always `"default"`. In RLS mode it varies
   per row and RLS policies filter by it. In isolated mode it's always the tenant's ID
   (redundant but harmless). This avoids conditional schema definitions.

6. **Post-push SQL for RLS policies** — RLS policies are applied via raw SQL (using drizzle's `sql`
   tag) after `pushSchema()` in RLS mode only. The framework provides a standard policy template.
   This avoids conditional `pgPolicy()` in schema definitions.

7. **Mode-aware `$prepare()` + provisioning** — `DatabaseUnit.$prepare()` pushes framework schemas
   to the control-plane DB (always). In isolated mode, per-tenant schema push happens during
   tenant provisioning, not at framework startup.

8. **Per-tenant PubSub instances** — In isolated mode, each tenant DB has its own pg-boss
   instance. `PubSubUnit` routes `publish`/`subscribe`/`schedule` to the correct per-tenant
   pg-boss based on the context's `tenantId`. A control-plane pg-boss handles platform-level
   events.

9. **New `$prepareTenant(tenantId)` lifecycle** — A new optional method on the `Module` interface.
   Called at startup for each existing tenant (isolated mode) and during tenant provisioning.
   Modules register per-tenant cron schedules and subscriptions here. `$prepare()` stays for
   control-plane-level setup only.

10. **Control-plane connection always** — `DatabaseUnit` always holds a control-plane connection
    (the main DB in single/RLS mode, the control-plane DB in isolated mode). `AuthUnit` always
    uses the control-plane connection. Auth tables are only pushed to the control-plane DB.

11. **Tenant-aware Storage & KV** — `file_metadata` and `kv_store` tables get `tenant_id` columns.
    S3 keys are prefixed with `tenantId`. KV keys are prefixed with `tenantId`. The prefix is
    resolved per-request from context.

12. **Required config field, validated at `create()`** — The `tenancy` field is required in
    `FrameworkConfig`. The framework validates it at `Framework.create()` time. Once set, the mode
    cannot be changed.

---

## 1. Tenancy Configuration

### 1.1 TenancyConfig

A new required field on `FrameworkConfig`:

```ts
type FrameworkConfig = {
  tenancy: TenancyConfig
  auth: AuthConfig
  db: DatabaseConfig
  kvStore: KvStoreConfig
  logs: LogConfig
  pubsub: PubSubConfig
  rpc: RpcConfig
  storage: StorageConfig
}
```

The `db` config is always the **control-plane** database connection. In single/RLS mode, this IS
the app database. In isolated mode, this is the control-plane database (auth + platform tables);
per-tenant DB configs are resolved by the `TenantResolver`.

```ts
type TenancyConfig =
  | { mode: "single" }
  | { mode: "shared" }
  | {
      mode: "isolated"
      resolver: TenantResolver
    }

type TenantResolver = {
  resolve: (tenantId: string) => Promise<DatabaseConfig>
  list: () => Promise<string[]>
}
```

- **`single`**: No tenant resolution. One database. `run(fn)` takes no tenant ID.
- **`shared`**: One shared database. `run(tenantId, fn)` sets `SET LOCAL app.tenant_id` per
  request. RLS policies enforce isolation.
- **`isolated`**: Control-plane DB + per-tenant DBs. `resolver.resolve(tenantId)` returns
  the per-tenant `DatabaseConfig`. `resolver.list()` returns all tenant IDs (used at startup
  to call `$prepareTenant()` for each).

### 1.2 Mode Access

The framework instance exposes the mode via a getter:

```ts
framework.tenancyMode  // "single" | "shared" | "isolated"
```

Units and modules can check the mode at runtime if needed, though most should be transparent.

### 1.3 Validation

`Framework.create()` validates:
- `tenancy` is present and `mode` is one of the three values.
- In `isolated` mode, `resolver` is present with both `resolve` and `list` functions.
- The mode is fixed for the lifetime of the framework instance — there is no `setMode()`.

---

## 2. DatabaseUnit Transformation

The `DatabaseUnit` is the most heavily modified unit. It gains mode-aware behavior while
maintaining backward compatibility for single-tenant mode.

### 2.1 Internal State

```ts
export class DatabaseUnit {
  readonly $name = "db"
  readonly config: DatabaseConfig          // control-plane config
  readonly tenancyMode: TenancyMode

  // Control-plane connection (always present)
  private controlPlanePool: pg.Pool
  private controlPlaneDb: NodePgDatabase

  // Per-tenant connections (isolated mode only)
  private tenantPools: Map<string, { pool: pg.Pool; db: NodePgDatabase }> = new Map()
  private resolver?: TenantResolver

  // The stable wrapper (returned by the `db` getter)
  private dbWrapper: NodePgDatabase
}
```

### 2.2 Constructor

```ts
constructor(config: DatabaseConfig, tenancy: TenancyConfig) {
  this.config = config
  this.tenancyMode = tenancy.mode

  // Always create the control-plane pool
  this.controlPlanePool = new pg.Pool({ ... })
  this.controlPlaneDb = drizzle(this.controlPlanePool)

  // In isolated mode, store the resolver
  if (tenancy.mode === "isolated") {
    this.resolver = tenancy.resolver
  }

  // Create the stable wrapper
  this.dbWrapper = this.createDbWrapper()
}
```

### 2.3 The `db` Getter — Stable Wrapper

The `db` property becomes a getter that returns a stable wrapper object. The wrapper is created
once in the constructor and returned on every access. It resolves the correct drizzle instance
per-request via `AsyncLocalStorage`.

```ts
get db(): NodePgDatabase {
  return this.dbWrapper
}
```

The wrapper is implemented as a JavaScript `Proxy`:

```ts
private createDbWrapper(): NodePgDatabase {
  return new Proxy({} as NodePgDatabase, {
    get: (_target, prop) => {
      // Check for per-request context
      const ctx = context.getStore()
      if (ctx?.db) {
        return Reflect.get(ctx.db, prop)
      }
      // Fallback to control-plane db (single-tenant mode, or outside run())
      return Reflect.get(this.controlPlaneDb, prop)
    },
  })
}
```

**Behavior by mode:**

- **Single-tenant**: `context.getStore()?.db` is set in `run()` to the control-plane db. The
  wrapper delegates to it. If called outside `run()`, it falls back to `controlPlaneDb` directly.
  This preserves backward compatibility — workflows can use `this.db` outside `run()`.

- **shared**: `run(tenantId, fn)` acquires a dedicated client, sets `SET LOCAL`, creates a
  drizzle instance wrapping that client, and puts it in context. The wrapper delegates to it.
  Calling `this.db` outside `run()` falls back to `controlPlaneDb` (no RLS — for system queries).

- **isolated**: `run(tenantId, fn)` resolves the per-tenant drizzle instance and puts it in
  context. The wrapper delegates to it. Calling `this.db` outside `run()` falls back to
  `controlPlaneDb` (for control-plane queries like auth).

### 2.4 `controlPlaneDb` Accessor

A new public property for units that always need the control-plane connection (e.g., `AuthUnit`):

```ts
get controlPlaneDb(): NodePgDatabase {
  return this.controlPlaneDb
}
```

### 2.5 Per-Tenant Pool Management (isolated Mode)

```ts
private async getTenantDb(tenantId: string): Promise<NodePgDatabase> {
  let entry = this.tenantPools.get(tenantId)
  if (!entry) {
    const tenantConfig = await this.resolver!.resolve(tenantId)
    const pool = new pg.Pool({ ...tenantConfig })
    const db = drizzle(pool)
    entry = { pool, db }
    this.tenantPools.set(tenantId, entry)
  }
  return entry.db
}
```

Pools are lazily created and cached. `$destroy()` ends all pools:

```ts
async $destroy() {
  await this.controlPlanePool.end()
  for (const { pool } of this.tenantPools.values()) {
    await pool.end()
  }
}
```

### 2.6 `$prepare()` — Mode-Aware Schema Push

```ts
async $prepare() {
  const { pushSchema } = await import("drizzle-kit/api")
  const schemas = this.getSchemas()

  // Always push framework schemas to the control-plane DB
  await this.pushSchemasTo(this.controlPlaneDb, schemas)

  // In RLS mode, apply RLS policies after push
  if (this.tenancyMode === "shared") {
    await this.applyRlsPolicies(this.controlPlaneDb, schemas)
  }

  // In isolated mode, per-tenant schema push happens during provisioning
  // (not here — $prepare only handles the control-plane DB)
}
```

### 2.7 `applyRlsPolicies()` — Post-Push RLS SQL

In RLS mode, after `pushSchema()`, the framework applies standard RLS policies to every table:

```ts
private async applyRlsPolicies(db: NodePgDatabase, schemas: Record<string, unknown>) {
  const tableNames = Object.values(schemas)
    .filter((s) => s && typeof s === "object" && "_.table" in (s as any))
    .map((s) => (s as any)._.table)  // drizzle table name

  for (const tableName of tableNames) {
    await db.execute(sql`
      ALTER TABLE ${sql.identifier(tableName)} ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS tenant_isolation ON ${sql.identifier(tableName)};
      CREATE POLICY tenant_isolation ON ${sql.identifier(tableName)}
        FOR ALL TO tenant_role
        USING (tenant_id = current_setting('app.tenant_id', true)::text)
        WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::text);
    `)
  }
}
```

The `tenant_role` is a Postgres role created during `$prepare()` (or assumed to exist). The
framework's `run()` in RLS mode sets the session variable and optionally sets the role.

### 2.8 `getSchemas()` — Unchanged

`getSchemas()` still returns the merged framework-internal schemas (auth, logs, storage, kv-store).
Module schemas are pushed by modules themselves. The only change: all schema definitions now
include a `tenant_id` column (see §8).

### 2.9 `pushSchemasToTenant(tenantId)` — New Method

For isolated mode, called during tenant provisioning:

```ts
async pushSchemasToTenant(tenantId: string, moduleSchemas: Record<string, unknown>) {
  const db = await this.getTenantDb(tenantId)
  const allSchemas = { ...this.getSchemas(), ...moduleSchemas }
  await this.pushSchemasTo(db, allSchemas)
}
```

This is called by the management-plane module's `ProvisioningWorkflow` (or equivalent) when a new
tenant is created.

---

## 3. `run()` and Context Changes

### 3.1 Context Type

The `AsyncLocalStorage` context gains an optional `tenantId`:

```ts
export const context = new AsyncLocalStorage<{
  db: NodePgDatabase
  pubsub: PubSubUnit
  auth: Auth
  tenantId?: string
}>()
```

### 3.2 `run()` Signatures

Two overloads:

```ts
// Single-tenant mode
async run<T>(fn: () => T | Promise<T>): Promise<T>

// Multi-tenant modes
async run<T>(tenantId: string, fn: () => T | Promise<T>): Promise<T>
```

### 3.3 `run()` Implementation — Single-Tenant Mode

```ts
async run<T>(fn: () => T | Promise<T>): Promise<T> {
  return context.run(
    {
      auth: this.units.auth.auth,
      db: this.units.db.controlPlaneDb,
      pubsub: this.units.pubsub,
    },
    fn,
  )
}
```

### 3.4 `run()` Implementation — shared Mode

```ts
async run<T>(tenantId: string, fn: () => T | Promise<T>): Promise<T> {
  const client = await this.units.db.controlPlanePool.connect()
  try {
    await client.query("BEGIN")
    await client.query(`SET LOCAL app.tenant_id = '${tenantId}'`)
    const db = drizzle(client)
    return await context.run(
      {
        auth: this.units.auth.auth,
        db,
        pubsub: this.units.pubsub,
        tenantId,
      },
      fn,
    )
  } finally {
    await client.query("COMMIT")
    client.release()
  }
}
```

The `SET LOCAL` is transaction-scoped — all queries within the transaction see it. The drizzle
instance wraps the dedicated client (not the pool), so all queries go through that connection.

### 3.5 `run()` Implementation — isolated Mode

```ts
async run<T>(tenantId: string, fn: () => T | Promise<T>): Promise<T> {
  const db = await this.units.db.getTenantDb(tenantId)
  return await context.run(
    {
      auth: this.units.auth.auth,
      db,
      pubsub: this.units.pubsub,  // routes to per-tenant pg-boss via context tenantId
      tenantId,
    },
    fn,
  )
}
```

---

## 4. Module Interface Changes

### 4.1 New `$prepareTenant()` Lifecycle

The `Module` interface gains an optional method:

```ts
export interface Module<N extends string = string> {
  readonly $name: N
  $initialize?(units: Record<string, Unit>): void
  $prepare?(): Promise<void>
  $prepareTenant?(tenantId: string): Promise<void>  // NEW
  $destroy(): Promise<void>
}
```

### 4.2 When `$prepareTenant()` Is Called

- **At startup (isolated mode only)**: After `prepare()`, the framework calls
  `resolver.list()` to get all tenant IDs, then calls `$prepareTenant(tenantId)` for each
  module for each tenant. The framework sets up the `AsyncLocalStorage` context with the tenantId
  before calling each module's `$prepareTenant()`, so units (db, pubsub) route to the correct
  tenant.

- **During tenant provisioning**: When a new tenant is created, the framework calls
  `$prepareTenant(tenantId)` for each module. This registers per-tenant cron schedules and
  subscriptions on the new tenant's pg-boss.

- **Single-tenant and RLS modes**: `$prepareTenant()` is NOT called. Modules use `$prepare()`
  only. Cron schedules and subscriptions are registered once on the shared pg-boss.

### 4.3 What Modules Do in `$prepareTenant()`

Modules that currently register cron schedules or subscriptions in `$prepare()` should move
that logic to `$prepareTenant()`:

- **Compliance**: `ReminderEngine.registerSchedules()`, `ReminderEngine.registerHandlers()`,
  `ObligationGenerator.registerHandler()`, `EventBridge.registerSubscriptions()` — all move to
  `$prepareTenant()`.
- **Drive**: The trash purge cron subscription moves to `$prepareTenant()`.
- **Other modules**: If they have no `$prepare()` cron/subscriptions, they don't need
  `$prepareTenant()`.

### 4.4 `$prepare()` vs `$prepareTenant()` Split

| Concern | `$prepare()` | `$prepareTenant()` |
|---|---|---|
| Schema push (control-plane) | Yes | No |
| Schema push (per-tenant) | No | No (handled by provisioning) |
| Cron schedules (shared pg-boss) | Yes (single/RLS mode) | No |
| Cron schedules (per-tenant pg-boss) | No | Yes (isolated mode) |
| Subscriptions (shared pg-boss) | Yes (single/RLS mode) | No |
| Subscriptions (per-tenant pg-boss) | No | Yes (isolated mode) |

---

## 5. PubSubUnit Transformation

### 5.1 Current State

`PubSubUnit` creates its own pg-boss connection from `db.config`. It has one pg-boss instance.
`publish()`, `subscribe()`, `schedule()` all operate on that single instance.

### 5.2 Single-Tenant Mode

No change. One pg-boss instance, current behavior.

### 5.3 shared Mode

One pg-boss instance (shared DB). The `tenantId` is included in message payloads. Cron job
handlers iterate over tenants or include `tenantId` in the payload. Subscribers use `getContext()`
to determine the tenant and route accordingly.

No structural change to `PubSubUnit` — it still has one pg-boss. The difference is that cron
handlers need to be tenant-aware (iterate over tenants in the handler body).

### 5.4 isolated Mode

`PubSubUnit` gains per-tenant pg-boss instances:

```ts
export class PubSubUnit {
  private controlPlaneBoss: PgBoss
  private tenantBosses: Map<string, PgBoss> = new Map()
  private tenancyMode: TenancyMode
  private resolver?: TenantResolver
}
```

- **Control-plane pg-boss**: Created from `db.config` (the control-plane DB). Used for
  platform-level events (e.g., `tenant:provisioned`). Always present.
- **Per-tenant pg-boss**: Lazily created from `resolver.resolve(tenantId)`. Used for
  tenant-level events (e.g., `task:created`, `drive:folder_created`).

### 5.5 Routing

`publish()`, `subscribe()`, `schedule()` read `tenantId` from `context.getStore()`:

```ts
async publish<T>(topic: string, data: T, options?: PublishOptions): Promise<string> {
  const ctx = context.getStore()
  const tenantId = ctx?.tenantId

  if (this.tenancyMode === "isolated" && tenantId) {
    const boss = await this.getTenantBoss(tenantId)
    return boss.send(topic, data, options)
  }
  return this.controlPlaneBoss.send(topic, data, options)
}
```

`subscribe()` and `schedule()` follow the same pattern — they route to the per-tenant pg-boss
when a `tenantId` is in context.

### 5.6 Handler Wrapping

When subscribing, the handler is wrapped to set up the `AsyncLocalStorage` context before
calling the original handler:

```ts
async subscribe<T>(topic: string, handler: MessageHandler<T>): Promise<void> {
  const ctx = context.getStore()
  const tenantId = ctx?.tenantId

  const wrappedHandler = async (data: T) => {
    // Set up context for the handler
    return context.run(
      { ...ctx, tenantId, db: await this.dbUnit.getTenantDb(tenantId!) },
      () => handler(data),
    )
  }

  // Route to the correct pg-boss
  if (this.tenancyMode === "isolated" && tenantId) {
    const boss = await this.getTenantBoss(tenantId)
    await boss.work(topic, wrappedHandler)
  } else {
    await this.controlPlaneBoss.work(topic, wrappedHandler)
  }
}
```

This ensures that when a cron job fires, the handler has the correct tenant context set up, so
`getContext().db` resolves to the right drizzle instance.

### 5.7 `$prepare()` Changes

- **Single/RLS mode**: `$prepare()` starts the control-plane pg-boss (current behavior).
- **isolated mode**: `$prepare()` starts the control-plane pg-boss only. Per-tenant pg-boss
  instances are started lazily when first accessed (or during `$prepareTenant()`).

### 5.8 `$destroy()` Changes

End all pg-boss instances:

```ts
async $destroy() {
  await this.controlPlaneBoss.stop()
  for (const boss of this.tenantBosses.values()) {
    await boss.stop()
  }
}
```

---

## 6. AuthUnit Changes

### 6.1 Control-Plane Connection

`AuthUnit` uses `DatabaseUnit.controlPlaneDb` instead of `DatabaseUnit.db`:

```ts
constructor(config: AuthConfig, { db }: { db: DatabaseUnit }) {
  // Before: drizzleAdapter(db.db, { schema: ... })
  // After:
  drizzleAdapter(db.controlPlaneDb, { schema: ... })
}
```

This ensures auth always operates on the control-plane DB, regardless of the request's tenant.

### 6.2 Auth Services

The auth services (`user.ts`, `session.ts`, `role.ts`) currently use `getContext().db`. In
multi-tenant modes, `getContext().db` resolves to the per-request/per-tenant drizzle instance
(which is the control-plane DB in single/RLS mode, or the per-tenant DB in isolated mode).

For auth operations, the services should use the control-plane DB, not the per-tenant DB. This
requires changing auth services to use `DatabaseUnit.controlPlaneDb` instead of `getContext().db`.

**Approach**: Auth services receive the `DatabaseUnit` (or a control-plane db reference) at
construction time, not from context. They use `controlPlaneDb` for all queries.

### 6.3 Better-Auth Organization Plugin

In multi-tenant modes, the better-auth `organization()` plugin is used for tenant membership.
The `session.activeOrganizationId` is the tenant ID. The host app resolves this before calling
`run(tenantId, fn)`.

In single-tenant mode, the `organization()` plugin may or may not be used — it's an app-level
decision, not a framework concern.

### 6.4 User Table Extension

In isolated mode, the `user` table gains an `sp_id` FK column (per the management-plane SOW).
This is an app-level concern, not a framework concern — the framework's `AuthUnit` doesn't
enforce it.

---

## 7. Schema Management

### 7.1 `tenant_id` Column — Always Present

Every table in every module (framework + domain modules) gains:

```ts
tenantId: text("tenant_id").notNull().default("default")
```

This includes:
- **Framework tables**: `user`, `session`, `account`, `verification` (auth), `logs`,
  `file_metadata` (storage), `kv_store`.
- **Domain module tables**: all tables in organization, compliance, tasks, drive, hr.

Exception: better-auth's internal tables (`user`, `session`, `account`, `verification`) may not
accept a custom `tenant_id` column easily. In isolated mode, auth tables live only in the
control-plane DB and don't need `tenant_id`. In RLS mode, auth tables are in the shared DB but
should NOT have RLS (auth is cross-tenant). **Decision**: auth tables do NOT get `tenant_id` —
they are control-plane only and exempt from RLS.

### 7.2 RLS Policies — RLS Mode Only

In RLS mode, after `pushSchema()`, the framework applies RLS policies via SQL (see §2.7). The
policies use `current_setting('app.tenant_id')` to filter rows.

Auth tables are exempt — they have no `tenant_id` column and no RLS policies. Auth queries
always go through the control-plane connection (which bypasses RLS or uses a `BYPASSRLS` role).

### 7.3 Schema Push Per Mode

| Mode | Framework schemas | Module schemas | RLS policies |
|---|---|---|---|
| Single | Push to app DB (once) | Push to app DB (once) | None |
| shared | Push to shared DB (once) | Push to shared DB (once) | Apply after push |
| isolated | Push to control-plane DB (once) | Push to each tenant DB (during provisioning) | None |

### 7.4 Module Schema Changes

Each domain module's `db-schema.ts` adds `tenant_id` to every table. This is a mechanical change
across all modules:

```ts
// Before
export const task = pgTable("task", {
  id: text().primaryKey(),
  title: text().notNull(),
  // ...
})

// After
export const task = pgTable("task", {
  id: text().primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  title: text().notNull(),
  // ...
})
```

### 7.5 Unique Constraints

Tables with unique constraints (e.g., `driveFolder.path`, `organization.slug`,
`project.key`) need composite uniques that include `tenant_id`:

```ts
// Before
path: text().unique()

// After
path: text(),
// In table options:
uniqueIndex("drive_folder_path_unique").on(t.path, t.tenantId)
```

In single-tenant mode, this is equivalent to the old unique constraint (all rows have the same
`tenant_id`). In RLS mode, it allows the same path in different tenants. In isolated mode,
it's redundant but harmless.

---

## 8. StorageUnit Changes

### 8.1 `file_metadata` Table

Add `tenant_id` column (same pattern as all other tables).

### 8.2 S3 Key Prefixing

S3 keys are prefixed with `tenantId`:

```ts
// In upload():
const key = `${tenantId}/${originalKey}`
```

The `tenantId` is read from `context.getStore()?.tenantId ?? "default"`.

In single-tenant mode, all keys are prefixed with `default/`. In multi-tenant modes, keys are
prefixed with the actual tenant ID.

### 8.3 Storage Config

The existing `prefix` config is kept for app-level prefixing (e.g., `recruiter/`). The tenant
prefix is applied in addition:

```
Final key: ${config.prefix ?? ""}${tenantId}/${originalKey}
```

---

## 9. KvStoreUnit Changes

### 9.1 `kv_store` Table

Add `tenant_id` column (same pattern as all other tables).

### 9.2 Key Prefixing

KV keys are prefixed with `tenantId`:

```ts
// In get/set/del:
const fullKey = `${tenantId}:${key}`
```

The `tenantId` is read from `context.getStore()?.tenantId ?? "default"`.

The existing `keyPrefix` config is kept for app-level prefixing. The tenant prefix is applied
in addition:

```
Final key: ${config.keyPrefix ?? ""}${tenantId}:${originalKey}
```

### 9.3 `clear(pattern)` 

In multi-tenant modes, `clear()` should only clear keys for the current tenant. The `LIKE`
pattern is scoped to the tenant prefix.

---

## 10. LogUnit Changes

### 10.1 `logs` Table

Add `tenant_id` column. Log entries are scoped to the tenant that generated them.

### 10.2 Log Context

The `LogUnit` already uses `getContext()` for OpenTelemetry context. It should also read
`tenantId` from context and include it in log metadata and the `logs` table row.

### 10.3 Query Scoping

`query()` and `getStats()` should filter by `tenantId` from context in multi-tenant modes.

---

## 11. RpcUnit Changes

### 11.1 Tenant Resolution

The `RpcUnit` is the natural entry point for HTTP requests. The host app's request handler
should resolve the `tenantId` from the authenticated session before calling `rpc.handle()`.

The `RpcContext` gains an optional `tenantId`:

```ts
type RpcContext = {
  db: NodePgDatabase
  pubsub: PubSubUnit
  tenantId?: string
}
```

The host app passes the `tenantId` in the `RpcContext`, and the RPC handler wraps procedure
execution in `framework.run(tenantId, fn)` (or `framework.run(fn)` in single-tenant mode).

### 11.2 No Structural Change

The `RpcUnit` itself doesn't change structurally — it's the host app's responsibility to resolve
the tenant and set up the context. The framework provides the `run()` method for this.

---

## 12. CLI Changes

### 12.1 `db-studio` Command

In isolated mode, `db-studio` accepts a `--tenant` flag:

```bash
aspen db-studio --config=src/aspen/server.ts --tenant=tenant_123
```

When `--tenant` is provided, the CLI resolves the per-tenant DB config and launches Drizzle
Studio against that tenant's database. When omitted, it launches against the control-plane DB.

In single/RLS mode, `--tenant` is ignored (there's only one DB).

### 12.2 New `tenants` Command (isolated Mode)

A new CLI command to list tenants and their database status:

```bash
aspen tenants --config=src/aspen/server.ts
```

This calls `resolver.list()` and displays the tenant IDs. Useful for debugging and
operations.

---

## 13. Client Framework

### 13.1 No Structural Changes

The client framework (`@aspen-os/framework/client`) does not need significant changes. The
client operates within a single tenant's browser session. The `tenantId` is resolved on the
server and encoded in the auth session. The client doesn't need to know about tenancy mode.

### 13.2 Auth Client

The better-auth client already supports the `organization` plugin for tenant switching. The
client calls `organization.setActive({ organizationId })` to switch tenants, which updates the
session's `activeOrganizationId`. The server reads this on the next request.

---

## 14. Migration Path

### 14.1 Existing Apps (Recruiter)

The Recruiter app is single-tenant today. To migrate:

1. Add `tenancy: { mode: "single" }` to `FrameworkConfig`.
2. Add `tenant_id` column to all tables (via `pushSchema()` — it will add the column with
   `DEFAULT 'default'`).
3. No other changes needed — workflows work as before.

### 14.2 Existing Domain Modules

Each domain module (organization, compliance, tasks, drive, hr) needs:

1. Add `tenant_id` column to every table in `db-schema.ts`.
2. Update unique constraints to include `tenant_id`.
3. Move cron/subscription registration from `$prepare()` to `$prepareTenant()` (for modules
   that have them: compliance, drive).
4. No workflow code changes — the stable wrapper handles per-request db resolution.

### 14.3 New Multi-Tenant Apps

A new multi-tenant app:

1. Choose a mode: `shared` or `isolated`.
2. Configure `tenancy` in `FrameworkConfig`.
3. In RLS mode: create the `tenant_role` Postgres role, ensure `app.tenant_id` is set per
   request.
4. In isolated mode: provide a `TenantResolver` that reads from the control-plane `tenant`
   table.
5. Resolve `tenantId` from the auth session and pass to `run(tenantId, fn)`.
6. Register modules as before — they work transparently.

---

## 15. Work Phases

### Phase 1: Core Framework (DatabaseUnit, Context, run())

- Add `TenancyConfig` type and `tenancy` field to `FrameworkConfig`.
- Transform `DatabaseUnit`: control-plane pool, per-tenant pools, stable wrapper, mode-aware
  `$prepare()`, `applyRlsPolicies()`, `pushSchemasToTenant()`.
- Update `context.ts`: add `tenantId` to context type.
- Update `Framework.run()`: two overloads, per-mode implementation.
- Update `Framework.create()`: validate `tenancy` config, pass to `DatabaseUnit`.
- Update `Framework.prepare()`: call `$prepareTenant()` for each tenant in isolated mode.

### Phase 2: Schema Changes (Framework Tables)

- Add `tenant_id` column to auth, logs, storage, kv-store schema definitions.
- Update unique constraints where needed.
- Auth tables are exempt (no `tenant_id`).

### Phase 3: Module Interface

- Add `$prepareTenant()` to the `Module` interface.
- Update `Framework.prepare()` to call `$prepareTenant()` per-tenant in isolated mode.
- Set up `AsyncLocalStorage` context before calling `$prepareTenant()`.

### Phase 4: PubSubUnit Transformation

- Add per-tenant pg-boss management (isolated mode).
- Add context-based routing for `publish`/`subscribe`/`schedule`.
- Add handler wrapping for context setup.
- Update `$prepare()` and `$destroy()`.

### Phase 5: Unit Changes (Auth, Storage, KV, Logs, RPC)

- `AuthUnit`: use `controlPlaneDb`, update auth services.
- `StorageUnit`: tenant-prefixed S3 keys, `tenant_id` in `file_metadata`.
- `KvStoreUnit`: tenant-prefixed keys, `tenant_id` in `kv_store`.
- `LogUnit`: `tenant_id` in `logs`, tenant-scoped queries.
- `RpcUnit`: add `tenantId` to `RpcContext`.

### Phase 6: CLI Changes

- Add `--tenant` flag to `db-studio`.
- Add `tenants` command (isolated mode).

### Phase 7: Domain Module Migration

- Add `tenant_id` column to all tables in organization, compliance, tasks, drive, hr.
- Update unique constraints.
- Move cron/subscription registration to `$prepareTenant()` (compliance, drive).

### Phase 8: Documentation

- Create ADR-0007 (framework tenancy abstraction).
- Revise ADR-0005 and ADR-0006 in place.
- Update `CONTEXT.md` with tenancy terms.
- Update framework `README.md` with tenancy configuration section.
- Update `docs-www` framework docs with tenancy mode guide.

---

## 16. Decisions Not Made (Deferred to Implementation)

1. **Per-tenant pool limits**: Max number of concurrent tenant pools, idle timeout, LRU eviction
   policy. Implementation detail — start with unbounded Map, add limits if needed.

2. **RLS role management**: Whether the framework creates the `tenant_role` Postgres role during
   `$prepare()` or assumes it exists. Likely the framework creates it if it doesn't exist.

3. **`SET LOCAL` vs `SET`**: `SET LOCAL` is transaction-scoped (safer). The `run()` implementation
   wraps in `BEGIN`/`COMMIT`. If workflows need to run outside a transaction, `SET` (session-level)
   may be needed. Start with `SET LOCAL` + transaction wrapping.

4. **Cron job tenant iteration in RLS mode**: In shared mode, cron handlers need to iterate
   over tenants. The framework could provide a `forEachTenant(fn)` helper, or the module handles
   it. Deferred to implementation.

5. **Connection pool sizing per tenant**: Whether per-tenant pools share a max connection count
   or each gets its own. Start with each tenant getting its own pool with the same `max` as the
   control-plane pool.

6. **PubSub message format**: Whether `tenantId` is automatically injected into pubsub message
   payloads or left to the publisher. Start with the framework injecting it via the wrapper.
