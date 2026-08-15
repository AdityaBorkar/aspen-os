# Platform Domain Model

> Package: `@aspen-os/platform`. Platform-level entities: the Auth domain, Storage, Logs, KV Store, Audit, and Workflow — the records the framework itself owns. Domain modules do not own any of these tables; they are pushed as platform core schemas by `DatabaseUnit.getSchemas()`.

## Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AUTH DOMAIN                                  │
│                                                                     │
│  ┌──────────┐       ┌──────────────┐       ┌──────────────────┐    │
│  │   User   │──1:N──│   Session    │       │   Account        │    │
│  │  id      │       │  id          │       │  id              │    │
│  │  email   │       │  token       │       │  userId (FK)     │    │
│  │  name    │       │  userId (FK) │       │  providerId      │    │
│  │  role    │  ┌───→│  expiresAt   │       │  accountId       │    │
│  │  username│  │    │  createdAt   │       │  password        │    │
│  │  phoneNum│  │    └──────────────┘       │  accessToken     │    │
│  │  banned  │──┘                           │  refreshToken    │    │
│  │  image   │──1:N────────────────────────→│  idToken         │    │
│  │  createdAt                              └──────────────────┘    │
│  │  updatedAt                                                       │
│  └──────────┘                                                       │
│                                                                     │
│  ┌────────────────┐                                                  │
│  │  Verification   │                                                  │
│  │  id             │                                                  │
│  │  identifier     │                                                  │
│  │  value          │                                                  │
│  │  expiresAt      │                                                  │
│  └─────────────────┘                                                  │
│  (better-auth tables: also organization, member, invitation,          │
│   apikey, twoFactor, passkey — generated via `gen:auth-schema`)       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     STORAGE DOMAIN                                   │
│  FileMetadata: id, key, bucket, contentType, size, etag,            │
│  metadata, archived, archivedKey, createdAt, updatedAt               │
│  (Postgres row → S3 Object external)                                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        LOGS DOMAIN                                   │
│  LogEntry: id, level, message, service, timestamp, metadata(jsonb), │
│  error{name,msg}, traceId, spanId, userId, requestId, duration      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       KV-STORE DOMAIN                                │
│  KVEntry: key(PK), value(text), expiresAt(nullable), updatedAt       │
│  (regular pgTable — NOT UNLOGGED)                                    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                  AUDIT DOMAIN (Platform Core)                        │
│  AuditLog: id, tenantId, seq(bigserial), action, crudAction,        │
│    actorId, entityType, entityId, previousState(jsonb),             │
│    newState(jsonb), changes(jsonb), metadata(jsonb),                │
│    idempotencyKey, workflowRunId, requestId, traceId, performedAt   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│               WORKFLOW DOMAIN (Platform Core)                        │
│  WorkflowRun: id, workflowName, status, input(jsonb), output(jsonb),│
│    error(jsonb), startedAt, completedAt, durationMs, tenantId,      │
│    metadata(jsonb)                                                  │
│  WorkflowStep: id, runId, stepName, status, attempt, output(jsonb), │
│    error(jsonb), startedAt, completedAt, durationMs                 │
└─────────────────────────────────────────────────────────────────────┘
```

## Aggregates

### User (Aggregate Root — better-auth)

**Identity**: `id` (text, PK — no default; better-auth manages ID generation)

**Invariants**:

- Email must be unique
- Phone number, if present, must be unique
- Username, if present, must be unique
- Role is a plain `text` column — not a separate entity

**Lifecycle commands** (via `AuthUnit.rest`/`service`): `user.create(email, password, name?, metadata?)`, `user.update(id, { name?, metadata? })`, `user.remove(id)` (cascades to sessions, accounts).

**Relationships**: Has many `Session` (1:N, cascade delete); has many `Account` (1:N, cascade delete); has one `role` (text field).

### Account (Entity — better-auth)

**Identity**: `id` (text, PK)

**Invariants**:

- Belongs to exactly one User via `userId` FK
- Password is stored here, not on the User table
- Multiple accounts per user possible (OAuth providers)

### Session (Aggregate Root — better-auth)

**Identity**: `id` (text, PK)

**Invariants**:

- Token must be unique
- Has expiration (`expiresAt`) — configured via `AuthConfig.session.expiresIn`, forwarded to better-auth
- Cascades delete from User

**Lifecycle commands**: `session.create(email, password)` → `{ user, session }`, `session.validate(token)`, `session.invalidate(id)`.

### Verification (Entity — better-auth)

**Identity**: `id` (text, PK)

**Invariants**: Has expiration (`expiresAt`); used for email verification, password reset, etc.

### FileMetadata (Aggregate Root — Framework Storage)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)` — the `uuidv7` JS function)

