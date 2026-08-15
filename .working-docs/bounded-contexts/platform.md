# Platform Context

> Package: `@aspen-os/platform`. This context owns the framework kernel: shared kernel types, the three server platform classes, the eight core units, the client platform, and the workflow engine. It is the **Customer** context — it creates and wires units and modules.

## Relationship Type

| Relationship    | With              | Kind              | Notes                                                                   |
| --------------- | ----------------- | ----------------- | ----------------------------------------------------------------------- |
| Shared Kernel   | all units/modules | Shared            | `Unit` / `Module` interfaces, `PlatformUnits` types                     |
| Platform        | units             | Customer–Supplier | `Platform.create(config, modules)` instantiates + wires all units       |
| Platform        | modules           | Customer–Supplier | creates proxy-wrapped instance; modules receive units via `$initialize` |
| Auth            | better-auth       | Conformist        | AuthUnit adapts better-auth's API surface                               |
| Logs            | pino              | Conformist        | LogUnit conforms to pino's logger API                                   |
| PubSub          | pg-boss           | Conformist        | PubSubUnit conforms to pg-boss's job-queue API                          |
| Storage         | S3 (AWS SDK)      | Partner           | StorageUnit defines `StorageProvider`; S3 conforms                      |
| RPC             | oRPC              | Conformist        | RpcUnit conforms to oRPC's router/procedure conventions                 |
| KV Store        | Postgres          | Conformist        | KvStoreUnit adapts Postgres as a Redis-like KV store                    |
| Audit           | —                 | Core              | Native platform unit — `audit_log` table, no external dependency        |
| Client Platform | —                 | —                 | Browser-side `Platform` with 3 units (auth, logs, rpc)                  |
| Recruiter       | Platform          | Downstream        | Intended first app — uses `SingleTenantPlatform`, org + tasks           |

## Shared Kernel

**Contents** (inline in `packages/platform/src/server/index.ts` and `packages/platform/src/client/index.ts`):

- `Unit` interface — `{ readonly $name: string, $cleanup(): Promise<void>, $prepareInfra?(): Promise<void> }`
- `Module` interface — `{ readonly $name: N, readonly $dependencies: readonly string[], $initialize(units: Record<string, Unit>): void, $prepareInfra(): ModuleInfra, $prepareRuntime(): void | Promise<void>, $prepareTenant?(tenantId: string): Promise<void>, $cleanup(): void | Promise<void> }`
- `PlatformUnits` (server) — `{ audit, auth, db, kvStore, logs, pubsub, rpc, storage }` (8 units)
- `PlatformUnits` (client) — `{ auth, logs, rpc }` (3 units)

Both server and client use the `$` prefix for lifecycle methods and the name property. On the server the interfaces are defined inline at the top of `server/index.ts`; on the client, `Unit`/`Module` live in `client/types.ts` while `PlatformUnits`/`Platform` are in `client/index.ts`. `DatabaseConfig`, `AuthConfig`, `LogConfig`, etc. live in their respective unit directories.

**Rules**:

- Changes to the shared kernel require coordinated updates across all units.
- The shared kernel should remain minimal — only truly universal types.
- No implementation details leak through the shared kernel.

## Platform → Units (Customer–Supplier)

**Direction**: Platform classes create and wire units via `Platform.create(config, modules)`. Units have no knowledge of Platform. Three server platform classes: `SingleTenantPlatform`, `SharedTenantPlatform`, `IsolatedTenantPlatform`. The client has a single `Platform` class.

```
SingleTenantPlatform.create(config, modules)
SharedTenantPlatform.create(config, modules)
IsolatedTenantPlatform.create(config, modules)
    │
    ├── creates DatabaseUnit(config.db, tenancy config)
    ├── creates LogUnit(config.logs, { db })
    ├── creates AuditUnit({ db })
    ├── creates PubSubUnit(config.pubsub, { db })
    ├── creates AuthUnit(config.auth, { db, pubsub })
    ├── wires pubsub.setAuth(auth)
    ├── creates StorageUnit(config.storage, { db })
    ├── creates KvStoreUnit(config.kvStore, { db })
    ├── creates RpcUnit(config.rpc, { auth, db, logs, pubsub })
    ├── validates module $dependencies
    │
    └── calls mod.$initialize(units) for each module
        └── returns proxy-wrapped platform instance
```

**Dependency graph** (constructor injection):

```
DatabaseUnit ← LogUnit
DatabaseUnit ← AuditUnit
DatabaseUnit ← PubSubUnit
DatabaseUnit ← StorageUnit
DatabaseUnit ← AuthUnit
DatabaseUnit ← RpcUnit
DatabaseUnit ← KvStoreUnit
LogUnit      ← AuthUnit
PubSubUnit   ← AuthUnit
LogUnit      ← RpcUnit
PubSubUnit   ← RpcUnit
AuthUnit     ← RpcUnit
```

