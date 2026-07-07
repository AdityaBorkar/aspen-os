# Bounded Contexts & Context Map

## Context Map Overview

```
                    ┌─────────────────────────────┐
                    │      SHARED KERNEL           │
                    │  types.ts: Unit, Module,     │
                    │  Result, PaginationParams,   │
                    │  DatabaseConfig, UnitDeps    │
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
│  Storage Unit   │    │  RPC Unit       │    │  Notification   │
│                 │    │                 │    │  Unit (~extra)  │
│  S3-compatible  │    │  oRPC router    │    │                 │
│  interface      │    │  conventions    │    │  multi-provider │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  S3 (external)  │    │  HTTP clients   │    │  Email/SMS/Push │
│  AWS SDK        │    │                 │    │  providers      │
└─────────────────┘    └─────────────────┘    └─────────────────┘

┌─────────────────┐
│  CONFORMIST     │
│  KV Store       │
│  Unit (~extra)  │
│                 │
│  Redis-like API │
│  over Postgres  │
└─────────────────┘

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
```

## Context Relationships

### 1. Shared Kernel

**Shared between**: All units and modules

**Contents** (`packages/framework/src/types.ts`):
- `Unit` interface — `{ name, destroy(), healthCheck() }`
- `Module` interface — same shape
- `UnitDeps` — `{ db, pool, pubsub }`
- `ModuleDeps extends UnitDeps` — adds `auth`, `rpc`
- `DatabaseConfig` — connection parameters
- `Result<T, E>` — success/failure discriminated union
- `PaginationParams` / `PaginatedResult<T>` — pagination contracts

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
    ├── creates LoggingUnit(config, { db })
    ├── creates PubSubUnit(config, { db })
    ├── creates StorageUnit(config, { db })
    ├── creates AuthUnit(config, { db, logs, pubsub })
    └── creates RpcUnit(config, { auth, db, logs, pubsub })
```

**Dependency graph** (constructor injection):
```
DatabaseUnit ← LoggingUnit
DatabaseUnit ← PubSubUnit
DatabaseUnit ← StorageUnit
DatabaseUnit ← AuthUnit
LoggingUnit  ← AuthUnit
PubSubUnit   ← AuthUnit
DatabaseUnit ← RpcUnit
LoggingUnit  ← RpcUnit
PubSubUnit   ← RpcUnit
AuthUnit     ← RpcUnit
```

### 3. Conformist: Auth → better-auth

**Relationship**: AuthUnit conforms to better-auth's API surface. It adapts better-auth's plugin system (access control, admin, custom session, phone number) into Aspen's domain model.

**Adaptations**:
- `createAccessControl` → re-exported from better-auth
- `betterAuth()` → wrapped in AuthUnit constructor
- `drizzleAdapter` → configures better-auth to use framework's drizzle instance
- better-auth's session/user/role APIs → wrapped as `server.workflows`

**Risk**: Auth domain is tightly coupled to better-auth's type system and plugin API. Migration away would require significant rework.

### 4. Conformist: Logs → pino

**Relationship**: LoggingUnit conforms to pino's logger API. The internal `logger` field is a pino instance with OpenTelemetry span injection.

**Adaptations**:
- Pino log levels → mapped to framework's `LogLevel` type
- Pino child loggers → wrapped as `ChildLogger` interface
- Log entries are buffered and flushed to Postgres (not just stdout)

### 5. Conformist: PubSub → pg-boss

**Relationship**: PubSubUnit conforms to pg-boss's job queue API.

**Adaptations**:
- pg-boss `publish()` → wrapped with type-safe `Message<T>` generic
- pg-boss `subscribe()` → internal (not exposed in public API)
- pg-boss schema → configurable via `PubSubConfig.schema`

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

### 9. Downstream: Recruiter → Framework

**Relationship**: Recruiter app conforms to framework's API surface. It:
- Creates `Framework` with full config
- Calls `framework.initialize()`
- Accesses units via `framework.getUnit()`
- Defines its own RBAC model (access_control + roles) using framework's auth primitives

**Adaptations**:
- 12 domain resources mapped to auth statements
- 7 roles defined for recruitment workflow
- Environment variables mapped to framework config

### 10. Downstream: HR Module → Framework (Planned)

**Relationship**: HR module will implement the `Module` interface and receive `ModuleDeps` (`{ db, pool, pubsub, auth, rpc }`).

**Planned structure** (from `packages/hr/src/`):
- `index.ts` — module entry
- `types.ts` — HR-specific types
- `register.ts` — registration with framework
- `event-map.ts` — HR domain events
- `subscriptions.ts` — event handlers
- `handlers/` — request handlers
- `workflows/` — business logic
- `schema-db/` — database schemas
- `schema-forms/` — form definitions
- `notifications/` — notification templates

## Integration Patterns

### Dependency Injection (Constructor)

All units receive their dependencies via constructor parameters:

```typescript
// Framework wires this in initialize():
const db = new DatabaseUnit(config.db);
const logs = new LoggingUnit(config.logs, { db });
const auth = new AuthUnit(config.auth, { db, logs, pubsub });
```

### AsyncLocalStorage Context

The `run()` method provides request-scoped context:

```typescript
await framework.run(async () => {
  const { db, pubsub } = getContext();
  // db and pubsub available without explicit passing
});
```

### Event-Driven (Planned)

Domain events defined in `event-map.ts` files but not yet published via PubSub:

```
Unit/Module → publish(event) → PubSubTopic → Subscribers
```

### Schema Collection

`getSchemas(framework)` merges all unit schemas for migration generation:

```
Core schemas (auth, logs, storage, notification, kv-store)
    +
