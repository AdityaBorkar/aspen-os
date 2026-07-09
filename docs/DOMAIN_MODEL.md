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
│                     ORGANIZATION DOMAIN                              │
│                                                                     │
│  ┌──────────────┐                                                    │
│  │ Organization  │──1:N──┌──────────┐                               │
│  │              │       │  Branch   │  (hierarchical, max 5 levels) │
│  │ id           │       │          │                                │
│  │ name         │       │ id       │                                │
│  │ slug (uniq)  │       │ name     │                                │
│  │ status       │       │ code(uniq)│                               │
│  │ email        │       │ type     │  headquarters|office|warehouse │
│  │ phone        │       │ isActive │                                │
│  │ website      │       │ parentBranch│                             │
│  │ logo         │       │ ...      │                                │
│  │ accentColor  │       └──────────┘                                │
│  │ locale       │                                                    │
│  │ timezone     │──1:N──┌──────────────────┐                        │
│  │ metadata     │       │ ComplianceDocument│                       │
│  └──────────────┘       │                  │                        │
│                         │ id               │                        │
│                         │ name             │                        │
│  ┌──────────────┐       │ category         │  tax|license|cert...   │
│  │  Connection   │       │ status           │  active|expiring|...  │
│  │              │       │ expiryDate       │                        │
│  │ id           │       │ renewalFrequency │                        │
│  │ name         │       │ branch (FK)      │                        │
│  │ type         │       │ connection (FK)  │                        │
│  │ status       │       └──────────────────┘                        │
│  │ contactPerson│                                                    │
│  │ contactEmail │──1:N──┌──────────────────┐                        │
│  │ tags[]       │       │ ConnectionContact │                        │
│  │ metadata     │       │                  │                        │
│  └──────────────┘       │ id               │                        │
│         │               │ connectionId(FK) │                        │
│         │               │ name             │                        │
│         ├──1:N─────────→│ email            │                        │
│         │               │ isPrimary        │                        │
│         │               └──────────────────┘                        │
│         │                                                           │
│         └──1:N──┌──────────────────┐                                │
│                 │ ConnectionNote    │                                │
│                 │                  │                                │
│                 │ id               │                                │
│                 │ connectionId(FK) │                                │
│                 │ userId           │                                │
│                 │ type             │  general|call|email|meeting    │
│                 │ content          │                                │
│                 └──────────────────┘                                │
│                                                                     │
│  ┌──────────────┐       ┌──────────────┐                            │
│  │   Address     │       │ BankAccount  │                            │
│  │              │       │              │                            │
│  │ id           │       │ id           │                            │
│  │ line1        │       │ accountHolder│                            │
│  │ city         │       │ accountNumber│                            │
│  │ state        │       │ bankName     │                            │
│  │ postalCode   │       │ routingNumber│                            │
│  │ country      │       │ swiftCode    │                            │
│  │ isPrimary    │       │ currency     │                            │
│  │ label        │       │ isPrimary    │                            │
│  │ metadata     │       │ isActive     │                            │
│  └──────────────┘       └──────────────┘                            │
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
- Has expiration (`expiresAt`) — hardcoded at 7 days
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

### Organization (Aggregate Root)

**Identity**: `id` (text, UUID, default `gen_random_uuid()::text`)

**Value objects**:
- `Slug` — text, unique, URL-safe identifier
- `AccentColor` — text, hex color (default `#3B82F6`)
- `Locale` — text (default `en-US`)
- `Timezone` — text (default `UTC`)

**Invariants**:
- Slug must be unique
- Status must be one of: `active`, `suspended`, `archived`

**Lifecycle commands**:
- `create(input)` → Organization
- `update(id, input)` → Organization
- `updateBranding(id, { logo?, accentColor? })` → Organization
- `uploadLogo(id, file)` → Organization
- `deleteLogo(id)` → Organization
- `delete(id)` → void

**Relationships**:
- Has many `Branch` (1:N)
- Has many `ComplianceDocument` (1:N)
- Has many `Address` (1:N, reusable)
- Has many `BankAccount` (1:N)

### Branch (Aggregate Root)

**Identity**: `id` (text, UUID, default `gen_random_uuid()::text`)

**Value objects**:
- `BranchCode` — text, unique identifier
- `BranchType` — enum: `headquarters`, `office`, `warehouse`, `store`, `factory`, `remote`, `other`

**Invariants**:
- Code must be unique
- Exactly one headquarters branch per organization (enforced at workflow level)
- Hierarchical nesting max 5 levels deep
- No circular parent references

**Lifecycle commands**:
- `create(input)` → Branch
- `update(id, input)` → Branch
- `activate(id)` / `deactivate(id)` → Branch
- `close(id)` → Branch
- `archive(id)` / `restore(id)` → Branch
- `getTree()` → BranchTreeNode[]

**Relationships**:
- Belongs to `Organization` (N:1)
- Self-referential: `parentBranch` FK for hierarchy

### Connection (Aggregate Root)

**Identity**: `id` (text, UUID, default `gen_random_uuid()::text`)

