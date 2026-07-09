# Bounded Contexts & Context Map

## Context Map Overview

```
                    ┌─────────────────────────────┐
                    │      SHARED KERNEL           │
                    │  types.ts: Unit, Module       │
                    └──────────────┬──────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
          ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  CONFORMIST     │    │  CONFORMIST     │    │  CONFORMIST     │
│  Auth Unit      │    │  Logs Unit      │    │  PubSub Unit    │
│                 │    │                 │    │                 │
│  conforms to    │    │  conforms to    │    │  conforms to    │
│  better-auth    │    │  pino patterns  │    │  pg-boss API    │
│  API surface    │    │                 │    │                 │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         │ depends on           │ depends on           │ depends on
         ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DATABASE UNIT                                │
│  (Shared Kernel — all units depend on this)                      │
│  pg.Pool + drizzle NodePgDatabase                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  PARTNER        │    │  CONFORMIST     │    │  CONFORMIST     │
│  Storage Unit   │    │  RPC Unit       │    │  KV Store Unit  │
│                 │    │                 │    │                 │
│  S3-compatible  │    │  oRPC router    │    │  Redis-like API │
│  interface      │    │  conventions    │    │  over Postgres  │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  S3 (external)  │    │  HTTP clients   │    │  Postgres       │
│  AWS SDK        │    │                 │    │  (UNLOGGED)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     DOWNSTREAM CONTEXTS                          │
│                                                                  │
│  ┌───────────────┐  ┌───────────────────┐  ┌───────────────┐   │
│  │ Recruiter App │  │ Organization      │  │ HR Module     │   │
│  │               │  │ Module            │  │ (stub)        │   │
│  │ creates via   │  │                   │  │               │   │
│  │ Framework.    │  │ implements        │  │ implements    │   │
│  │ create()      │  │ Module interface  │  │ Module interface  │
│  └───────────────┘  │ 6 workflows       │  │ (empty)       │   │
│                     └───────────────────┘  └───────────────┘   │
│                                                                  │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐        │
│  │ Accounting    │  │ CRM           │  │ Tasks         │        │
│  │ (stub)        │  │ (stub)        │  │ (stub)        │        │
│  └───────────────┘  └───────────────┘  └───────────────┘        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT FRAMEWORK                             │
│  Exported as ./client subpath                                    │
│  3 units: AuthUnit, LogUnit (stub), RpcUnit (stub)               │
│  Uses: better-auth React client, no database dependency          │
└─────────────────────────────────────────────────────────────────┘
```

## Context Relationships

### 1. Shared Kernel

**Shared between**: All units and modules

**Contents** (`packages/framework/src/types.ts`):
- `Unit` interface — `{ name: string, destroy(): Promise<void>, prepare?(): Promise<void> }`
- `Module` interface — `{ name: string, destroy(): Promise<void>, initialize?(units: Record<string, Unit>): void, prepare?(): Promise<void> }`

**Note**: `DatabaseConfig`, `AuthConfig`, `LogConfig`, etc. live in their respective unit directories, not in the shared kernel. The shared kernel is intentionally minimal.

**Rules**:
- Changes to the shared kernel require coordinated updates across all units
- The shared kernel should remain minimal — only truly universal types
- No implementation details leak through the shared kernel

### 2. Customer-Supplier: Framework → Units

**Direction**: Framework creates and wires units via `Framework.create(config, modules)`. Units have no knowledge of Framework.

```
Framework.create(config, modules)
    │
    ├── creates DatabaseUnit(config.db)
    ├── creates LogUnit(config.logs, { db })
    ├── creates PubSubUnit(config.pubsub, { db })
    ├── creates StorageUnit(config.storage, { db })
    ├── creates AuthUnit(config.auth, { db, logs, pubsub })
    ├── creates RpcUnit(config.rpc, { auth, db, logs, pubsub })
    ├── creates KvStoreUnit(config.kvStore, { db })
    │
    └── calls module.initialize(units) for each module
        └── returns proxy-wrapped FrameworkInstance
```

**Dependency graph** (constructor injection):
```
DatabaseUnit ← LogUnit
DatabaseUnit ← PubSubUnit
DatabaseUnit ← StorageUnit
DatabaseUnit ← AuthUnit
LogUnit  ← AuthUnit
PubSubUnit   ← AuthUnit
DatabaseUnit ← RpcUnit
LogUnit  ← RpcUnit
PubSubUnit   ← RpcUnit
AuthUnit     ← RpcUnit
DatabaseUnit ← KvStoreUnit
```

### 3. Conformist: Auth → better-auth

**Relationship**: AuthUnit conforms to better-auth's API surface. It adapts better-auth's plugin system (access control, admin, custom session, phone number) into Aspen's domain model.

