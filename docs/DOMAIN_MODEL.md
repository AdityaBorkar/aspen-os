# Domain Model

## Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AUTH DOMAIN                                  │
│                                                                     │
│  ┌──────────┐       ┌──────────────┐       ┌──────────────────┐    │
│  │   User    │──1:N──│   Session    │       │   Account        │    │
│  │          │       │              │       │                  │    │
│  │ id       │       │ id           │       │ id               │    │
│  │ email    │       │ token        │       │ userId (FK)      │    │
│  │ name     │       │ userId (FK)  │       │ providerId       │    │
│  │ role     │  ┌───→│ expiresAt    │       │ accountId        │    │
│  │ username │  │    │ createdAt    │       │ password         │    │
│  │ phoneNum │  │    └──────────────┘       │ accessToken      │    │
│  │ banned   │──┘                           │ refreshToken     │    │
│  │ image    │──1:N────────────────────────→│ idToken          │    │
│  │ createdAt│                               └──────────────────┘    │
│  │ updatedAt│                                                       │
│  └──────────┘                                                       │
│                                                                     │
│  ┌────────────────┐                                                  │
│  │  Verification   │                                                  │
│  │                 │                                                  │
│  │ id              │                                                  │
│  │ identifier      │                                                  │
│  │ value           │                                                  │
│  │ expiresAt       │                                                  │
│  └─────────────────┘                                                  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       STORAGE DOMAIN                                │
│                                                                     │
│  ┌────────────────┐                                                  │
│  │  FileMetadata   │                                                  │
│  │                 │                                                  │
│  │ id              │                                                  │
│  │ key (unique)    │                                                  │
│  │ bucket          │                                                  │
│  │ contentType     │                                                  │
│  │ size            │                                                  │
│  │ etag            │                                                  │
│  │ metadata (json) │                                                  │
│  │ archived        │                                                  │
│  │ archivedKey     │                                                  │
│  │ createdAt       │                                                  │
│  │ updatedAt       │                                                  │
│  └─────────────────┘                                                  │
│       │                                                              │
│       │ maps to                                                      │
│       ▼                                                              │
│  ┌─────────────────┐                                                  │
│  │  S3 Object       │  (external: S3-compatible storage)              │
│  │  key, body, etc  │                                                  │
│  └─────────────────┘                                                  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        LOGS DOMAIN                                  │
│                                                                     │
│  ┌─────────────────┐                                                  │
│  │    LogEntry      │                                                  │
│  │                  │                                                  │
│  │ id               │                                                  │
│  │ level            │  debug | info | warn | error | fatal            │
│  │ message          │                                                  │
│  │ service          │                                                  │
│  │ timestamp        │                                                  │
│  │ metadata (json)  │                                                  │
│  │ error {name,msg} │                                                  │
│  │ traceId          │  ← OpenTelemetry                                │
│  │ spanId           │  ← OpenTelemetry                                │
│  │ userId           │                                                  │
│  │ requestId        │                                                  │
│  │ duration         │                                                  │
│  └─────────────────┘                                                  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       KV-STORE DOMAIN                                │
│                                                                     │
│  ┌─────────────────┐                                                  │
│  │    KVEntry       │                                                  │
│  │                  │                                                  │
│  │ key (PK)         │                                                  │
│  │ value            │  (text, JSON-serialized)                        │
│  │ expiresAt        │  (nullable TTL)                                 │
│  │ updatedAt        │                                                  │
│  └─────────────────┘                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

## Aggregates

### User (Aggregate Root)

**Identity**: `id` (text, generated via `crypto.randomUUID()`)

**Invariants**:
- Email must be unique
- Phone number, if present, must be unique
- Username, if present, must be unique

**Lifecycle commands**:
- `create(email, password, name?, metadata?)` → User
- `update(id, { name?, metadata? })` → User
- `delete(id)` → void (cascades to sessions, accounts)

**Relationships**:
- Has many `Session` (1:N, cascade delete)
- Has many `Account` (1:N, cascade delete)
- Has one `role` (text field on user table — not a separate entity)

### Account (Entity)

**Identity**: `id` (text, generated via `crypto.randomUUID()`)

**Value objects**:
- `Password` — text, hashed (stored on account, not user)
- `ProviderId` — text, identifies the auth provider (e.g., "credential")

**Invariants**:
- Belongs to exactly one User via `userId` FK
- Password is stored here, not on the User table
- Multiple accounts per user possible (OAuth providers)

**Relationships**:
- Belongs to `User` (N:1, cascade delete)

### Session (Aggregate Root)

**Identity**: `id` (text, generated via `crypto.randomUUID()`)

**Value objects**:
- `Token` — text, unique session identifier

**Invariants**:
- Token must be unique
- Has expiration (`expiresAt`)
- Cascades delete from User

**Lifecycle commands**:
- `create(email, password)` → `{ user, session }`
- `validate(token)` → `{ user, session } | null`
- `invalidate(id)` → void

### Verification (Entity)

**Identity**: `id` (text, generated via `crypto.randomUUID()`)

**Invariants**:
- Has expiration (`expiresAt`)
- Used for email verification, password reset, etc.

### FileMetadata (Aggregate Root)

**Identity**: `id` (text, UUID, default `gen_random_uuid()::text`)

**Value objects**:
- `FileKey` — text, unique S3 object key
- `FileSize` — bigint (bytes)
- `FileMetadata` — `Record<string, string>` (jsonb)

**Invariants**:
- Key must be unique
- `archived` boolean controls soft-delete
- `archivedKey` set when archived (new S3 location)

