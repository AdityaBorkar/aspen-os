# Aspen OS

Aspen OS is a business application framework built on Bun/TypeScript. The framework kernel provides composable infrastructure (database, auth, logging, pub/sub, RPC, storage, KV store) so domain-specific modules can be built on top without reinventing plumbing. The first concrete application is **Recruiter** — a recruitment management system.

## Language

### Framework Kernel

**Framework**:
The orchestrator class. Owns all Units, wires their dependencies, and manages lifecycle (`initialize` → `prepare` → `run` → `destroy`).
_Avoid_: App, Container, DI Container

**Unit**:
An infrastructure building block with a name, a `destroy()` method, and an optional `prepare()` method. Seven core units: `db`, `auth`, `logs`, `pubsub`, `rpc`, `storage`, `kvStore`.
_Avoid_: Service, Provider

**Module**:
A business logic plugin registered before `initialize()`. Receives unit dependencies. Same interface shape as Unit (`name`, `destroy()`).
_Avoid_: Plugin, Extension

**Register**:
Adding a Module to the Framework before initialization. Singular — one module at a time.
_Avoid_: Mount, Attach

**Initialize**:
Creating and wiring all Units from config. Must happen after all `registerModule()` calls.
_Avoid_: Boot, Start

**Prepare**:
Running post-initialization setup on all Units (e.g., schema migrations via `pushSchema`). Called after `initialize()`.
_Avoid_: Migrate, Setup

**Run**:
Executing a function within `AsyncLocalStorage` context that provides `db` (drizzle instance) and `pubsub` (narrow publish interface).
_Avoid_: Execute, Dispatch

**Destroy**:
Graceful shutdown of all Modules, then all Units. Clears internal state.
_Avoid_: Shutdown, Cleanup

**GetUnit**:
Typed accessor to retrieve a Unit by name after initialization. Requires a name — no zero-arg overload.
_Avoid_: Resolve, Get

**GetModule**:
Typed accessor to retrieve a Module by name. Supports zero-arg to return the full module map.
_Avoid_: Resolve, Get

### Database

**DatabaseUnit**:
Core unit owning a `pg.Pool` and drizzle `NodePgDatabase`. Exposes `prepare()` which runs `pushSchema()` from drizzle-kit to apply schema migrations.
_Avoid_: DbUnit, ConnectionPool

**DatabaseConfig**:
Connection parameters: `host`, `port`, `user`, `password`, `database`, `ssl?`, `maxConnections?`.

### Authentication

**AuthUnit**:
Core unit wrapping better-auth. Exposes a React client, an HTTP handler, and programmatic workflows for user, session, and role management.
_Avoid_: Auth, AuthProvider

**User**:
An authenticated identity with `id`, `email`, `name`, optional `phoneNumber`, `image`, `role` (text field), and metadata. Passwords are stored in the separate `account` table, not on the user record.
_Avoid_: Account, Profile

**Session**:
A time-bounded authentication token tied to a User. Has `id`, `token`, `userId`, `expiresAt`. Cascades delete from User.
_Avoid_: Token, Login

**Account**:
A credential record linking a User to an authentication provider (email/password, OAuth, etc.). Stores `password`, `accessToken`, `refreshToken`, and provider metadata. Not the same as User.
_Avoid_: Credential, AuthMethod

**Role**:
A plain text field on the User table. In the Recruiter app, values are `admin`, `bd`, `caller`, `qc`, `rm`, `sc`, `tl`. Not a separate entity — no dedicated role table exists.
_Avoid_: Permission Group, Access Level

**Access Control**:
A declarative statement matrix defining `{ resource: [actions...] }`. Created via `createAccessControl` (from better-auth). Roles are created via `ac.newRole()`. Defined at the application level, not the framework level.
_Avoid_: Permission Matrix, ACL

**Auth Event**:
A typed domain event published via PubSub when auth state changes. Events: `user:created`, `user:updated`, `user:deleted`, `session:created`, `session:invalidated`, `role:assigned`, `role:unassigned`, `role:deleted`.
_Avoid_: Auth Signal, Auth Hook

### Logging

**LogUnit**:
Core unit providing pino-based structured logging with buffered writes to a Postgres `logs` table. Integrates OpenTelemetry span context.
_Avoid_: Logger, LoggingService

**LogEntry**:
An append-only record: `id`, `level`, `message`, `service`, `timestamp`, `metadata`, `error`, `traceId`, `spanId`, `userId`, `requestId`, `duration`.
_Avoid_: Log Record, Log Line

**LogLevel**:
Severity enum: `debug`, `info`, `warn`, `error`, `fatal`.
_Avoid_: Severity, Priority

### Pub/Sub

**PubSubUnit**:
Core unit backed by pg-boss. Provides topic-based publish/subscribe over Postgres job queue. Exposes `publish`, `publishBatch`, `subscribe`, `unsubscribe`, `getQueueSize`, `purgeQueue`.
_Avoid_: EventBus, MessageBroker

**Topic**:
A named message channel. Messages are published to topics and consumed by subscribers.
_Avoid_: Queue, Channel, Subject