**Adaptations**:
- `createAccessControl` → re-exported from better-auth
- `betterAuth()` → wrapped in AuthUnit constructor
- `drizzleAdapter` → configures better-auth to use framework's drizzle instance
- better-auth's session/user/role APIs → wrapped as `server.workflows`

**Schema**: Auth tables follow better-auth's adapter pattern:
- `user` table — core identity (id, email, name, role, phone, etc.)
- `session` table — authentication tokens (token, userId, expiresAt)
- `account` table — credentials and OAuth tokens (providerId, password, accessToken)
- `verification` table — email verification, password reset tokens

**Role model**: Roles are stored as a plain `text` column on the `user` table — not as separate entities. Access control statements are defined at the application level via `createAccessControl`, not at the framework level.

**Intentional design**: The server AuthUnit accepts `access_control` and `roles` in config but does not pass them to `betterAuth()`. These values are used only by the client AuthUnit (passed to `adminClient()` plugin). This is intentional — access control enforcement happens at the application level, not inside better-auth on the server.

**Risk**: Auth domain is tightly coupled to better-auth's type system and plugin API. Migration away would require significant rework.

### 4. Conformist: Logs → pino

**Relationship**: LogUnit conforms to pino's logger API. The internal `logger` field is a pino instance with OpenTelemetry span injection.

**Adaptations**:
- Pino log levels → mapped to framework's `LogLevel` type
- Pino child loggers → wrapped as `ChildLogger` interface
- Log entries are buffered and flushed to Postgres (not just stdout)

### 5. Conformist: PubSub → pg-boss

**Relationship**: PubSubUnit conforms to pg-boss's job queue API.

**Adaptations**:
- pg-boss `publish()` → wrapped with type-safe `Message<T>` generic
- pg-boss `subscribe()` / `unsubscribe()` → exposed as public API
- pg-boss schema → configurable via `PubSubConfig.schema`

**Public API**: `publish`, `publishBatch`, `subscribe`, `unsubscribe`, `getQueueSize`, `purgeQueue`

