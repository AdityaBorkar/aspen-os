# Aspen OS

Aspen OS is a business application framework built on Bun/TypeScript. The framework kernel provides composable infrastructure (database, auth, logging, pub/sub, RPC, storage, KV store) so domain-specific modules can be built on top without reinventing plumbing. The first concrete application is **Recruiter** — a recruitment management system.

## Language

### Framework Kernel

**Framework**:
The orchestrator class. Created via the static `Framework.create(config, modules)` factory, which instantiates all Units, calls `module.initialize(units)` on each module, and returns a proxy-wrapped instance. Lifecycle: `create()` → `prepare()` → `run()` → `destroy()`.
_Avoid_: App, Container, DI Container

**Unit**:
An infrastructure building block with a `name`, a `destroy()` method, and an optional `prepare()` method. Seven core units: `db`, `auth`, `logs`, `pubsub`, `rpc`, `storage`, `kvStore`.
_Avoid_: Service, Provider

**Module**:
A business logic plugin passed to `Framework.create()`. Receives unit dependencies via `initialize(units)`. Same interface shape as Unit (`name`, `destroy()`, optional `prepare()`). Accessed on the framework instance via proxy — e.g., `framework.organization`.
_Avoid_: Plugin, Extension

**Create**:
The static factory `Framework.create(config, modules)`. Instantiates all Units from config, calls `module.initialize(units)` on each module, and returns a proxy-wrapped `FrameworkInstance`. This is the only way to construct a Framework — the constructor is internal.
_Avoid_: Register, Mount, Attach

**Prepare**:
Running post-creation setup on all Units and Modules (e.g., schema migrations via `pushSchema`). Called after `create()`.
_Avoid_: Migrate, Setup

**Run**:
Executing a function within `AsyncLocalStorage` context that provides `db` (drizzle instance) and `pubsub` (the full PubSubUnit).
_Avoid_: Execute, Dispatch

**Destroy**:
Graceful shutdown of all Modules, then all Units. Clears internal state.
_Avoid_: Shutdown, Cleanup

**GetUnit**:
Typed accessor to retrieve a Unit by name after creation. Requires a name — no zero-arg overload.
_Avoid_: Resolve, Get

**GetModule**:
Typed accessor to retrieve a Module by name. Requires a name — throws if not found. No zero-arg overload.
_Avoid_: Resolve, Get

### Database

**DatabaseUnit**:
Core unit owning a `pg.Pool` and drizzle `NodePgDatabase`. Exposes `prepare()` which runs `pushSchema()` from drizzle-kit to apply schema migrations.
_Avoid_: DbUnit, ConnectionPool

**DatabaseConfig**:
Connection parameters: `host`, `port`, `user`, `password`, `database`, `ssl?`, `maxConnections?`.

### Authentication

**AuthUnit**:
Core unit wrapping better-auth. Exposes a React client, an HTTP handler, and programmatic workflows for user, session, and role management. On the server side, `access_control` and `roles` from config are intentionally not passed to better-auth — they are used only by the client AuthUnit.
_Avoid_: Auth, AuthProvider

**User**:
An authenticated identity with `id`, `email`, `name`, optional `phoneNumber`, `image`, `role` (text field), and metadata. Passwords are stored in the separate `account` table, not on the user record.
_Avoid_: Account, Profile

**Session**:
A time-bounded authentication token tied to a User. Has `id`, `token`, `userId`, `expiresAt`. Cascades delete from User. Expiry is hardcoded at 7 days in the session workflow.
_Avoid_: Token, Login

**Account**:
A credential record linking a User to an authentication provider (email/password, OAuth, etc.). Stores `password`, `accessToken`, `refreshToken`, and provider metadata. Not the same as User.
_Avoid_: Credential, AuthMethod

**Role**:
A plain text field on the User table. In the Recruiter app, values are `admin`, `bd`, `caller`, `qc`, `rm`, `sc`, `tl`. Not a separate entity — no dedicated role table exists.
_Avoid_: Permission Group, Access Level

**Access Control**:
A declarative statement matrix defining `{ resource: [actions...] }`. Created via `createAccessControl` (from better-auth). Roles are created via `ac.newRole()`. Defined at the application level and passed to the client AuthUnit for admin plugin configuration. On the server side, these values are accepted in config but intentionally not forwarded to better-auth.
_Avoid_: Permission Matrix, ACL

**Auth Event**:
A typed domain event contract defined in `AuthEventMap`. Events: `user:created`, `user:updated`, `user:deleted`, `session:created`, `session:invalidated`, `role:assigned`, `role:created`, `role:unassigned`, `role:deleted`. Published via PubSub as plain string topics — the event map is a type-level contract, not a runtime bus.
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

### Organization Domain