Unit schemas (from unit.db_schema)
    =
Complete schema for drizzle migrations
```

## Context Map Table

| Context | Type | Upstream | Downstream | Relationship |
|---|---|---|---|---|
| Shared Kernel | Shared | — | All units/modules | Shared types |
| Database | Shared Kernel | — | All units | Foundation |
| Framework | Customer | — | Units, Modules | Creates & wires |
| Auth | Conformist | better-auth | Modules | Adapts API |
| Logs | Conformist | pino, OTel | — | Adapts API |
| PubSub | Conformist | pg-boss | — | Adapts API |
| Storage | Partner | S3 (AWS SDK) | — | Defines interface |
| RPC | Conformist | oRPC | — | Adapts API |
| Notification | Conformist | Providers | — | Multi-provider |
| KV Store | Conformist | Postgres | — | Redis-like API |
| Sync | — | — | — | Stub |
| Recruiter | Downstream | Framework | — | Uses framework |
| HR Module | Downstream | Framework | — | Planned |
| Analytics | Downstream | Framework | — | Empty |
| Banking | Downstream | Framework | — | Empty |
| Reports | Downstream | Framework | — | Empty |

## Language Boundaries

### Framework Kernel Language
- Unit, Module, Framework, Initialize, Destroy, HealthCheck, Register, Context, Run

### Auth Language
- User, Session, Role, Permission, Grant, Revoke, Authenticate, Authorize, Statement, Access Control

### Logging Language
- Log Entry, Level, Service, Span, Trace, Buffer, Flush, Drain, Query, Stats

### PubSub Language
- Topic, Publish, Subscribe, Message, Handler, Retry, Priority, Queue

### Storage Language
- File, Bucket, Key, Upload, Download, Archive, Signed URL, ETag, Metadata

### RPC Language
- Procedure, Router, Handler, Middleware, Context, Request, Response

### Notification Language
- Notification, Channel, Provider, Delivery, Status, Payload, Template

### KV Store Language
- Key, Value, TTL, Cache, Evict, Scan, Increment, Decrement

### Recruiter Language
- Prospect, Client, Job Mandate, Draft, Filter View, Reminder, Task, Team Member, Contract