**Message**:
A typed payload with `id`, `name`, `data`, `createdOn`. Generic over `T`.
_Avoid_: Event, Payload

**PublishOptions**:
Retry and delivery configuration: `retryLimit`, `retryDelay`, `retryBackoff`, `priority`, `expireInMinutes`, `startAfter`.
_Avoid_: DeliveryConfig, SendOptions

### File Storage

**StorageUnit**:
Core unit providing S3-compatible object storage with Postgres metadata tracking.
_Avoid_: FileUnit, ObjectStore

**FileMetadata**:
A Postgres record tracking S3 objects: `id`, `key`, `bucket`, `contentType`, `size`, `etag`, `metadata`, `archived`, `archivedKey`, `createdAt`, `updatedAt`.
_Avoid_: FileRecord, FileInfo

**Key**:
A unique S3 object identifier stored in `file_metadata.key`.
_Avoid_: Path, Filename

**Archive**:
Soft-delete that moves a file to a new key and marks the original as archived.
_Avoid_: SoftDelete, Trash

**Signed URL**:
A time-limited presigned URL for direct S3 upload or download.
_Avoid_: PresignedLink, TempUrl

### RPC

**RpcUnit**:
Core unit providing a type-safe API layer via oRPC. Exposes a router with middleware support.
_Avoid_: ApiUnit, EndpointUnit

**Procedure**:
A named RPC handler with typed input/output. Built-in: `echo`, `health.check`.
_Avoid_: Endpoint, Action

**RpcContext**:
Request context passed to procedures: `{ db, pubsub }`.
_Avoid_: RequestContext, HandlerContext

### KV Store

**KvStoreUnit**:
Core unit providing a Redis-like key-value API over a Postgres `UNLOGGED TABLE` with TTL support.
_Avoid_: CacheUnit, RedisUnit

**KVEntry**:
A key-value pair: `key` (PK), `value` (text, JSON-serialized), `expiresAt` (nullable TTL), `updatedAt`.
_Avoid_: CacheEntry, KVPair

**TTL**:
Time-to-live on a KV entry. Expired entries are lazily evicted on read, not by a background job.
_Avoid_: Expiration, TTL

### Recruiter Domain

**Prospect**:
A candidate being tracked through the recruitment pipeline.

**Client**:
An organization engaging the recruiter for hiring.

**Job Mandate**:
A specific hiring requirement from a Client.

**Draft**:
A preliminary version of a submission or document.

**Filter View**:
A saved search/filter configuration.

**Reminder**:
A time-bound follow-up task.

**Task**:
A unit of work assigned to a team member.

**Team Member**:
An internal user within the recruiting organization.

**Contract**:
A formal agreement between the recruiter and a Client.

## Context Relationships

```
┌──────────────────┐    ┌─────────────────────────────────────┐
│    Recruiter     │───→│          Framework Kernel            │
│    (app)         │    │  7 core units: db, auth, logs,      │
└──────────────────┘    │  pubsub, rpc, storage, kvStore      │
                        └──────────┬──────────────────────────┘
                                   │ wires
                    ┌──────────────┼──────────────┬──────────────┐
                    ▼              ▼              ▼              ▼
                 Database       AuthUnit       LogUnit      PubSubUnit
                    │              │              │              │
                    │              │ uses         │ uses         │ uses
                    │              ▼              ▼              ▼
                    │         better-auth      pino         pg-boss
                    │
                    ├──────────────────────────────────────────────┐
                    ▼              ▼              ▼              ▼
              StorageUnit     KvStoreUnit     RpcUnit
                    │              │              │
                    ▼              │              ▼
                 S3 SDK           │           oRPC
                                  │
                              Postgres
                             (UNLOGGED)
```

## Known Gaps

1. **Module initialization is commented out** — `initialize()` stores modules but does not call their lifecycle hooks. The commented code passes `this.units` but `Module` has no `initialize()` method.
2. **No `healthCheck()` on Unit** — docs claim it exists, code has only `name` and `destroy()`.
3. **`getModule()` error messages say "Unit"** — code bug at `server/index.ts:114-116`.
4. **`RoleUnassignedEvent` missing `roleName`** — unlike `RoleAssignedEvent` which has `{ roleName, userId }`, the unassigned event only has `{ userId }`.
5. **Client-side framework undocumented** — `src/client/` has its own `Framework` class with `AuthUnit`, `LogUnit`, `RpcUnit`. Exported as `./client` subpath.
6. **`prepare()` lifecycle undocumented** — critical step that runs schema migrations.
7. **`Result<T,E>` and `PaginatedResult<T>` don't exist** — referenced in docs but not in code.
8. **No barrel files** — explicit convention, not enforced by tooling.

## Anti-Patterns

- Don't register modules after `initialize()` — throws error
- Don't use native UUID columns — always text with `gen_random_uuid()::text` or app-generated UUIDs
- Don't use `timestamp without time zone` — always `withTimezone: true`
- Don't create barrel files unless explicitly told
