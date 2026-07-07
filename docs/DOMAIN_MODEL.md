# Domain Model

## Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AUTH DOMAIN                                  │
│                                                                     │
│  ┌──────────┐       ┌──────────────┐       ┌──────────────┐        │
│  │  AuthUser │──M:N──│   UserRole   │──M:N──│   AuthRole   │        │
│  │          │       │              │       │              │        │
│  │ id       │       │ userId (FK)  │       │ id           │        │
│  │ email    │       │ roleId (FK)  │       │ name         │        │
│  │ name     │       └──────────────┘       │ description  │        │
│  │ metadata │                              │ createdAt    │        │
│  │ passHash │                              │ updatedAt    │        │
│  │ createdAt│                              └──────┬───────┘        │
│  │ updatedAt│                                     │                │
│  └────┬─────┘                                     │ M:N            │
│       │                                    ┌──────┴───────┐        │
│       │ 1:N                                │RolePermission│        │
│       ▼                                    │              │        │
│  ┌──────────┐                              │ roleId (FK)  │        │
│  │AuthSession│                              │ permId (FK)  │        │
│  │          │                              └──────┬───────┘        │
│  │ id       │                                     │ M:1            │
│  │ token    │                              ┌──────┴───────┐        │
│  │ userId   │                              │AuthPermission│        │
│  │ expiresAt│                              │              │        │
│  │ createdAt│                              │ id           │        │
│  └──────────┘                              │ resource     │        │
│                                            │ action       │        │
│                                            │ description  │        │
│                                            └──────────────┘        │
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
│                     NOTIFICATION DOMAIN                              │
│                                                                     │
│  ┌─────────────────┐                                                  │
│  │NotificationRecord│                                                  │
│  │                  │                                                  │
│  │ id               │                                                  │
│  │ type             │  email | sms | push | webhook                   │
│  │ to               │                                                  │
│  │ subject          │                                                  │
│  │ body             │                                                  │
│  │ status           │  pending | sent | failed | delivered            │
│  │ provider         │                                                  │
│  │ error            │                                                  │
│  │ sentAt           │                                                  │
│  │ createdAt        │                                                  │
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

### AuthUser (Aggregate Root)

**Identity**: `id` (text, UUID)

**Value objects**:
- `UserMetadata` — `Record<string, unknown>` (jsonb)
- `PasswordHash` — text (hashed, never exposed)

**Invariants**:
- Email must be unique
- PasswordHash is write-only (never returned in User type)
- Metadata defaults to `{}`

**Lifecycle commands**:
- `create(email, password, name?, metadata?)` → User
- `update(id, { name?, metadata? })` → User
- `delete(id)` → void (cascades to sessions, user_roles)

**Relationships**:
- Has many `AuthSession` (1:N, cascade delete)
- Has many `UserRole` (M:N via join table)

### AuthRole (Aggregate Root)

**Identity**: `id` (text, UUID) or `name` (unique)

**Invariants**:
- Name must be unique
- Permissions are managed via join table

**Lifecycle commands**:
- Created implicitly via `access_control.newRole()` + DB seeding
- `delete(name)` → void (cascades to role_permissions, user_roles)

**Relationships**:
- Has many `AuthPermission` (M:N via `RolePermission`)
- Has many `AuthUser` (M:N via `UserRole`)

### AuthSession (Aggregate Root)

**Identity**: `id` (text, UUID)

**Value objects**:
- `Token` — text, unique session identifier

**Invariants**:
- Token must be unique
- Has expiration (`expiresAt`)
- Cascades delete from user

**Lifecycle commands**:
- `create(email, password)` → `{ user, session }`
- `validate(token)` → `{ user, session } | null`
- `invalidate(id)` → void

### FileMetadata (Aggregate Root)

**Identity**: `id` (text, UUID)

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

**Identity**: `id` (text, UUID)

**Value objects**:
- `LogLevel` — `"debug" | "info" | "warn" | "error" | "fatal"`
- `ErrorInfo` — `{ name, message, stack? }`