**Invariants**:

- Key must be unique
- `archived` boolean controls soft-delete
- `archivedKey` set when archived (new S3 location)

**Lifecycle commands**: `storage.upload(key, body, contentType?, metadata?)` → `FileObject`, `storage.remove(key)`, `storage.archive(key)` (moves to archive bucket/prefix), `storage.getSignedGetUrl(key, options?)`.

### LogEntry (Entity — append-only)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)` — the `uuidv7` JS function)

**Invariants**:

- Append-only (no updates/deletes from application)
- Level priority: debug(0) < info(1) < warn(2) < error(3) < fatal(4)

### KVEntry (Entity)

**Identity**: `key` (text, PK)

**Invariants**:

- Expired entries are lazily evicted on read
- Table is a regular `pgTable` (no UNLOGGED modifier — durability over performance)

### AuditLog (Entity — append-only, Platform Core)

**Identity**: `id` (uuid, PK, `$defaultFn(() => uuidv7())`) — note: this is the **one exception** to the `text + uuidv7()` convention.

**Invariants**:

- Append-only (no updates/deletes)
- `seq bigserial` provides deterministic replay order
- `idempotency_key` with partial unique index `UNIQUE(tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL` — retries with the same key no-op
- `entityType` is open text (per-module constants, not a DB enum)
- `action` is open text (per-module constants, not a DB enum)
- `crudAction` is one of: `create`, `update`, `delete` (nullable — not all actions are CRUD)
- `actorId` defaults to `"system"` when context has no actor (known gap: `context.actorId` is never populated by the framework)
- `workflowRunId` is optional provenance — links to `workflow_runs.id` but is NOT a replay handle
- Written via `ctx.audit.write(entry, tx?)` — the optional `tx` handle provides transactional atomicity with the mutation

**Relationships**: Optionally links to `WorkflowRun` via `workflowRunId` (provenance only).

### WorkflowRun / WorkflowStep (Entities — Platform Core)

`WorkflowRun`: `{ id, workflowName, status (running/completed/failed), input, output, error, startedAt, completedAt, durationMs, tenantId, metadata }` — one per `.run()` call.

`WorkflowStep`: `{ id, runId, stepName, status (pending/running/completed/failed/skipped), attempt, output, error, startedAt, completedAt, durationMs }` — deduped by `(runId, stepName)`; a completed step is skipped on retry.

## Domain Events — Auth (8)

| Event                 | Payload                                | Trigger                                                |
| --------------------- | -------------------------------------- | ------------------------------------------------------ |
| `user:created`        | `{ user: User }`                       | User created                                           |
| `user:updated`        | `{ user: User }`                       | User updated                                           |
| `user:deleted`        | `{ userId: string }`                   | User deleted                                           |
| `session:created`     | `{ session: Session, user: User }`     | Session authenticated                                  |
| `session:invalidated` | `{ sessionId: string }`                | Session invalidated                                    |
| `role:assigned`       | `{ roleName: string, userId: string }` | Role assigned to user                                  |
| `role:unassigned`     | `{ userId: string }`                   | Role unassigned (note: missing `roleName` — known gap) |
| `role:deleted`        | `{ roleName: string }`                 | Role deleted                                           |

Auth events are published from the auth services (`services/{role,session,user}.ts`) as plain string topics.

## Command-Query Separation

### Commands (Write Side)

