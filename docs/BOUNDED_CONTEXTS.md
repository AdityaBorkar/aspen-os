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
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐        │
│  │ Recruiter App │  │ HR Module     │  │ Analytics     │        │
│  │               │  │ (stub)        │  │ (empty)       │        │
│  │ conforms to   │  │               │  │               │        │
│  │ framework     │  │ will conform  │  │ will conform  │        │
│  │ API surface   │  │ to Module     │  │ to Module     │        │
│  └───────────────┘  │ interface     │  │ interface     │        │
│                     └───────────────┘  └───────────────┘        │
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
- `Unit` interface — `{ name: string, destroy(): Promise<void> }`
- `Module` interface — same shape as Unit

**Note**: `DatabaseConfig`, `AuthConfig`, `LogConfig`, etc. live in their respective unit directories, not in the shared kernel. The shared kernel is intentionally minimal.

**Rules**:
- Changes to the shared kernel require coordinated updates across all units
- The shared kernel should remain minimal — only truly universal types
- No implementation details leak through the shared kernel

### 2. Customer-Supplier: Framework → Units

**Direction**: Framework creates and wires units; units have no knowledge of Framework.

```
Framework (supplier)
    │
    ├── creates DatabaseUnit(config)
    ├── creates LogUnit(config, { db })
    ├── creates PubSubUnit(config, { db })
    ├── creates StorageUnit(config, { db })
    ├── creates AuthUnit(config, { db, logs, pubsub })
    ├── creates RpcUnit(config, { auth, db, logs, pubsub })
    └── creates KvStoreUnit(config, { db })
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

### 8. Conformist: KV Store → Postgres

**Relationship**: KV Store adapts Postgres as a key-value store (Redis alternative).

**Adaptations**:
- `UNLOGGED TABLE` → no WAL for performance (cache semantics)
- TTL → `expiresAt` column with lazy eviction on read
- Redis-like API → implemented via SQL operations

**Status**: Core unit, not optional. Required in `FrameworkConfig`.

### 9. Downstream: Recruiter → Framework

**Relationship**: Recruiter app conforms to framework's API surface. It:
- Creates `Framework` with full config (all 7 units)
- Calls `framework.initialize()` then `framework.prepare()`
- Accesses units via `framework.getUnit()`
- Defines its own RBAC model (access_control + roles) using framework's auth primitives

**Adaptations**:
- 12 domain resources mapped to auth statements
- 7 roles defined for recruitment workflow
- Environment variables mapped to framework config

### 10. Downstream: HR Module → Framework (Planned)

**Relationship**: HR module will implement the `Module` interface and receive unit dependencies.

**Planned structure** (from `packages/hr/`):
- Module entry, HR-specific types
- Registration with framework
- HR domain events
- Event handlers, request handlers, business logic
- Database schemas, form definitions, notification templates

### 11. Client Framework

**Exported as**: `@aspen-os/framework/client`

**Relationship**: A separate `Framework` class for browser-side use with 3 units:
- `AuthUnit` — wraps better-auth React client with plugins (admin, emailOTP, username, phoneNumber)
- `LogUnit` — stub (throws on `prepare()`/`destroy()`)
- `RpcUnit` — stub (no-op)

**No database dependency**: Client framework has no `DatabaseUnit`, `PubSubUnit`, `StorageUnit`, or `KvStoreUnit`.

## Integration Patterns

### Dependency Injection (Constructor)

All units receive their dependencies via constructor parameters:

```typescript
// Framework wires this in initialize():
const db = new DatabaseUnit(config.db);
const logs = new LogUnit(config.logs, { db });
const pubsub = new PubSubUnit(config.pubsub, { db });
const storage = new StorageUnit(config.storage, { db });
const auth = new AuthUnit(config.auth, { db, logs, pubsub });
const rpc = new RpcUnit(config.rpc, { auth, db, logs, pubsub });
const kvStore = new KvStoreUnit(config.kvStore, { db });
```

### AsyncLocalStorage Context

The `run()` method provides request-scoped context:

```typescript
await framework.run(async () => {
  const { db, pubsub } = getContext();
  // db: NodePgDatabase (drizzle instance)
  // pubsub: { publish<T>(topic, data): Promise<string> } (narrow interface)
});
```

### Event-Driven (Active)

Auth domain events are published via PubSub:

```
AuthWorkflow → pubsub.publish("user:created", { user }) → pg-boss topic
```

All 8 auth events are wired: `user:created`, `user:updated`, `user:deleted`, `session:created`, `session:invalidated`, `role:assigned`, `role:unassigned`, `role:deleted`.

### Schema Management

`DatabaseUnit.prepare()` uses `pushSchema()` from drizzle-kit to automatically apply schema changes:

```
Framework.prepare() → unit.prepare() for each unit
    → DatabaseUnit.prepare() → pushSchema(schemas, db) → apply()
```

Schemas collected: `authSchema`, `logSchema`, `storageSchema`, `kvStoreSchema`.

## Context Map Table

| Context | Type | Upstream | Downstream | Relationship |
|---|---|---|---|---|
| Shared Kernel | Shared | — | All units/modules | Shared types (Unit, Module) |
| Database | Shared Kernel | — | All units | Foundation |
| Framework | Customer | — | Units, Modules | Creates & wires |
| Auth | Conformist | better-auth | Modules | Adapts API |
| Logs | Conformist | pino, OTel | — | Adapts API |
| PubSub | Conformist | pg-boss | — | Adapts API |
| Storage | Partner | S3 (AWS SDK) | — | Defines interface |
| RPC | Conformist | oRPC | — | Adapts API |
| KV Store | Conformist | Postgres | — | Redis-like API (core) |
| Client Framework | — | — | — | Browser-side (3 units) |
| Recruiter | Downstream | Framework | — | Uses framework |
| HR Module | Downstream | Framework | — | Planned |
| Analytics | Downstream | Framework | — | Empty |
| Banking | Downstream | Framework | — | Empty |
| Reports | Downstream | Framework | — | Empty |

## Language Boundaries

### Framework Kernel Language
- Unit, Module, Framework, Initialize, Prepare, Destroy, Register, Context, Run, GetUnit, GetModule

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

### Recruiter Language
- Prospect, Client, Job Mandate, Draft, Filter View, Reminder, Task, Team Member, Contract