**Invariants**:
- Append-only (no updates/deletes from application)
- Level priority: debug(0) < info(1) < warn(2) < error(3) < fatal(4)

### NotificationRecord (Aggregate Root)

**Identity**: `id` (text, UUID)

**Value objects**:
- `NotificationType` — `"email" | "sms" | "push" | "webhook"`
- `NotificationStatus` — `"pending" | "sent" | "failed" | "delivered"`

**State machine**:
```
pending → sent → delivered
pending → failed
sent → failed
```

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
| `Result<T, E>` | `{ success: true, data: T } \| { success: false, error: E }` | Error handling across all units |
| `PaginationParams` | `{ page?, limit? }` | List operations |
| `PaginatedResult<T>` | `{ data, total, page, limit, totalPages }` | Paginated responses |
| `DatabaseConfig` | `{ host, port, user, password, database, ssl?, maxConnections? }` | DB connection |
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
| `role:created` | `{ role: RoleData }` | Role created |
| `role:deleted` | `{ roleName }` | Role deleted |
| `role:assigned` | `{ roleName, userId }` | Role assigned to user |
| `role:unassigned` | `{ roleName, userId }` | Role unassigned from user |

### Not Yet Defined (Gaps)

- File events: `file:uploaded`, `file:deleted`, `file:archived`
- Notification events: `notification:sent`, `notification:failed`
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
| KV | Set key | `kv.set()` |
| KV | Delete key | `kv.del()` |
| Notification | Send | `notification.send()` |

### Queries (Read Side)

| Context | Query | Method |
|---|---|---|
| Auth | Get user by ID | `auth.server.workflows.user.get({ id })` |
| Auth | Get user by email | `auth.server.workflows.user.get({ email })` |
| Auth | List user roles | `auth.server.workflows.user.role.list()` |
| Auth | Check permission | `auth.server.workflows.user.permission.check()` |
| Auth | List user permissions | `auth.server.workflows.user.permission.list()` |
| Auth | Validate session | `auth.server.workflows.session.validate()` |
| Auth | List roles | `auth.server.workflows.role.list()` |
| Storage | Get signed URL | `storage.getSignedUrl()` |
| Storage | List files | `storage.list()` |
| Storage | Get metadata | `storage.getMetadata()` |
| Logs | Query logs | `logs.query()` |
| Logs | Get stats | `logs.getStats()` |
| KV | Get key | `kv.get()` |
| KV | Check exists | `kv.exists()` |
| Notification | Get history | `notification.getHistory()` |
| Notification | Get status | `notification.getStatus()` |

## Invariants & Business Rules

### Cross-Cutting

1. **All IDs are text UUIDs** — `DEFAULT gen_random_uuid()::text`, never native UUID type
2. **All timestamps are TIMESTAMPTZ** — `withTimezone: true` on all timestamp columns
3. **Cascade deletes** — AuthUser deletion cascades to sessions and user_roles; Role deletion cascades to role_permissions and user_roles
4. **No barrel files** — explicit convention in CODING_CONVENTIONS.md

### Auth

5. **Email uniqueness** — enforced by DB unique constraint
6. **Session token uniqueness** — enforced by DB unique constraint
7. **Permission uniqueness** — (resource, action) pair has unique index
8. **Role name uniqueness** — enforced by DB unique constraint

### Storage

9. **Key uniqueness** — enforced by DB unique constraint on file_metadata.key
10. **Archive immutability** — archived files get new key, original marked as archived

### KV Store

11. **Lazy TTL eviction** — expired entries deleted on read, not by background job
12. **UNLOGGED table** — data lost on Postgres crash (by design — cache semantics)

## Anti-Patterns to Avoid

1. **Don't create barrel files** unless explicitly told
2. **Don't use native UUID columns** — always text with `gen_random_uuid()::text`
3. **Don't use `timestamp without time zone`** — always `withTimezone: true`
4. **Don't access units by casting** — use `framework.getUnit("name")`
5. **Don't register modules after `initialize()`** — throws error
6. **Don't import from `@/~` paths** outside the framework — these are internal