### The eight core units

| Unit                    | `$name`     | Injected deps                | Notes                                                                   |
| ----------------------- | ----------- | ---------------------------- | ----------------------------------------------------------------------- |
| `db` (DatabaseUnit)     | `"db"`      | — (owns `pg.Pool` + drizzle) | tenancy, RLS, `prepareWithModules`; the load-bearing unit               |
| `auth` (AuthUnit)       | `"auth"`    | `{ db, pubsub }`             | better-auth service, `fetchHandler`, `rest` getter, `applyModuleAcl`    |
| `audit` (AuditUnit)     | `"audit"`   | `{ db }`                     | `diff`/`write`/`query`/`reconstructState`/`count`; `audit_log` table    |
| `logs` (LogUnit)        | `"logs"`    | `{ db }`                     | buffered pino-style logger; `child()`, `query`, `getStats`              |
| `pubsub` (PubSubUnit)   | `"pubsub"`  | `{ db }`                     | single control-plane pg-boss, **lazily started**                        |
| `storage` (StorageUnit) | `"storage"` | `{ db }`                     | S3 adapter (SeaweedFS-compatible) + file metadata, tenant-prefixed keys |
| `rpc` (RpcUnit)         | `"rpc"`     | `{ auth, db, logs, pubsub }` | oRPC `RPCHandler`; built-in `echo` + `health.check`                     |
| `kvStore` (KvStoreUnit) | `"kvStore"` | `{ db }`                     | Postgres-backed; `get`/`set`/`del`/`increment`/…                        |

`$prepareInfra` is optional and variadic; units that need inputs (e.g. `DatabaseUnit(controlPlaneSchemas, tenantSchemas)`, `AuthUnit(acl)`) declare their own concrete signatures.

### Tenancy sub-contexts

- **Tenancy Mode**: a class-time choice — `SingleTenantPlatform` (one DB, `run(fn)`, currently EXPERIMENTAL), `SharedTenantPlatform` (one DB + Postgres RLS, `run(tenantId, fn)`, currently EXPERIMENTAL), or `IsolatedTenantPlatform` (control-plane DB + per-tenant DBs, `run(tenantId, fn)`). The config type does not include a `tenancy` field — the class IS the mode.
- **Tenant ID**: a string identifier resolved from the authenticated session (e.g. better-auth `session.activeOrganizationId`) and passed to `platform.run(tenantId, fn)`. In `single` mode always `"default"`. Stored in `AsyncLocalStorage`; routes the stable DB wrapper, `PubSubUnit` messages, and `StorageUnit`/`KvStoreUnit` key prefixes.
- **Tenant Resolver**: `{ resolve(tenantId) → dbName, list() → tenantIds }` used by `IsolatedTenantPlatform` to lazily create per-tenant pools. Known WIP gap: `IsolatedTenantConfig` does not expose a `resolver` field — a dummy resolver (`list: async () => []`, `resolve: async (id) => id`) is constructed inline.
- **Control Plane**: the management/administration DB connection. In `single`/`shared` this IS the app database; in `isolated` it is the shared control-plane DB holding auth + platform tables. `DatabaseUnit` always holds a control-plane pool; `AuthUnit` always uses `controlPlaneDb`.
- **Tenant Database**: per-tenant Postgres DB in `isolated` mode holding that tenant's data-plane tables. No auth tables live here. Isolation is physical.
- **Stable DB Wrapper**: a JS `Proxy` returned by `DatabaseUnit.db` (a getter). Property access reads the per-request drizzle instance from `AsyncLocalStorage` and delegates to it; in `single` mode falls back to the control-plane drizzle instance.
- **Prepare Tenant**: optional `Module.$prepareTenant(tenantId)` called per tenant at startup in `isolated` mode and during provisioning. The platform sets `AsyncLocalStorage` context with `tenantId` first. Not called in `single`/`shared` modes.

### `isGlobalTenantId`

`isGlobalTenantId(tenantId)` returns true for `"$global"` — global tenant IDs route to the control-plane DB in shared/isolated modes.

## Auth → better-auth (Conformist)

**Relationship**: AuthUnit conforms to better-auth's API surface. It adapts better-auth's plugin system (access control, admin, organization, custom session, phone number, two-factor, passkey, api-key) into Aspen's domain model.

**Adaptations**:

- `createAccessControl` → re-exported from better-auth
- `betterAuth()` → wrapped in AuthUnit constructor
- `drizzleAdapter` → configures better-auth to use the framework's drizzle instance (binds `db.controlPlaneDb`; `camelCase: false`, `provider: "pg"`, `usePlural: false`)
- better-auth's session/user/role APIs → wrapped as workflow functions (`auth.user.{create,get,remove,update}`, `auth.session.{create,invalidate,validate}`, `auth.role.{list,remove}`)