**Value objects**:
- `ConnectionType` — enum: `client`, `vendor`, `partner`, `subsidiary`, `parent_company`, `investor`, `regulator`, `insurer`, `bank`, `other`
- `ConnectionStatus` — enum: `active`, `inactive`, `prospect`, `former`
- `ConnectionNoteType` — enum: `general`, `call`, `email`, `meeting`, `contract_renewal`, `issue`

**Invariants**:
- Status transitions are controlled (e.g., can't un-archive)

**Lifecycle commands**:
- `create(input)` → Connection
- `update(id, input)` → Connection
- `updateStatus(id, status)` → Connection
- `archive(id)` / `restore(id)` → Connection
- `search(query)` → Connection[]
- `addContact(connectionId, input)` → ConnectionContact
- `updateContact(contactId, input)` → ConnectionContact
- `deleteContact(contactId)` → void
- `addNote(connectionId, input)` → ConnectionNote
- `listNotes(connectionId)` → ConnectionNote[]

**Relationships**:
- Has many `ConnectionContact` (1:N, cascade delete)
- Has many `ConnectionNote` (1:N, cascade delete)
- Has many `ComplianceDocument` (1:N)

### Connection Contact (Entity)

**Identity**: `id` (text, UUID, default `gen_random_uuid()::text`)

**Invariants**:
- Belongs to exactly one Connection via `connectionId` FK
- One contact per connection can be `isPrimary`

### Connection Note (Entity)

**Identity**: `id` (text, UUID, default `gen_random_uuid()::text`)

**Invariants**:
- Belongs to exactly one Connection via `connectionId` FK
- `userId` references the user who created the note

### Address (Aggregate Root)

**Identity**: `id` (text, UUID, default `gen_random_uuid()::text`)

**Invariants**:
- One address per scope can be `isPrimary`

**Lifecycle commands**:
- `create(input)` → Address
- `update(id, input)` → Address
- `delete(id)` → void
- `setPrimary(id)` → Address
- `unsetPrimary(id)` → Address
- `list(filters?)` → Address[]

### Bank Account (Aggregate Root)

**Identity**: `id` (text, UUID, default `gen_random_uuid()::text`)

**Invariants**:
- One bank account per scope can be `isPrimary`
- `isActive` can be toggled

**Lifecycle commands**:
- `create(input)` → BankAccount
- `update(id, input)` → BankAccount
- `delete(id)` → void
- `setPrimary(id)` → BankAccount
- `activate(id)` / `deactivate(id)` → BankAccount
- `list(filters?)` → BankAccount[]

### Compliance Document (Aggregate Root)

**Identity**: `id` (text, UUID, default `gen_random_uuid()::text`)

**Value objects**:
- `ComplianceCategory` — enum: `tax`, `license`, `certificate`, `permit`, `insurance`, `regulatory`, `legal`, `hr`, `safety`, `environmental`, `other`
- `ComplianceStatus` — enum: `active`, `expiring_soon`, `expired`, `renewal_in_progress`, `archived`
- `RenewalFrequency` — enum: `monthly`, `quarterly`, `semi_annual`, `annual`, `biennial`, `triennial`, `one_time`

**Invariants**:
- Status is derived from dates + renewal state, not set directly
- Renewal chains: renewing archives the old document and creates a new one with `renewedFrom` FK
- `reminderDays` array defines when expiry notifications fire (default: [90, 60, 30, 7])

**Lifecycle commands**:
- `create(input)` → ComplianceDocument
- `update(id, input)` → ComplianceDocument
- `archive(id)` → ComplianceDocument
- `renew(id)` → ComplianceDocument (archives old, creates new)
- `getExpiring(days?)` → ComplianceDocument[]
- `getExpired()` → ComplianceDocument[]
- `getSummary()` → ComplianceSummary
- `transitionExpiredDocuments()` → void
- `notifyExpiringDocuments()` → void (publishes pubsub events)

**Relationships**:
- Belongs to `Organization` (N:1)
- Optionally references `Branch` (N:1)
- Optionally references `Connection` (N:1)
- Self-referential: `renewedFrom` FK for renewal chains

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

### Auth Events (AuthEventMap)

| Event | Payload | Trigger |
|---|---|---|
| `user:created` | `{ user: User }` | User created |
| `user:updated` | `{ user: User }` | User updated |
| `user:deleted` | `{ userId: string }` | User deleted |
| `session:created` | `{ session, user }` | Session authenticated |
| `session:invalidated` | `{ sessionId }` | Session invalidated |
| `role:assigned` | `{ roleName, userId }` | Role assigned to user |
| `role:created` | `{ role: RoleData }` | Role created |
| `role:unassigned` | `{ userId }` | Role unassigned (note: missing `roleName` — known gap) |
| `role:deleted` | `{ roleName }` | Role deleted |

**Note**: These are type-level contracts defined in `AuthEventMap`. Workflows publish via `pubsub.publish("user:created", ...)` as plain string topics — there is no runtime type-safe event bus using the map.

### Organization Events (OrganizationDomainEventMap)

| Event | Payload | Trigger |
|---|---|---|
| `organization:created` | `{ organization }` | Organization created |
| `organization:updated` | `{ organization }` | Organization updated |
| `organization:deleted` | `{ organizationId }` | Organization deleted |
| `organization:branding_updated` | `{ organizationId, logo?, accentColor? }` | Branding changed |
| `branch:created` | `{ branch }` | Branch created |
| `branch:updated` | `{ branch }` | Branch updated |
| `branch:status_changed` | `{ branchId, from, to }` | Branch activated/deactivated/closed |
| `branch:archived` | `{ branchId }` | Branch archived |
| `branch:restored` | `{ branchId }` | Branch restored |
| `connection:created` | `{ connection }` | Connection created |
| `connection:updated` | `{ connection }` | Connection updated |
| `connection:status_changed` | `{ connectionId, from, to }` | Connection status changed |
| `connection:archived` | `{ connectionId }` | Connection archived |
| `connection:restored` | `{ connectionId }` | Connection restored |
| `compliance:document_created` | `{ document }` | Compliance doc created |
| `compliance:document_renewed` | `{ oldDocumentId, newDocument }` | Compliance doc renewed |
| `compliance:document_expiring` | `{ document, daysUntilExpiry }` | Expiry notification |
| `compliance:document_expired` | `{ document }` | Document expired |
| `compliance:documents_transitioned` | `{ count }` | Batch expiry transition |

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
| Storage | Delete file | `storage.remove()` |
| Storage | Archive file | `storage.archive()` |
| PubSub | Publish message | `pubsub.publish()` |
| PubSub | Subscribe | `pubsub.subscribe()` |
| KV | Set key | `kv.set()` |
| KV | Delete key | `kv.del()` |
| Organization | Create org | `f.organization.organization.create()` |
| Organization | Update org | `f.organization.organization.update()` |
| Branch | Create branch | `f.organization.branches.create()` |
| Branch | Archive branch | `f.organization.branches.archive()` |
| Connection | Create connection | `f.organization.connections.create()` |
| Connection | Add contact | `f.organization.connections.addContact()` |
| Compliance | Create document | `f.organization.compliance.create()` |
| Compliance | Renew document | `f.organization.compliance.renew()` |
| Address | Create address | `f.organization.addresses.create()` |
| Bank Account | Create account | `f.organization.bankAccounts.create()` |

### Queries (Read Side)

| Context | Query | Method |
|---|---|---|
| Auth | Get user by ID | `auth.server.workflows.user.get({ id })` |
| Auth | Get user by email | `auth.server.workflows.user.get({ email })` |
| Auth | Validate session | `auth.server.workflows.session.validate()` |
| Auth | List roles | `auth.server.workflows.role.list()` |
| Storage | Get signed URL | `storage.getSignedGetUrl()` |
| Storage | List files | `storage.list()` |
| Storage | Get metadata | `storage.getMetadata()` |
| Logs | Query logs | `logs.query()` |
| Logs | Get stats | `logs.getStats()` |
| KV | Get key | `kv.get()` |
| KV | Check exists | `kv.exists()` |
| PubSub | Get queue size | `pubsub.getQueueSize()` |
| Organization | Get org | `f.organization.organization.get()` |
| Branch | List branches | `f.organization.branches.list()` |
| Branch | Get tree | `f.organization.branches.getTree()` |
| Connection | Search | `f.organization.connections.search()` |
| Connection | List contacts | `f.organization.connections.listContacts()` |
| Compliance | Get expiring | `f.organization.compliance.getExpiring()` |
| Compliance | Get summary | `f.organization.compliance.getSummary()` |
| Address | List addresses | `f.organization.addresses.list()` |
| Bank Account | List accounts | `f.organization.bankAccounts.list()` |

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

### Organization

10. **Slug uniqueness** — enforced by DB unique constraint on organization.slug
11. **Branch code uniqueness** — enforced by DB unique constraint on branch.code
12. **Single headquarters** — exactly one branch of type `headquarters` per organization (enforced in workflow)
13. **Branch hierarchy depth** — max 5 levels deep (enforced in workflow)
14. **No circular branch parents** — detected via recursive traversal in workflow
15. **Compliance status derivation** — status is derived from dates + renewal state, not set directly

### Storage

16. **Key uniqueness** — enforced by DB unique constraint on file_metadata.key
17. **Archive immutability** — archived files get new key, original marked as archived

### KV Store

18. **Lazy TTL eviction** — expired entries deleted on read, not by background job
19. **UNLOGGED table** — data lost on Postgres crash (by design — cache semantics)

## Anti-Patterns to Avoid

1. **Don't create barrel files** unless explicitly told
2. **Don't use native UUID columns** — always text
3. **Don't use `timestamp without time zone`** — always `withTimezone: true`
4. **Don't call `create()` then try to register more modules** — pass all modules to `Framework.create()` at once
5. **Don't assume dedicated role/permission tables** — roles are text on user table
6. **Don't read `AuthConfig.session.expiresIn`** — session expiry is hardcoded at 7 days