**Lifecycle commands**:
- `upload(key, body, contentType?, metadata?)` → FileObject
- `delete(key)` → void
- `archive(key)` → void (moves to archive bucket/prefix)
- `getSignedUrl(key, options?)` → string

### LogEntry (Entity — append-only)

**Identity**: `id` (text, UUID, default `gen_random_uuid()::text`)

**Value objects**:
- `LogLevel` — `"debug" | "info" | "warn" | "error" | "fatal"`
- `ErrorInfo` — `{ name, message, stack? }`

**Invariants**:
- Append-only (no updates/deletes from application)
- Level priority: debug(0) < info(1) < warn(2) < error(3) < fatal(4)

### KVEntry (Entity)

**Identity**: `key` (text, PK)

**Value objects**:
- `TTL` — expiration timestamp (nullable)

**Invariants**:
- Expired entries are lazily evicted on read
- Table is `UNLOGGED` (no WAL — performance over durability)

## Value Objects (Shared)

| Value Object | Type | Usage |
|---|---|---|
| `DatabaseConfig` | `{ host, port, user, password, database, ssl?, maxConnections? }` | DB connection (in `server/db/types.ts`) |
| `StorageProvider` | `{ type: "s3", endpoint, region, credentials, forcePathStyle }` | S3 config |

## Domain Events

### Defined (AuthEventMap)

| Event | Payload | Trigger |
|---|---|---|
| `user:created` | `{ user: User }` | User created |
| `user:updated` | `{ user: User }` | User updated |
| `user:deleted` | `{ userId: string }` | User deleted |
| `session:created` | `{ session, user }` | Session authenticated |
| `session:invalidated` | `{ sessionId }` | Session invalidated |
| `role:assigned` | `{ roleName, userId }` | Role assigned to user |
| `role:unassigned` | `{ userId }` | Role unassigned (note: missing `roleName` — known gap) |
| `role:deleted` | `{ roleName }` | Role deleted |

### Known Gap

- `RoleUnassignedEvent` is missing `roleName` — inconsistent with `RoleAssignedEvent` which has both `roleName` and `userId`.

### Not Yet Defined (Gaps)

- File events: `file:uploaded`, `file:deleted`, `file:archived`
- Log events: `log:error-threshold-exceeded`
- KV events: (none expected — cache operations are internal)

## Command-Query Separation

### Commands (Write Side)

| Context | Command | Method |
|---|---|---|
| Auth | Create user | `auth.server.workflows.user.create()` |
| Auth | Delete user | `auth.server.workflows.user.delete()` |
| Auth | Update user | `auth.server.workflows.user.update()` |
| Auth | Assign role | `auth.server.workflows.user.role.assign()` |
| Auth | Unassign role | `auth.server.workflows.user.role.unassign()` |
| Auth | Create session | `auth.server.workflows.session.create()` |
| Auth | Invalidate session | `auth.server.workflows.session.invalidate()` |
| Auth | Delete role | `auth.server.workflows.role.delete()` |
| Storage | Upload file | `storage.upload()` |
| Storage | Delete file | `storage.delete()` |
| Storage | Archive file | `storage.archive()` |
| PubSub | Publish message | `pubsub.publish()` |
| PubSub | Subscribe | `pubsub.subscribe()` |
| KV | Set key | `kv.set()` |
| KV | Delete key | `kv.del()` |

### Queries (Read Side)

| Context | Query | Method |
|---|---|---|
| Auth | Get user by ID | `auth.server.workflows.user.get({ id })` |
| Auth | Get user by email | `auth.server.workflows.user.get({ email })` |
| Auth | Validate session | `auth.server.workflows.session.validate()` |
| Auth | List roles | `auth.server.workflows.role.list()` |
| Storage | Get signed URL | `storage.getSignedUrl()` |
| Storage | List files | `storage.list()` |
| Storage | Get metadata | `storage.getMetadata()` |
| Logs | Query logs | `logs.query()` |
| Logs | Get stats | `logs.getStats()` |
| KV | Get key | `kv.get()` |
| KV | Check exists | `kv.exists()` |
| PubSub | Get queue size | `pubsub.getQueueSize()` |

## Invariants & Business Rules

### Cross-Cutting

1. **All IDs are text** — either app-generated via `crypto.randomUUID()` or DB-generated via `gen_random_uuid()::text`
2. **All timestamps are TIMESTAMPTZ** — `withTimezone: true` on all timestamp columns
3. **Cascade deletes** — User deletion cascades to sessions and accounts
4. **No barrel files** — explicit convention in CODING_CONVENTIONS.md

### Auth

5. **Email uniqueness** — enforced by DB unique constraint
6. **Session token uniqueness** — enforced by DB unique constraint
7. **Phone number uniqueness** — enforced by DB unique constraint (nullable)
8. **Username uniqueness** — enforced by DB unique constraint (nullable)
9. **Roles are strings** — stored as text on user table, not as separate entities

### Storage

10. **Key uniqueness** — enforced by DB unique constraint on file_metadata.key
11. **Archive immutability** — archived files get new key, original marked as archived

### KV Store

12. **Lazy TTL eviction** — expired entries deleted on read, not by background job
13. **UNLOGGED table** — data lost on Postgres crash (by design — cache semantics)

## Anti-Patterns to Avoid

1. **Don't create barrel files** unless explicitly told
2. **Don't use native UUID columns** — always text
3. **Don't use `timestamp without time zone`** — always `withTimezone: true`
4. **Don't register modules after `initialize()`** — throws error
5. **Don't assume dedicated role/permission tables** — roles are text on user table