**Organization**:
A business entity with `name`, `slug` (unique), `status` (active/suspended/archived), contact info, branding (logo, accent color), and locale settings. The root entity of the organization context.
_Avoid_: Company, Tenant

**Branch**:
A physical or logical location belonging to an Organization. Has `name`, `code` (unique), `type` (headquarters/office/warehouse/store/factory/remote/other), and supports hierarchical nesting up to 5 levels deep. Exactly one headquarters branch per organization.
_Avoid_: Location, Site, Office

**Connection**:
An external business relationship — a client, vendor, partner, or other entity the Organization interacts with. Has `name`, `type` (client/vendor/partner/subsidiary/etc.), `status` (active/inactive/prospect/former), and supports contacts and notes.
_Avoid_: Contact, Relationship, Entity

**Connection Contact**:
A person associated with a Connection. Has `name`, `email`, `phone`, `title`, and a `isPrimary` flag.
_Avoid_: Contact Person, Representative

**Connection Note**:
An interaction log entry on a Connection. Has `type` (general/call/email/meeting/contract_renewal/issue) and `content`.
_Avoid_: Activity, Log Entry

**Address**:
A postal address with `line1`, `line2`, `city`, `state`, `postalCode`, `country`, optional `label` and `isPrimary` flag. Reusable across entities.
_Avoid_: Location, Street Address

**Bank Account**:
A financial account record with `accountHolderName`, `accountNumber`, `bankName`, `routingNumber`, `swiftCode`, `currency`, and `isPrimary` flag.
_Avoid_: Payment Method, Financial Account

**Compliance Document**:
A regulatory or legal document tracked by the Organization. Has `name`, `category` (tax/license/certificate/permit/insurance/etc.), `status` (active/expiring_soon/expired/etc.), `expiryDate`, and optional `renewalFrequency`. Supports renewal chains (archived old + created new).
_Avoid_: Certificate, Permit, Regulatory Record

**Workflow**:
A domain operation class within the Organization module. Six workflows: `OrganizationWorkflow`, `BranchWorkflow`, `AddressWorkflow`, `BankAccountWorkflow`, `ComplianceWorkflow`, `ConnectionWorkflow`. Each receives `db` (and optionally `pubsub`) via `initialize()`.
_Avoid_: Service, Handler

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
         │              └──────────┬──────────────────────────┘
         │                         │ wires
         │              ┌──────────┼──────────┬──────────────┐
         │              ▼          ▼          ▼              ▼
         │           Database   AuthUnit   LogUnit      PubSubUnit
         │              │          │          │              │
         │              │          │ uses     │ uses         │ uses
         │              │          ▼          ▼              ▼
         │              │     better-auth   pino         pg-boss
         │              │
         │              ├──────────────────────────────────────┐
         │              ▼          ▼              ▼            ▼
         │        StorageUnit  KvStoreUnit     RpcUnit
         │              │          │              │
         │              ▼          │              ▼
         │           S3 SDK       │           oRPC
         │                         │
         │                     Postgres
         │                    (UNLOGGED)
         │
         │ registers
         ▼
┌──────────────────────┐
│  OrganizationModule  │
│  (domain module)     │
│  6 workflows:        │
│  - organization      │
│  - branch            │
│  - address           │
│  - bank-account      │
│  - compliance        │
│  - connection        │
└──────────────────────┘
```

## Known Gaps

1. **`RoleUnassignedEvent` missing `roleName`** — unlike `RoleAssignedEvent` which has `{ roleName, userId }`, the unassigned event only has `{ userId }`.
2. **`DatabaseUnit.name` is `"database"` but the framework key is `"db"`** — inconsistency between the unit's internal name and the key used in `FrameworkUnits`.
3. **`AuthUnit` discards `access_control` and `roles` on server side** — these config values are destructured out and never passed to `betterAuth()`. Used only by the client AuthUnit. Intentional.
4. **Session expiry hardcoded at 7 days** — `AuthConfig.session.expiresIn` is accepted but not read by the session workflow. The 7-day value is hardcoded in `session.ts`.
5. **PubSub boss.start() not awaited** — the constructor calls `this.boss.start()` without `await`, which could cause race conditions if `publish`/`subscribe` are called before the connection is established.
6. **Client LogUnit.prepare() and destroy() throw** — the client LogUnit is a stub that throws on lifecycle methods.
7. **`client/context.ts` is empty** — the client framework has no `run()` method or `AsyncLocalStorage`.
8. **`increment()`/`decrement()` on KvStoreUnit are not atomic** — read-modify-write, not database-level atomic ops.

## Anti-Patterns

- Don't register modules after `create()` — pass them to `Framework.create()` as the second arg
- Don't use native UUID columns — always text with `gen_random_uuid()::text` or app-generated UUIDs
- Don't use `timestamp without time zone` — always `withTimezone: true`
- Don't create barrel files unless explicitly told