| Context | Command            | Method                      |
| ------- | ------------------ | --------------------------- |
| Auth    | Create user        | `auth.user.create()`        |
| Auth    | Delete user        | `auth.user.remove()`        |
| Auth    | Update user        | `auth.user.update()`        |
| Auth    | Assign role        | `auth.user.role.assign()`   |
| Auth    | Unassign role      | `auth.user.role.unassign()` |
| Auth    | Create session     | `auth.session.create()`     |
| Auth    | Invalidate session | `auth.session.invalidate()` |
| Auth    | Delete role        | `auth.role.remove()`        |
| Storage | Upload file        | `storage.upload()`          |
| Storage | Delete file        | `storage.remove()`          |
| Storage | Archive file       | `storage.archive()`         |
| PubSub  | Publish message    | `pubsub.publish()`          |
| PubSub  | Subscribe          | `pubsub.subscribe()`        |
| KV      | Set key            | `kv.set()`                  |
| KV      | Delete key         | `kv.del()`                  |

### Queries (Read Side)

| Context  | Query                                 | Method                                             |
| -------- | ------------------------------------- | -------------------------------------------------- |
| Auth     | Get user by ID                        | `auth.user.get({ id })`                            |
| Auth     | Get user by email                     | `auth.user.get({ email })`                         |
| Auth     | Validate session                      | `auth.session.validate()`                          |
| Auth     | List roles                            | `auth.role.list()`                                 |
| Storage  | Get signed URL                        | `storage.getSignedGetUrl()`                        |
| Storage  | List files                            | `storage.list()`                                   |
| Storage  | Get metadata                          | `storage.getMetadata()`                            |
| Logs     | Query logs                            | `logs.query()`                                     |
| Logs     | Get stats                             | `logs.getStats()`                                  |
| KV       | Get key                               | `kv.get()`                                         |
| KV       | Check exists                          | `kv.exists()`                                      |
| PubSub   | Get queue size                        | `pubsub.getQueueSize()`                            |
| PubSub   | List produced-but-unsubscribed topics | `pubsub.getUnsubscribedProducedTopics()`           |
| Platform | Health check                          | `p.healthCheck()`                                  |
| Audit    | Query audit log                       | `ctx.audit.query(filters)`                         |
| Audit    | Count audit entries                   | `ctx.audit.count(filters)`                         |
| Audit    | Reconstruct state                     | `ctx.audit.reconstructState(entityType, entityId)` |

## Invariants & Business Rules

### Cross-cutting (framework-wide)

1. **All IDs are text** — app-generated via `crypto.getRandomValues()`-based `uuidv7()` (inserted via drizzle's `$defaultFn`). Exception: better-auth tables (`text("id").primaryKey()` without default) and `audit_log.id` (native `uuid` + `$defaultFn(() => uuidv7())`).
2. **All timestamps are TIMESTAMPTZ** — `withTimezone: true` on all timestamp columns.
3. **Cascade deletes** — User deletion cascades to sessions and accounts.
4. **No barrel files** — explicit convention in `CODING_CONVENTIONS.md`.
5. **No DB-level foreign keys in domain modules** — soft FKs (logical references by naming convention), except platform core tables.

### Auth

6. **Email uniqueness** — enforced by DB unique constraint.
7. **Session token uniqueness** — enforced by DB unique constraint.
8. **Phone number uniqueness** — enforced by DB unique constraint (nullable).
9. **Username uniqueness** — enforced by DB unique constraint (nullable).
10. **Roles are strings** — stored as text on the user table, not as separate entities.

### Storage

11. **Key uniqueness** — enforced by DB unique constraint on `file_metadata.key`.
12. **Archive immutability** — archived files get a new key, the original is marked archived.

### KV Store

13. **Lazy TTL eviction** — expired entries deleted on read, not by a background job.
14. **Regular table** — `kv_store` is a normal `pgTable` (not UNLOGGED; durability over cache semantics).

## Not Yet Defined (Gaps)

- File events (framework storage): `file:uploaded`, `file:deleted`, `file:archived`
- Log events: `log:error-threshold-exceeded`
- KV events: (none expected — cache operations are internal)