**Role model**: Roles are stored as a plain `text` column on the `user` table — not separate entities. Access control statements are defined at the application level via `createAccessControl`.

**Access control flow**: `AuthConfig` does NOT include access-control or roles fields. Modules declare their ACL via `defineAcl()` (an identity fn returning `AclDeclaration` — a `Record<string, readonly string[]>`). During `prepareInfra()`, the platform merges all module ACLs and calls `AuthUnit.applyModuleAcl(mergedAcl)`, which creates an `AccessControl` via `createAccessControl` and rebuilds the better-auth instance with the `admin({ ac: accessControl })` plugin. Initial construction includes `admin({})` without an `ac` — the AC is applied only after module infra is collected.

**Auth plugins**: `admin` (applied during `prepareInfra()` via `applyModuleAcl`, not at construction), `organization`, `username`, `phoneNumber`, `emailOTP`, `apiKey`, `twoFactor`, `passkey`. `lastLoginMethod` and `captcha` are commented out on the server surface; `LastLoginMethodClient`/`CaptchaClient` are commented out on the client surface.

**Risk**: Auth domain is tightly coupled to better-auth's type system and plugin API. Migration away would require significant rework.

## Logs → pino (Conformist)

**Relationship**: LogUnit conforms to pino's logger API. The internal `logger` field is a pino instance with OpenTelemetry span injection.

**Adaptations**:

- Pino log levels → mapped to the framework's `LogLevel` type
- Pino child loggers → wrapped as `ChildLogger` interface
- Log entries are buffered and flushed to Postgres (not just stdout)

## PubSub → pg-boss (Conformist)

**Relationship**: PubSubUnit conforms to pg-boss's job-queue API.

**Adaptations**:

- pg-boss `publish()` → wrapped with type-safe `Message<T>` generic
- pg-boss `subscribe()` / `unsubscribe()` → exposed as public API
- pg-boss schema → configurable via `PubSubConfig.schema`
- pg-boss `schedule()` → exposed for cron-based job scheduling

**Public API**: `publish`, `publishBatch`, `subscribe`, `unsubscribe`, `getQueueSize`, `purgeQueue`, `schedule`, `getUnsubscribedProducedTopics`.

**Lifecycle**: uses a single control-plane pg-boss started **lazily on first use** (`ensureStarted()` memoizes a started-promise; reset on failure so it can retry). `$prepareInfra()` is a no-op — runtime connections are deferred to first use because `$prepareInfra()` runs at deploy time, not server start. It does **not** reuse DatabaseUnit's pool; pg-boss manages its own connection lifecycle.

**Health probe**: `getQueueSize(topic)` lazily starts the boss and runs a live SQL COUNT round-trip; it works on unregistered topics and has no side effects, so `BasePlatform.healthCheck()` uses it (on `__platform_health_check`) to prove pub/sub connectivity.

**Produce tracking**: `publish`/`publishBatch` record produced topics in a `producedTopics` map. `getUnsubscribedProducedTopics()` filters to those with no registered subscriber. pg-boss silently drops publishes to topics with no queue row (`send()` returns no job id) — the health check surfaces these as `unsubscribedTopics` on the `HealthReport`. On a no-id result `publish()` warns but does not throw.

## Storage ↔ S3 (Partner)

**Relationship**: StorageUnit is a partner context with S3-compatible storage. It defines its own interface (`StorageProvider`) that S3 must conform to.

**Adaptations**:

- AWS S3 SDK → wrapped by `S3Adapter` class
- S3 operations → enriched with Postgres metadata tracking
- Signed URLs → delegated to the S3 SDK

## RPC → oRPC (Conformist)

**Relationship**: RpcUnit conforms to oRPC's router and procedure conventions.

**Adaptations**:

- oRPC `os` base → configured with `RpcContext` (`{ db, pubsub }`)
- Procedures → defined as oRPC handlers with zod validation (`echo`, `health.check`)
- Router → oRPC `Router` type, served by `RPCHandler` (default prefix `/api/rpc`)

**Note**: The RPC unit's constructor accepts `{ auth, db, logs, pubsub }` as deps but does not use them. `RpcContext` is passed at request time via `handle()`, not injected at construction. Domain modules do **not** define procedures — RPC is framework-only.

## KV Store → Postgres (Conformist)

**Relationship**: KV Store adapts Postgres as a key-value store (Redis alternative).

**Adaptations**:

- Regular `pgTable` `kv_store` (NOT `UNLOGGED` — durable writes)
- TTL → `expiresAt` column with lazy eviction on read
- Redis-like API → implemented via SQL operations

**Status**: Core unit, not optional. Required in `PlatformConfig`.

## Core: Audit Unit