**Note**: PubSubUnit creates its own pg connection pool (does not reuse DatabaseUnit's pool). This is because pg-boss manages its own connection lifecycle.

### 6. Partner: Storage ↔ S3

**Relationship**: StorageUnit is a partner context with S3-compatible storage. It defines its own interface (`StorageProvider`) that S3 must conform to.

**Adaptations**:
- AWS S3 SDK → wrapped by `S3Adapter` class
- S3 operations → enriched with Postgres metadata tracking
- Signed URLs → delegated to S3 SDK

### 7. Conformist: RPC → oRPC

**Relationship**: RpcUnit conforms to oRPC's router and procedure conventions.

**Adaptations**:
- oRPC `os` base → configured with `RpcContext` (`{ db, pubsub }`)
- Procedures → defined as oRPC handlers with zod validation
- Router → oRPC `Router` type

**Note**: The RPC unit's constructor accepts `{ auth, db, logs, pubsub }` as deps but does not use them. The `RpcContext` is passed at request time via `handle()`, not injected at construction.

### 8. Conformist: KV Store → Postgres

**Relationship**: KV Store adapts Postgres as a key-value store (Redis alternative).

**Adaptations**:
- `UNLOGGED TABLE` → no WAL for performance (cache semantics)
- TTL → `expiresAt` column with lazy eviction on read
- Redis-like API → implemented via SQL operations

**Status**: Core unit, not optional. Required in `FrameworkConfig`.

### 9. Downstream: Recruiter → Framework

**Relationship**: Recruiter app creates the framework via `Framework.create(config, modules)` and passes the `OrganizationModule` as a module.

**Lifecycle**:
```
Framework.create(config, { organization })  // creates units + calls organization.initialize(units)
    → framework.prepare()                   // runs unit.prepare() + module.prepare()
    → framework.run(fn)                     // AsyncLocalStorage context
    → framework.destroy()                   // module.destroy() then unit.destroy()
```

**Adaptations**:
- 11 domain resources mapped to auth statements
- 7 roles defined for recruitment workflow
- Environment variables mapped to framework config

### 10. Downstream: Organization Module → Framework

**Relationship**: Organization module implements the `Module` interface and receives unit dependencies via `initialize(units)`.

**Structure** (`packages/organization/`):
- `OrganizationModule.create()` — factory that returns a Module instance
- `initialize(units)` — extracts `db` and `pubsub` from units, creates 6 workflow instances
- 6 workflows: `OrganizationWorkflow`, `BranchWorkflow`, `AddressWorkflow`, `BankAccountWorkflow`, `ComplianceWorkflow`, `ConnectionWorkflow`
- 8 database tables with Drizzle schema
- Typed domain events published via PubSub
- Valibot validation schemas for all inputs

**Exposed on framework instance**: `framework.organization.addresses`, `framework.organization.branches`, etc.

### 11. Downstream: HR Module → Framework (Stub)

**Relationship**: HR module will implement the `Module` interface and receive unit dependencies.

**Current state**: Skeleton `HrModule` class with empty `initialize()`, `prepare()`, `destroy()`. No schema, no workflows, no types.

### 12. Client Framework

**Exported as**: `@aspen-os/framework/client`

**Relationship**: A separate `Framework` class for browser-side use with 3 units:
- `AuthUnit` — wraps better-auth React client with plugins (admin, emailOTP, username, phoneNumber)
- `LogUnit` — stub (throws on `prepare()`/`destroy()`)
- `RpcUnit` — stub (no-op)

**No database dependency**: Client framework has no `DatabaseUnit`, `PubSubUnit`, `StorageUnit`, or `KvStoreUnit`.

**No `run()` method**: Client framework has no `AsyncLocalStorage` — the `client/context.ts` file is empty.

## Integration Patterns

### Framework.create() (Static Factory)

All units are created and wired inside `Framework.create()`:

```typescript
const framework = Framework.create(
  { auth, db, kvStore, logs, pubsub, rpc, storage },  // FrameworkConfig
  { organization },                                      // modules record
);
```

This:
1. Instantiates all 7 units in dependency order
2. Calls `module.initialize(units)` on each module
3. Returns a proxy-wrapped `FrameworkInstance` that allows `framework.organization` syntax

### AsyncLocalStorage Context

The `run()` method provides request-scoped context:

```typescript
await framework.run(async () => {
  const { db, pubsub } = getContext();
  // db: NodePgDatabase (drizzle instance)
  // pubsub: PubSubUnit (full unit, not just publish)
});
```

### Event-Driven (Active)

Auth and Organization domain events are published via PubSub:

```
AuthWorkflow → pubsub.publish("user:created", { user }) → pg-boss topic
OrganizationWorkflow → pubsub.publish("branch:created", { branch }) → pg-boss topic
```

9 auth events and 19 organization events are defined as type contracts in their respective event maps.

### Schema Management

`DatabaseUnit.prepare()` uses `pushSchema()` from drizzle-kit to automatically apply schema changes:

```
Framework.prepare() → unit.prepare() + module.prepare()
    → DatabaseUnit.prepare() → pushSchema(schemas, db) → apply()
```

Schemas collected: `authSchema`, `logSchema`, `storageSchema`, `kvStoreSchema`, `organizationSchema` (from module's `db_schema`).

## Context Map Table

| Context | Type | Upstream | Downstream | Relationship |
|---|---|---|---|---|
| Shared Kernel | Shared | — | All units/modules | Shared types (Unit, Module) |
| Database | Shared Kernel | — | All units | Foundation |
| Framework | Customer | — | Units, Modules | Creates & wires via `create()` |
| Auth | Conformist | better-auth | Modules | Adapts API |
| Logs | Conformist | pino, OTel | — | Adapts API |
| PubSub | Conformist | pg-boss | — | Adapts API |
| Storage | Partner | S3 (AWS SDK) | — | Defines interface |
| RPC | Conformist | oRPC | — | Adapts API |
| KV Store | Conformist | Postgres | — | Redis-like API (core) |
| Client Framework | — | — | — | Browser-side (3 units) |
| Recruiter | Downstream | Framework | — | Uses framework |
| Organization | Downstream | Framework | — | 6 workflows, 8 tables |
| HR Module | Downstream | Framework | — | Stub |
| Accounting | Downstream | Framework | — | Stub |
| CRM | Downstream | Framework | — | Stub |
| Tasks | Downstream | Framework | — | Stub |

## Language Boundaries

### Framework Kernel Language
- Unit, Module, Framework, Create, Prepare, Destroy, Run, GetUnit, GetModule

### Auth Language
- User, Session, Account, Verification, Role, Permission, Grant, Revoke, Authenticate, Authorize, Statement, Access Control

### Logging Language
- Log Entry, Level, Service, Span, Trace, Buffer, Flush, Drain, Query, Stats

### PubSub Language
- Topic, Publish, Subscribe, Unsubscribe, Message, Handler, Retry, Priority, Queue

### Storage Language
- File, Bucket, Key, Upload, Download, Archive, Signed URL, ETag, Metadata

### RPC Language
- Procedure, Router, Handler, Middleware, Context, Request, Response

### KV Store Language
- Key, Value, TTL, Cache, Evict, Scan, Increment, Decrement

### Organization Language
- Organization, Branch, Connection, Connection Contact, Connection Note, Address, Bank Account, Compliance Document, Workflow

### Recruiter Language
- Prospect, Client, Job Mandate, Draft, Filter View, Reminder, Task, Team Member, Contract