**Relationship**: AuditUnit is a core platform unit (`$name = "audit"`) providing a cross-module audit log with DB-record replayability. Constructor-injected with `{ db }`. Not a conformist to any external library — it is a native platform unit writing to the platform's own `audit_log` table.

**Public API**: `write(entry, tx?)` (with optional transaction handle for atomicity), `withTransaction(entry, fn)` (runs fn + audit write in one `db.transaction()`), `query(filters)`, `count(filters)`, `diff(before, after)` (field-level diff), `reconstructState(entityType, entityId)` (replays `audit_log` rows in `seq` order to reconstruct a record's current state).

**Context integration**: Reads `actorId`, `tenantId`, `requestId`, `traceId` from `AsyncLocalStorage`. Falls back to `actorId = "system"` when context has no actor (known gap: the framework never populates `context.actorId`).

**Design**: Layer 1 of ADR-0009 — deliberate, application-level capture. Workflows call `ctx.audit.write(...)` inline. Layer 2 (trigger-based blind-write capture, ADR-0010) is not yet implemented.

## Workflow Engine (framework-level)

`Workflow.name(name).handler(fn)` (or `.input(schema).handler(fn)`) returns a `WorkflowInstance` with `.run(input, options?)`. Handlers receive a `WorkflowContext` (`{ actorId, audit, auth?, config, db, pubsub, runId, step }`) and may call `ctx.step.run(stepInstance, input)` / `ctx.step.run("name", fn)` for persisted sub-steps (deduped by `(runId, stepName)`, retried per `StepOptions.retries`) or `ctx.step.sleep(ms)`. `RunOptions` (`{ actorId?, audit?, auth?, config?, db?, pubsub? }`) override `getContext()` defaults. Steps defined with `WorkflowStep.name(name).handler(fn)` are reusable across workflows. Persisted to `workflow_runs` / `workflow_steps`. Avoid the names "Job"/"Task" (collides with the Tasks domain).

## Client Platform

**Exported as**: `@aspen-os/platform/client`

**Relationship**: A separate client `Platform` class for browser-side use with 3 units:

- `AuthUnit` — wraps the better-auth React client (`createAuthClient`) with plugins: admin, username, organization, phoneNumber, emailOTP, apiKey, twoFactor, passkey (lastLoginMethod + captcha commented out)
- `LogsUnit` — stub (stores config only, no logging methods)
- `RpcUnit` — stub (no-op)

**No database dependency**: the client platform has no `DatabaseUnit`, `PubSubUnit`, `StorageUnit`, `KvStoreUnit`, or `AuditUnit`. Client units have **no** lifecycle methods — `Unit<Config>` is `{ readonly $config: Config; readonly $name: string }`; client `Module` is `{ readonly $name: N }`.

**Context**: `setContext()`/`getContext()` in `client/context.ts` (module-level variable, not `AsyncLocalStorage`). `Platform.run(fn)` sets client-side context (`{ auth, logs, rpc }`) and invokes `fn`.

## Recruiter (Downstream App)

**Relationship**: The intended first app creates the platform via `SingleTenantPlatform.create(config, modules)` and passes domain modules. Currently registers `organization` and `tasks`. Not yet in the repo — there is no `examples/` directory.

**Lifecycle**:

```
SingleTenantPlatform.create(config, [organization, tasks])
    → p.$prepareInfra()  // unit.$prepareInfra() + collect mod.$prepareInfra() + db.prepareWithModules() + auth.applyModuleAcl() + mod.$prepareRuntime()
    → p.run(fn)         // AsyncLocalStorage context
    → p.$cleanup()       // mod.$cleanup() then unit.$cleanup()
```

## Platform Kernel Language

- Platform, Platform (client), Unit, Module, Create, PrepareInfra, Destroy, Run, GetUnit, GetModule, $dependencies, Workflow, WorkflowStep, WorkflowContext, StepRunner, RunOptions, StepOptions, Health Check, HealthReport, AsyncLocalStorage, Control Plane, Tenant Database, Tenant Resolver, Stable DB Wrapper, Prepare Tenant, isGlobalTenantId
- Auth: User, Session, Account, Verification, Role, Access Control, Auth Event
- Logging: Log Entry, Level, Service, Span, Trace, Buffer, Flush, Drain, Query, Stats
- PubSub: Topic, Publish, Subscribe, Unsubscribe, Message, Handler, Retry, Priority, Queue, Schedule, Unsubscribed Produced Topic, Health Probe
- Storage: File Metadata, Bucket, Key, Upload, Download, Archive, Signed URL, ETag
- RPC: Procedure, Router, Handler, Middleware, Context, Request, Response
- KV Store: Key, Value, TTL, Cache, Evict, Scan, Increment, Decrement
- Audit: Audit Entry, Audit Log, CrudAction, Idempotency Key, Workflow Run, Workflow Step, Reconstruct State, Diff, Write, Query, WithTransaction
