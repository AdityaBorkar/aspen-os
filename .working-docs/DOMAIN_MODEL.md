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
│  │ logo         │       └──────────┘                                │
│  │ accentColor  │                                                    │
│  │ locale       │                                                    │
│  │ timezone     │                                                    │
│  │ metadata     │                                                    │
│  └──────────────┘                                                    │
│                                                                     │
│  ┌──────────────┐       ┌──────────────┐                            │
│  │  Connection   │       │   Address     │                            │
│  │              │       │              │                            │
│  │ id           │       │ id           │                            │
│  │ name         │       │ line1        │                            │
│  │ type         │       │ city         │                            │
│  │ status       │       │ state        │                            │
│  │ contactPerson│       │ postalCode   │                            │
│  │ contactEmail │       │ country      │                            │
│  │ tags[]       │       │ isPrimary    │                            │
│  │ metadata     │       │ label        │                            │
│  └──────────────┘       └──────────────┘                            │
│         │                                                           │
│         ├──1:N──┌──────────────────┐                                │
│         │       │ ConnectionContact │                                │
│         │       │ id               │                                │
│         │       │ connectionId(FK) │                                │
│         │       │ name, email      │                                │
│         │       │ isPrimary        │                                │
│         │       └──────────────────┘                                │
│         │                                                           │
│         └──1:N──┌──────────────────┐                                │
│                 │ ConnectionNote    │                                │
│                 │ id               │                                │
│                 │ connectionId(FK) │                                │
│                 │ userId           │                                │
│                 │ type             │  general|call|email|meeting    │
│                 │ content          │                                │
│                 └──────────────────┘                                │
│                                                                     │
│  ┌──────────────┐                                                   │
│  │ BankAccount  │                                                   │
│  │ id           │                                                   │
│  │ accountHolder│                                                   │
│  │ accountNumber│                                                   │
│  │ bankName     │                                                   │
│  │ isPrimary    │                                                   │
│  └──────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     COMPLIANCE DOMAIN                                │
│                                                                     │
│  ┌──────────────────────┐                                           │
│  │ ComplianceDocument    │                                           │
│  │ id                    │                                           │
│  │ name                  │                                           │
│  │ category (enum)       │── soft FK ──┐                             │
│  │ verificationStatus    │             │                             │
│  │ sourceModule          │             │                             │
│  │ sourceEntityId        │             │  soft FK to external        │
│  │ branch (soft FK)      │             │  entities (organization,    │
│  │ connection (soft FK)   │             │  hr, fleet, accounting)     │
│  │ obligationId (soft FK) │──┐          │                             │
│  │ renewedFrom (self FK) │  │          │                             │
│  │ expiryDate            │  │          │                             │
│  │ dueDate               │  │          │                             │
│  │ reminderDays[]        │  │          │                             │
│  │ escalationDays[]      │  │          │                             │
│  │ assignedReviewer      │  │          │                             │
│  │ assignedTo            │  │          │                             │
│  │ createdBy             │  │          │                             │
│  └──────────────────────┘  │          │                             │
│         ↑                  │          │                             │
│         │ renewedFrom      │          │                             │
│         │ (renewal chain)  │          │                             │
│                            ▼          │                             │
│  ┌──────────────────────┐             │                             │
│  │ ComplianceObligation  │             │                             │
│  │ id                    │             │                             │
│  │ name                  │             │                             │
│  │ category (enum)       │             │                             │
│  │ frequency (enum)      │             │                             │
│  │ startDate             │             │                             │
│  │ endDate               │             │                             │
│  │ isActive              │             │                             │
│  │ autoGenerate          │             │                             │
│  │ expiryBased           │             │                             │
│  │ sourceModule          │             │                             │
│  │ sourceEntityId        │─────────────┘                             │
│  └──────────────────────┘                                           │
│                                                                     │
│  ┌──────────────────────┐                                           │
│  │ VerificationRule     │                                           │
│  │ id                    │                                           │
│  │ name                  │                                           │
│  │ category              │                                           │
│  │ priority              │                                           │
│  │ requiredReviewerRole  │                                           │
│  │ assignedReviewer      │                                           │
│  │ isActive              │                                           │
│  └──────────────────────┘                                           │
│                                                                     │
│  (Audit entries for compliance entities are written to the          │
│   platform's audit_log table via ctx.audit.write(...) — no         │
│   module-local audit table. Queries go through ctx.audit.query())  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        TASKS DOMAIN                                 │
│                                                                     │
│  ┌──────────────┐                                                    │
│  │   Project    │──1:N──┌──────────┐                                │
│  │ id           │       │  Task    │──1:N──┌──────────────┐         │
│  │ key (uniq)   │       │ id       │       │ TaskAssignee │         │
│  │ name         │       │ title    │       │ taskId (FK)  │         │
│  │ status       │       │ number   │       │ userId       │         │
│  │ leadId       │       │ priority │       │ isLead       │         │
│  │ taskCounter  │       │ statusId │       └──────────────┘         │
│  └──────┬───────┘       │ reporterId│                               │
│         │               │ parentId  │──1:N──┌──────────────┐        │
│         ├──1:N──┐       │ typeId    │       │ TaskComment  │        │
│         │       │       │ labels[]  │       │ taskId (FK)  │        │
│         │  ┌────┴───────┐│ dueDate  │       │ userId       │        │
│         │  │ProjectMember││ estimatedHrs│    │ body         │        │
│         │  │projectId(FK)││ isArchived│    │ parentId     │──self    │
│         │  │userId       │└──────────┘       └──────────────┘        │
│         │  │role         │                                           │
│         │  └─────────────┘   ┌──────────────┐                        │
│         │                    │ TaskStatus   │                        │
│         │                    │ id           │                        │
│         │                    │ name         │                        │
│         │                    │ category     │  backlog|unstarted|     │
│         │                    │ isResolved   │  started|completed|    │
│         │                    │ sortOrder    │  cancelled              │
│         │                    │ projectId    │                        │
│         │                    └──────────────┘                        │
│         │                                                            │
│         │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│         │  │ TaskLink     │  │ TimeEntry    │  │ SavedView     │     │
│         │  │ sourceId(FK) │  │ taskId (FK)  │  │ ownerId       │     │
│         │  │ targetId(FK) │  │ userId       │  │ projectId     │     │
│         │  │ linkType     │  │ duration     │  │ type          │     │
│         │  └──────────────┘  │ billable     │  │ filters(jsonb)│     │
│         │                    └──────────────┘  └──────────────┘     │
│         │                                                            │
│         │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│         │  │ AutomationRule│  │ Reminder     │  │ Watcher       │     │
│         │  │ projectId    │  │ taskId (FK)  │  │ taskId (FK)   │     │
│         │  │ trigger      │  │ userId       │  │ userId        │     │
│         │  │ conditions   │  │ remindAt     │  └──────────────┘     │
│         │  │ actions      │  │ type         │                        │
│         │  │ isActive     │  └──────────────┘                        │
│         │  └──────────────┘                                           │
│         └──────────────────────────────────────────────────────────  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        DRIVE DOMAIN                                  │
│                                                                     │
│  ┌──────────────┐                                                    │
│  │ DriveFolder  │──self──┐                                           │
│  │ id           │        │ parentId                                  │
│  │ name         │        │                                           │
│  │ path (uniq)  │        ▼                                           │
│  │ ownerId      │  (hierarchical, max depth 20)                      │
│  │ parentId     │                                                    │
│  │ isTrashed    │──1:N──┌──────────────┐                            │
│  │ color        │       │  DriveFile   │──1:N──┌──────────────┐     │
│  └──────────────┘       │ id           │       │FileVersion   │     │
│                          │ name         │       │ fileId (FK)  │     │
│  ┌──────────────┐       │ path (uniq)  │       │ version      │     │
│  │   Label      │       │ storageKey   │       │ storageKey   │     │
│  │ id           │       │ contentType  │       │ size         │     │
│  │ name         │       │ size         │       │ etag         │     │
│  │ color        │       │ version      │       │ uploadedBy   │     │
│  │ isGlobal     │       │ etag         │       └──────────────┘     │
│  │ ownerId      │       │ folderId(FK)│                             │
│  └──────────────┘       │ ownerId      │                             │
│         │               │ isTrashed   │                             │
│         │  ┌──────────────┐           │                             │
│         └──│ ItemLabel    │──polymorphic (itemId, itemType)          │
│            │ labelId (FK) │           │                             │
│            └──────────────┘           │                             │
│                                       │                             │
│  ┌──────────────┐    ┌──────────────┐  │                             │
│  │   Share       │    │ PublicLink   │  │                             │
│  │ itemId       │    │ itemId       │  │                             │
│  │ itemType     │    │ itemType     │  │                             │
│  │ granteeId    │    │ token (uniq)  │  │                             │
│  │ granteeType  │    │ permission   │  │                             │
│  │ permission   │    │ password     │  │                             │
│  │ sharedBy     │    │ maxViews     │  │                             │
│  │ expiresAt    │    │ viewCount    │  │                             │
│  └──────────────┘    └──────────────┘  │                             │
│                                        │                             │
│  ┌──────────────┐                     │                             │
│  │ AccessLog     │──polymorphic (itemId, itemType)                  │
│  │ accessedBy    │                                                   │
│  │ action        │                                                   │
│  │ ip            │                                                   │
│  │ userAgent     │                                                   │
│  │ publicLinkId  │                                                   │
│  └──────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     STORAGE DOMAIN (Framework)                      │
│                                                                     │
│  ┌────────────────┐                                                  │
│  │  FileMetadata   │  →  S3 Object (external)                       │
│  │ id, key, bucket, contentType, size, etag,                        │
│  │ metadata, archived, archivedKey, createdAt, updatedAt             │
│  └─────────────────┘                                                  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        LOGS DOMAIN                                   │
│  LogEntry: id, level, message, service, timestamp, metadata(jsonb),│
│  error{name,msg}, traceId, spanId, userId, requestId, duration     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       KV-STORE DOMAIN                                │
│  KVEntry: key(PK), value(text), expiresAt(nullable), updatedAt      │
│  (UNLOGGED table — cache semantics)                                  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                  AUDIT DOMAIN (Platform Core)                       │
│  AuditLog: id, tenantId, seq(bigserial), action, crudAction,       │
│    actorId, entityType, entityId, previousState(jsonb),              │
│    newState(jsonb), changes(jsonb), metadata(jsonb),                 │
│    idempotencyKey, workflowRunId, requestId, traceId, performedAt   │
│  (Platform core schema — pushed by DatabaseUnit.getSchemas())       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│               WORKFLOW DOMAIN (Platform Core)                       │
│  WorkflowRun: id, workflowName, status, input(jsonb), output(jsonb),│
│    error(jsonb), startedAt, completedAt, durationMs, tenantId,     │
│    metadata(jsonb)                                                  │
│  WorkflowStep: id, runId, stepName, status, attempt, output(jsonb),│
│    error(jsonb), startedAt, completedAt, durationMs                 │
│  (Platform core schemas — pushed by DatabaseUnit.getSchemas())      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        HR DOMAIN (50 tables, 7 sub-domains)         │
│                                                                     │
│  Employee ←─ 1:N ─→ Attendance, Leave, Lifecycle, Overtime, Shift   │
│  Setup: Department, Designation, EmploymentType, Grade, HolidayList │
│  Access: HR Users, Roles, Permissions, Branch-wise Access           │
│  (Module partially conformant — not `implements Module`)           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                  MANAGEMENT PLANE DOMAIN                             │
│                                                                     │
│  ┌──────────────────┐       ┌──────────────────────┐                │
│  │      Tenant       │──1:N──│   AuditLog            │                │
│  │  (companion)      │       │  (platform core —     │                │
│  │  id (PK)          │       │   not module-owned)   │                │
│  │  status (enum)    │       │  id (PK)              │                │
│  │  plan             │       │  entityType (enum)    │                │
│  │  serviceProviderId│──N:1─→│  entityId             │                │
│  │  signupAt         │       │  action (enum, 17)    │                │
│  │  databaseHost     │       │  actorId              │                │
│  │  databaseName     │       │  performedAt          │                │
│  │  databasePort     │       │  previousState (jsonb)│                │
│  │  databaseUser     │       │  newState (jsonb)     │                │
│  │  databasePassword │       │  changes (jsonb)      │                │
│  │  databaseSsl      │       │  metadata (jsonb)     │                │
│  │  suspendedAt      │       └──────────────────────┘                │
│  │  suspendedReason  │                                               │
│  │  churnedAt        │       ┌──────────────────────┐                │
│  │  churnReason      │       │  ServiceProvider      │                │
│  └────────┬──────────┘       │  id (PK)              │                │
│           │                  │  name                 │                │
│           │ 1:1              │  slug (uniq)          │                │
│           │                  │  status (enum)        │                │
│           ▼                  │  description          │                │
│  ┌──────────────────┐       │  email, phone         │                │
│  │  better-auth     │       │  address, website     │                │
│  │  Organization     │       │  logo                 │                │
│  │  (the Tenant)     │       └──────────┬───────────┘                │
│  │  id (PK)          │                  │ 1:N                        │
│  │  name             │                  ▼                            │
│  │  slug             │       ┌──────────────────────┐                │
│  │  logo             │       │  User (shadow)        │                │
│  │  metadata         │       │  id (PK)              │                │
│  └──────────────────┘       │  email, name          │                │
│                              │  role (text)          │                │
│  Owned tables (control_plane):  │  spId (FK→SP)         │                │
│    tenant, service_provider  └──────────────────────┘                │
│  Shadow tables (tenant):                                            │
│    organization (better-auth mirror), user (better-auth mirror+spId)│
│                                                                     │
│  Roles: platform_admin, sp_user, tenant_admin, tenant_user           │
│  Config: ManagementPlaneConfig = undefined (WIP)                    │
│  Deps: ["organization"]                                             │
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

**Invariants**:
- Belongs to exactly one User via `userId` FK
- Password is stored here, not on the User table
- Multiple accounts per user possible (OAuth providers)

### Session (Aggregate Root)

**Identity**: `id` (text, generated via `crypto.randomUUID()`)

**Invariants**:
- Token must be unique
- Has expiration (`expiresAt`) — configured via `AuthConfig.session.expiresIn`, forwarded to better-auth
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

**Identity**: `id` (text, UUID, default `uuidv7()`)

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
- Has many `Address` (1:N, reusable)
- Has many `BankAccount` (1:N)

### Branch (Aggregate Root)

**Identity**: `id` (text, UUID, default `uuidv7()`)

**Invariants**:
- Code must be unique
- Exactly one headquarters branch per organization (enforced in workflow)
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

**Identity**: `id` (text, UUID, default `uuidv7()`)

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

### Address (Aggregate Root)

**Identity**: `id` (text, UUID, default `uuidv7()`)

**Lifecycle commands**:
- `create(input)` → Address
- `update(id, input)` → Address
- `delete(id)` → void
- `setPrimary(id)` → Address
- `unsetPrimary(id)` → Address
- `list(filters?)` → Address[]

### Bank Account (Aggregate Root)

**Identity**: `id` (text, UUID, default `uuidv7()`)

**Lifecycle commands**:
- `create(input)` → BankAccount
- `update(id, input)` → BankAccount
- `delete(id)` → void
- `setPrimary(id)` → BankAccount
- `activate(id)` / `deactivate(id)` → BankAccount
- `list(filters?)` → BankAccount[]

### Compliance Document (Aggregate Root)

**Identity**: `id` (text, UUID, default `uuidv7()`)

**Value objects**:
- `ComplianceCategory` — enum: tax, license, certificate, permit, insurance, regulatory, legal, hr, safety, environmental, data_privacy, financial, vehicle, property, audit, other
- `VerificationStatus` — enum: draft, submitted, under_review, verified, rejected, expired, overdue, renewed, archived
- `RenewalFrequency` — enum: monthly, quarterly, semi_annual, annual, biennial, triennial, one_time
- `ReminderChannel` — enum: pubsub, email, both

**Invariants**:
- Verification status is derived from dates + renewal state by `StatusDerivation` service, not set directly (except by `updateStatus`)
- Renewal chains: renewing archives the old document and creates a new one with `renewedFrom` FK
- `reminderDays` array defines when expiry notifications fire (default: [90, 60, 30, 7])
- `escalationDays` array defines escalation thresholds (default: [1, 7, 30])
- Soft FKs: `branch` → organization branch, `connection` → organization connection, `obligationId` → compliance_obligation, `sourceEntityId` → external entity (via `sourceModule`/`sourceEntityType`)

**Lifecycle commands**:
- `create(input)` → ComplianceDocument
- `update(id, patch)` → ComplianceDocument
- `uploadAttachment(id, storageKey)` → ComplianceDocument
- `submit(id)` → ComplianceDocument (draft → submitted)
- `assignReviewer(id, userId)` → ComplianceDocument
- `assignTo(id, userId)` → ComplianceDocument
- `verify(id, reviewerId)` → ComplianceDocument (→ verified)
- `reject(id, reviewerId, reason)` → ComplianceDocument (→ rejected)
- `complete(id, { completedAt?, referenceNumber?, attachmentKey? })` → ComplianceDocument
- `markRenewalInProgress(id)` → ComplianceDocument
- `renew(id, newData)` → `{ oldDocument, newDocument }` (archives old, creates new)
- `archive(id)` → ComplianceDocument
- `snooze(id, days, snoozedBy)` → ComplianceDocument
- `getById(id)` → ComplianceDocument
- `list(filters?)` → ComplianceDocument[]
- `getExpiring(days)` → ComplianceDocument[]
- `getDueSoon(days)` → ComplianceDocument[]
- `getExpired()` → ComplianceDocument[]
- `getOverdue()` → ComplianceDocument[]
- `getRenewalChain(id)` → RenewalChainEntry[]
- `getBySource(sourceModule, sourceEntityType?, sourceEntityId?)` → ComplianceDocument[]
- `getByObligation(obligationId)` → ComplianceDocument[]
- `getTimeline(days)` → TimelineEntry[]

**Relationships**:
- Optionally belongs to `ComplianceObligation` (soft FK: `obligationId`)
- Self-referential: `renewedFrom` FK for renewal chains
- Links to external entities via `{sourceModule, sourceEntityType, sourceEntityId}`

### Compliance Obligation (Aggregate Root)

**Identity**: `id` (text, UUID, default `uuidv7()`)

**Value objects**:
- `ObligationFrequency` — enum: monthly, quarterly, semi_annual, annual, biennial, triennial, custom

**Invariants**:
- `autoGenerate` flag controls whether documents are auto-created
- `expiryBased` vs `periodBased` determines how due/expiry dates are computed
- `isActive` can be toggled to pause generation

**Lifecycle commands**:
- `create(input)` → ComplianceObligation
- `update(id, patch)` → ComplianceObligation
- `activate(id)` → ComplianceObligation
- `deactivate(id)` → ComplianceObligation
- `getById(id)` → ComplianceObligation
- `list(filters?)` → ComplianceObligation[]
- `getActiveObligations()` → ComplianceObligation[]
- `getUpcomingPeriods(obligation, count)` → PeriodPreview[]

**Relationships**:
- Has many `ComplianceDocument` (1:N, soft FK)
- Links to external entities via `{sourceModule, sourceEntityType, sourceEntityId}`

### Verification Rule (Aggregate Root)

**Identity**: `id` (text, UUID, default `uuidv7()`)

**Invariants**:
- Matches documents by `category` and `sourceModule`
- `priority` determines rule evaluation order (lower = higher priority)
- `isActive` can be toggled

**Lifecycle commands**:
- `create(input)` → ComplianceVerificationRule
- `update(id, patch)` → ComplianceVerificationRule
- `delete(id)` → void
- `getById(id)` → ComplianceVerificationRule
- `list(filters?)` → ComplianceVerificationRule[]
- `match(document)` → ComplianceVerificationRule | null

### Audit Entry (Entity — append-only, via platform AuditUnit)

**Identity**: `id` (text, UUID, default `uuidv7()`)

**Note**: Compliance audit entries are written to the platform's `audit_log` table via `ctx.audit.write(...)` and queried via `ctx.audit.query(...)`. There is no module-local `compliance_audit_entry` table. The `AuditWorkflow` (`compliance/src/workflows/audit.ts`) provides `getAuditTrail`, `list`, and `export` by querying the platform audit log.

**Invariants**:
- Append-only (no updates/deletes)
- Polymorphic: `entityType` + `entityId` references any compliance entity
- `action` is one of 18 defined audit actions (module-local constants)

### Project (Aggregate Root)

**Identity**: `id` (text, UUID, default `uuidv7()`)

**Invariants**:
- `key` must be unique
- `taskCounter` is incremented atomically per task creation
- Cannot delete a project with existing tasks (must archive first)
- Lead is automatically added as `admin` project member on creation

**Lifecycle commands**:
- `create(input)` → Project (also adds lead as admin member)
- `update(id, patch)` → Project
- `archive(id)` / `restore(id)` → Project
- `delete(id)` → void (refuses if tasks exist)
- `getById(id)` → Project
- `list(filters?)` → Project[]
- `addMember(input)` / `updateMember(projectId, userId, patch)` / `removeMember(projectId, userId)`
- `listMembers(projectId)` → ProjectMember[]

**Relationships**:
- Has many `Task` (1:N)
- Has many `ProjectMember` (1:N)
- Has many `TaskStatus` (1:N, or global if projectId is null)
- Has many `TaskType` (1:N)
- Has many `AutomationRule` (1:N)

### Task (Aggregate Root)

**Identity**: `id` (text, UUID, default `uuidv7()`)

**Value objects**:
- `TaskPriority` — enum: urgent, high, medium, low, none
- `TaskNumber` — display format `KEY-seq` (e.g., `PROJ-1`)

**Invariants**:
- `parentId` max nesting depth of 3 levels
- No circular parent references (cycle detection in workflow)
- `taskNumber` is sequential per project
- `isArchived` is a soft-delete flag

**Lifecycle commands**:
- `create(input)` → Task (generates display number, increments project counter, logs activity)
- `update(id, patch)` → Task (logs status-change + update activities)
- `delete(id)` → void
- `archive(id)` / `restore(id)` → Task
- `bulkUpdate(input)` → void
- `getById(id)` → Task
- `list(filters?)` → Task[]
- `getSubTasks(parentId)` → Task[]
- `getCompletionSummary(parentId)` → TaskCompletionSummary
- `assign(input)` / `unassign(taskId, userId)` / `getAssignees(taskId)`
- `getLoggedHours(taskId)` → number

**Relationships**:
- Belongs to `Project` (N:1)
- Has one `TaskStatus` (N:1)
- Optionally has one `TaskType` (N:1)
- Self-referential: `parentId` for sub-tasks (max 3 levels)
- Has many `TaskAssignee` (1:N)
- Has many `TaskComment` (1:N, threaded via `parentId`)
- Has many `TaskLink` (1:N, as source or target)
- Has many `TimeEntry` (1:N)
- Has many `TaskReminder` (1:N)
- Has many `TaskWatcher` (1:N)
- Has many `ActivityLog` (1:N)
- Has many `TaskAttachment` (1:N)

### Drive Folder (Aggregate Root)

**Identity**: `id` (text, UUID, default `uuidv7()`)

**Invariants**:
- `path` must be unique (hierarchical, e.g., `/Projects/2024`)
- Max nesting depth configurable (default 20)
- No circular parent references (cycle detection via `PathService`)
- Name uniqueness within parent (case-insensitive)
- `isTrashed` is a soft-delete flag

**Lifecycle commands**:
- `create(input)` → Folder
- `rename(id, input)` → Folder (cascades path updates to descendants)
- `move(id, input)` → Folder (cascades path updates)
- `update(id, input)` → Folder
- `delete(id, force?)` → void (soft-delete; refuses non-empty unless `force`)
- `restore(id)` → Folder
- `getById(id)` / `get(id)` → Folder (with metadata)
- `list(id?, opts?)` → `{ files, folders, sortBy, sortOrder }`

**Relationships**:
- Self-referential: `parentId` for hierarchy
- Has many `DriveFile` (1:N)
- Has many sub-folders (1:N)

### Drive File (Aggregate Root)

**Identity**: `id` (text, UUID, default `uuidv7()`)

**Invariants**:
- `path` must be unique
- `version` increments on update (old version preserved as `FileVersion`)
- `storageKey` references S3 object
- `isTrashed` is a soft-delete flag
- Max versions retained (configurable, default 10; old versions pruned)

**Lifecycle commands**:
- `upload(input)` → File
- `download(id, userId, options?)` → Buffer
- `getById(id)` / `get(id)` → File
- `update(id, input)` → File (creates new version)
- `delete(id)` → void (soft-delete)
- `restore(id)` → File
- `move(id, input)` → File
- `rename(id, input)` → File
- `listVersions(id)` → FileVersion[]
- `getDownloadLink(id, options?)` → string (signed URL)
- `copy(id, destFolderId?)` → File
- `purge(id)` → void (hard-delete: removes storage + DB rows)

**Relationships**:
- Belongs to `DriveFolder` (N:1, via `folderId`)
- Has many `FileVersion` (1:N)
- Has many `ItemLabel` (polymorphic)
- Has many `Share` (polymorphic)
- Has many `PublicLink` (polymorphic)
- Has many `AccessLog` (polymorphic)

### Label (Aggregate Root)

**Identity**: `id` (text, UUID, default `uuidv7()`)

**Invariants**:
- `isGlobal` labels have `ownerId = null`
- Non-global labels are owned by a user

**Lifecycle commands**:
- `create(input)` / `delete(id)` (cascades item labels)
- `apply(input)` / `remove(itemId, itemType, labelId)`
- `list(opts?)` / `listByLabel(labelId, opts?)` → `{ files, folders }`

### Employee (Aggregate Root — HR)

**Identity**: `id` (text, UUID, default `uuidv7()`)

**Invariants**:
- `employeeId` must be unique
- `status` controls lifecycle (active → inactive → left)
- `reportsTo` forms an organizational chart (hierarchical)

**Lifecycle commands** (via `EmployeeWorkflow`):
- `create(input)` / `update(id, patch)` / `getById(id)` / `getByEmployeeId(id)` / `list(filters?)`
- `deactivate(id)` / `activate(id)` / `markAsLeft(id)`
- `getOrganizationalChart()` → EmployeeTreeNode[]
- Employee group management (create, update, delete, add/remove members)
- Health insurance management (create, update, delete)
- Skill map management (create, update, delete)

**Note**: HR workflows are wired to the module class via `$initialize()`. The module is partially conformant — it has `$name`, `static create()`, `$prepareInfra()`, and `$cleanup()` but does not declare `implements Module` and lacks `$prepareRuntime()`.

### Tenant (Aggregate Root — Management Plane)

**Identity**: `id` (text, PK — shares ID with better-auth Organization row)

**Value objects**:
- `TenantStatus` — enum: `onboarding`, `active`, `suspended`, `churned`

**Invariants**:
- Status transitions: `onboarding` → `active` → `suspended` ↔ `active` → `churned`
- `suspendedAt`/`suspendedReason` set when suspended; `churnedAt`/`churnReason` set when churned
- At most one active Service Provider assignment (`serviceProviderId`)
- Database connection params (`databaseHost`, `databaseName`, `databasePort`, `databaseUser`, `databasePassword`, `databaseSsl`) record the per-tenant DB connection

**Lifecycle commands** (via `TenantWorkflow`):
- `onboard(input)` → provisions a new tenant (creates better-auth org, calls `dbUnit.provisionTenant()` which creates DB + pushes schemas, seeds profile via `dbUnit.seedTenantDb()`, records tenant row, writes audit entry, publishes event)
- `get(id)` → Tenant (joins `organization` + `tenant` tables)
- `list(filters?)` → Tenant[]
- `update(id, { profile?, companion? })` → Tenant

**Relationships**:
- 1:1 with better-auth Organization (shares ID)
- N:1 with ServiceProvider (`serviceProviderId`)

### ServiceProvider (Aggregate Root — Management Plane)

**Identity**: `id` (text, PK, `default uuidv7()`)

**Value objects**:
- `SpStatus` — enum: `active`, `inactive`

**Invariants**:
- `slug` must be unique
- Status can be toggled active/inactive

**Lifecycle commands** (via `ServiceProviderWorkflow`):
- `create(input)` → ServiceProvider
- `get(id)` → ServiceProvider
- `list(filters?)` → ServiceProvider[]
- `update(id, patch)` → ServiceProvider
- `activate(id)` / `deactivate(id)` → ServiceProvider
- `getAssignedTenants(spId)` → Tenant[]
- `getUsers(spId)` → User[]

### PlatformUser (Aggregate Root — Management Plane)

**Identity**: `id` (text, PK — better-auth `user` table ID)

**Invariants**:
- If `role = 'sp_user'`, `spId` must be set (FK to ServiceProvider)
- If `role != 'sp_user'`, `spId` must NOT be set
- Created/deleted via `AuthUnit.user` API (better-auth), with `spId` managed on the `user` table directly

**Lifecycle commands** (via `PlatformUserWorkflow`):
- `create(input)` → User (delegates to `auth.api.createUser()`, sets `spId` if SP user)
- `get(id)` → User
- `list(filters?)` → User[]
- `update(id, patch)` → User (delegates name/role to `auth.user.update()`, sets `spId` directly)
- `delete(id)` → void (delegates to `auth.user.remove()`)
- `assignRole(id, role)` → void (delegates to `auth.user.role.assign()`)
- `assignToServiceProvider(userId, spId)` → void (sets `role='sp_user'` + `spId`)

### AuditLog (Entity — append-only, Platform Core)

**Identity**: `id` (text, PK, `default uuidv7()`)

**Invariants**:
- Append-only (no updates/deletes)
- `seq bigserial` provides deterministic replay order
- `idempotency_key` with partial unique index `UNIQUE(tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL` — retries with the same key no-op
- `entityType` is open text (per-module constants, not a DB enum)
- `action` is open text (per-module constants, not a DB enum)
- `crudAction` is one of: `create`, `update`, `delete` (nullable — not all actions are CRUD)
- `actorId` defaults to `"system"` when context has no actor (known gap: `context.actorId` is never populated by the framework)
- `workflowRunId` is optional provenance — links to `workflow_runs.id` but is NOT a replay handle
- Written by the platform's `AuditUnit` via `ctx.audit.write(entry, tx?)` — the optional `tx` handle provides transactional atomicity with the mutation

**Relationships**:
- Optionally links to `WorkflowRun` via `workflowRunId` (provenance only)

### AuditLog (Entity — append-only, Management Plane)

**Identity**: `id` (text, PK, `default uuidv7()`)

**Invariants**:
- Append-only (no updates/deletes)
- Lives in the platform's `audit_log` table (NOT a management-owned table)
- `entityType` is one of: `tenant`, `serviceProvider`, `platformUser`
- `action` is one of 17 defined audit actions (e.g., `tenant_provisioned`, `sp_created`, `platform_user_updated`, `role_assigned`) — defined as `as const` constants in `management/src/utils/constants.ts`
- Written inline in each management workflow via `ctx.audit.write(...)` (NOT via a shared `logAuditStep`)
- Polymorphic: `entityType` + `entityId` references any management entity

### FileMetadata (Aggregate Root — Framework Storage)

**Identity**: `id` (text, UUID, default `uuidv7()`)

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

**Identity**: `id` (text, UUID, default `uuidv7()`)

**Invariants**:
- Append-only (no updates/deletes from application)
- Level priority: debug(0) < info(1) < warn(2) < error(3) < fatal(4)

### KVEntry (Entity)

**Identity**: `key` (text, PK)

**Invariants**:
- Expired entries are lazily evicted on read
- Table is `UNLOGGED` (no WAL — performance over durability)

## Domain Events

### Auth Events (AuthEventMap) — 9 events

| Event | Payload | Trigger |
|---|---|---|
| `user:created` | `{ user: User }` | User created |
| `user:updated` | `{ user: User }` | User updated |
| `user:deleted` | `{ userId: string }` | User deleted |
| `session:created` | `{ session: Session, user: User }` | Session authenticated |
| `session:invalidated` | `{ sessionId: string }` | Session invalidated |
| `role:assigned` | `{ roleName: string, userId: string }` | Role assigned to user |
| `role:unassigned` | `{ userId: string }` | Role unassigned (note: missing `roleName` — known gap) |
| `role:created` | `{ role: RoleData }` | Role created |
| `role:deleted` | `{ roleName: string }` | Role deleted |

### Organization Events (OrganizationDomainEventMap) — 11 events

| Event | Payload | Trigger |
|---|---|---|
| `organization:updated` | `{ changes: Record<string, unknown>, organization: { id, name, slug } }` | Organization updated |
| `organization:branding_updated` | `{ logo?: string, accentColor?: string, name?: string }` | Branding changed |
| `branch:created` | `{ branch: { code, id, name, type } }` | Branch created |
| `branch:updated` | `{ branch: { id, name }, changes: Record<string, unknown> }` | Branch updated |
| `branch:activated` | `{ branchId: string }` | Branch activated |
| `branch:deactivated` | `{ branchId: string }` | Branch deactivated |
| `branch:closed` | `{ branchId: string, date: string }` | Branch closed |
| `connection:created` | `{ connection: { id, name, type } }` | Connection created |
| `connection:updated` | `{ connection: { id, name }, changes: Record<string, unknown> }` | Connection updated |
| `connection:status_changed` | `{ connectionId, fromStatus, toStatus }` | Connection status changed |
| `connection:note_added` | `{ connectionId, note: { content, id, type } }` | Note added to connection |

### Compliance Events (ComplianceEventMap) — 23 events

| Event | Payload | Trigger |
|---|---|---|
| `compliance:document_created` | `{ document: { category, id, name } }` | Document created |
| `compliance:document_updated` | `{ changes, document: { id, name } }` | Document updated |
| `compliance:document_submitted` | `{ documentId, submittedBy }` | Document submitted for review |
| `compliance:document_verified` | `{ category, documentId, sourceEntityId, sourceModule, verifiedBy }` | Document verified |
| `compliance:document_rejected` | `{ category, documentId, reason, rejectedBy, sourceEntityId, sourceModule }` | Document rejected |
| `compliance:document_expiring` | `{ daysUntilExpiry, documentId, sourceEntityId, sourceModule }` | Expiry notification |
| `compliance:document_due` | `{ daysUntilDue, documentId, sourceEntityId, sourceModule }` | Due date notification |
| `compliance:document_expired` | `{ category, documentId, sourceEntityId, sourceModule }` | Document expired |
| `compliance:document_overdue` | `{ category, daysOverdue, documentId, sourceEntityId, sourceModule }` | Document past due |
| `compliance:document_completed` | `{ completedAt, documentId, referenceNumber, sourceEntityId, sourceModule }` | Document completed |
| `compliance:document_escalated` | `{ daysSinceExpiry, documentId, escalationLevel }` | Escalation threshold reached |
| `compliance:document_renewed` | `{ newDocumentId, oldDocumentId }` | Document renewed (old archived, new created) |
| `compliance:document_archived` | `{ documentId }` | Document archived |
| `compliance:document_reviewer_assigned` | `{ documentId, reviewerId }` | Reviewer assigned |
| `compliance:document_attachment_uploaded` | `{ documentId, storageKey }` | Attachment uploaded |
| `compliance:document_snoozed` | `{ documentId, snoozedBy, snoozedUntil }` | Document snoozed |
| `compliance:document_generated` | `{ documentId, obligationId, sourceModule }` | Auto-generated from obligation |
| `compliance:obligation_created` | `{ obligation: { category, id, name } }` | Obligation created |
| `compliance:obligation_activated` | `{ obligationId }` | Obligation activated |
| `compliance:obligation_deactivated` | `{ obligationId }` | Obligation deactivated |
| `compliance:obligation_updated` | `{ changes, obligation: { id, name } }` | Obligation updated |
| `compliance:weekly_summary` | `{ summary: { activeObligations, documentsGenerated30d, expired, expiringSoon, overdue, total, verified } }` | Weekly dashboard summary |
| `compliance:scheduled_job_executed` | `{ errors, executionTime, jobName, recordsProcessed }` | Scheduled job completed |

### Tasks Events (TaskDomainEventMap) — 10 events

| Event | Payload | Trigger |
|---|---|---|
| `task:created` | `{ task: { id, number, projectId, title } }` | Task created |
| `task:updated` | `{ task: { id, title }, changes: Record<string, unknown> }` | Task updated |
| `task:deleted` | `{ taskId: string }` | Task deleted |
| `task:status_changed` | `{ task: { id, title }, fromStatus, toStatus }` | Task status changed |
| `task:assigned` | `{ taskId, userId, assignedBy }` | User assigned to task |
| `task:unassigned` | `{ taskId, userId }` | User unassigned from task |
| `task:linked` | `{ sourceId, targetId, linkType }` | Task link created |
| `task:unlinked` | `{ sourceId, targetId }` | Task link removed |
| `task:commented` | `{ taskId, comment: { id, body } }` | Comment added |
| `reminder:fired` | `{ taskId, reminder: { id, type, userId } }` | Reminder fired |

### Drive Events (DriveEventMap) — 14 events

| Event | Payload | Trigger |
|---|---|---|
| `drive:folder_created` | `{ folder: { id, name, ownerId, parentId, path } }` | Folder created |
| `drive:folder_renamed` | `{ folder: { id, name, path }, oldName }` | Folder renamed |
| `drive:moved` | `{ item: { id, name, path }, itemType, newPath, oldPath }` | File or folder moved |
| `drive:file_uploaded` | `{ file: { contentType, etag, folderId, id, name, ownerId, path, size, storageKey, version } }` | File uploaded |
| `drive:file_updated` | `{ file: { contentType, etag, id, name, ownerId, path, size, storageKey, version }, previousVersion }` | File updated (new version) |
| `drive:file_downloaded` | `{ file: { id, name, ownerId }, userId }` | File downloaded |
| `drive:shared` | `{ share: { createdAt, granteeId, granteeType, id, itemId, itemType, permission, sharedBy } }` | Item shared |
| `drive:unshared` | `{ itemId, shareId }` | Share removed |
| `drive:public_link_created` | `{ publicLink: { createdBy, id, itemId, itemType, permission, token } }` | Public link created |
| `drive:public_link_accessed` | `{ ip, publicLink: { id, itemId, token }, userAgent }` | Public link accessed |
| `drive:public_link_revoked` | `{ itemId, publicLinkId }` | Public link revoked |
| `drive:trashed` | `{ itemId, itemType }` | Item moved to trash |
| `drive:restored` | `{ itemId, itemType }` | Item restored from trash |
| `drive:purged` | `{ itemId, itemType, storageKey }` | Item permanently deleted |

### HR Events — 43 events

The HR module defines 43 events across 8 event groups, combined into `HrEventMap`:

| Group | Count | Events |
|---|---|---|
| Employee | 4 | `employee:created`, `employee:updated`, `employee:status_changed`, `employee:group_created` |
| Attendance | 5 | `attendance:created`, `attendance:checkin_created`, `attendance:request_created`, `attendance:request_approved`, `attendance:request_rejected` |
| Leave | 6 | `leave:application_submitted`, `leave:application_approved`, `leave:application_rejected`, `leave:application_cancelled`, `leave:allocation_created`, `leave:encashment_requested` |
| Lifecycle | 9 | `lifecycle:onboarding_started`, `lifecycle:onboarding_completed`, `lifecycle:promotion_requested`, `lifecycle:promotion_approved`, `lifecycle:transfer_requested`, `lifecycle:transfer_approved`, `lifecycle:separation_initiated`, `lifecycle:separation_completed`, `lifecycle:exit_interview_scheduled` |
| Overtime | 3 | `overtime:slip_created`, `overtime:slip_approved`, `overtime:slip_rejected` |
| Setup | 4 | `setup:department_created`, `setup:designation_created`, `setup:holiday_list_created`, `setup:settings_updated` |
| Shift | 4 | `shift:assignment_created`, `shift:request_created`, `shift:request_approved`, `shift:request_rejected` |
| Access | 8 | `access:user_created`, `access:user_activated`, `access:user_deactivated`, `access:role_created`, `access:role_assigned`, `access:role_revoked`, `access:branch_access_granted`, `access:branch_access_revoked` |

### Management Plane Events (ManagementPlaneEventMap) — 16 events

#### Tenant Events (8)

| Event | Payload | Trigger |
|---|---|---|
| `tenant:provisioned` | `{ tenantId, serviceProviderId? }` | Tenant provisioned (DB created, schemas pushed, profile seeded) |
| `tenant:activated` | `{ tenantId }` | Tenant activated (from onboarding/suspended) |
| `tenant:suspended` | `{ tenantId, reason }` | Tenant suspended |
| `tenant:reactivated` | `{ tenantId }` | Tenant reactivated from suspended |
| `tenant:churned` | `{ tenantId, reason }` | Tenant churned (offboarded) |
| `tenant:profile_updated` | `{ tenantId, changes }` | Tenant profile updated |
| `tenant:sp_assigned` | `{ tenantId, serviceProviderId }` | Service Provider assigned to tenant |
| `tenant:sp_unassigned` | `{ tenantId }` | Service Provider unassigned from tenant |

#### Service Provider Events (4)

| Event | Payload | Trigger |
|---|---|---|
| `service_provider:created` | `{ serviceProvider: { id, name, slug } }` | Service Provider created |
| `service_provider:updated` | `{ serviceProvider: { id, name }, changes }` | Service Provider updated |
| `service_provider:deactivated` | `{ serviceProviderId }` | Service Provider deactivated |
| `service_provider:activated` | `{ serviceProviderId }` | Service Provider activated |

#### Platform User Events (4)

| Event | Payload | Trigger |
|---|---|---|
| `platform_user:created` | `{ user: { id, email, role } }` | Platform user created |
| `platform_user:updated` | `{ userId, changes }` | Platform user updated |
| `platform_user:deleted` | `{ userId }` | Platform user deleted |
| `platform_user:role_assigned` | `{ userId, role }` | Role assigned to platform user |

### Not Yet Defined (Gaps)

- File events (framework storage): `file:uploaded`, `file:deleted`, `file:archived`
- Log events: `log:error-threshold-exceeded`
- KV events: (none expected — cache operations are internal)

## Command-Query Separation

### Commands (Write Side)

| Context | Command | Method |
|---|---|---|
| Auth | Create user | `auth.user.create()` |
| Auth | Delete user | `auth.user.remove()` |
| Auth | Update user | `auth.user.update()` |
| Auth | Assign role | `auth.user.role.assign()` |
| Auth | Unassign role | `auth.user.role.unassign()` |
| Auth | Create session | `auth.session.create()` |
| Auth | Invalidate session | `auth.session.invalidate()` |
| Auth | Delete role | `auth.role.remove()` |
| Storage | Upload file | `storage.upload()` |
| Storage | Delete file | `storage.remove()` |
| Storage | Archive file | `storage.archive()` |
| PubSub | Publish message | `pubsub.publish()` |
| PubSub | Subscribe | `pubsub.subscribe()` |
| KV | Set key | `kv.set()` |
| KV | Delete key | `kv.del()` |
| Organization | Create org | `p.organization.organizations.create()` |
| Organization | Update org | `p.organization.organizations.update()` |
| Organization | Update branding | `p.organization.organizations.updateBranding()` |
| Branch | Create branch | `p.organization.branches.create()` |
| Branch | Archive branch | `p.organization.branches.archive()` |
| Connection | Create connection | `p.organization.connections.create()` |
| Connection | Add contact | `p.organization.connections.addContact()` |
| Address | Create address | `p.organization.addresses.create()` |
| Bank Account | Create account | `p.organization.bankAccounts.create()` |
| Compliance | Create document | `p.compliance.documents.create()` |
| Compliance | Submit document | `p.compliance.documents.submit()` |
| Compliance | Verify document | `p.compliance.documents.verify()` |
| Compliance | Reject document | `p.compliance.documents.reject()` |
| Compliance | Renew document | `p.compliance.documents.renew()` |
| Compliance | Archive document | `p.compliance.documents.archive()` |
| Compliance | Snooze document | `p.compliance.documents.snooze()` |
| Compliance | Create obligation | `p.compliance.obligations.create()` |
| Compliance | Activate obligation | `p.compliance.obligations.activate()` |
| Compliance | Create verification rule | `p.compliance.verification.create()` |
| Tasks | Create task | `p.tasks.tasks.create()` |
| Tasks | Update task | `p.tasks.tasks.update()` |
| Tasks | Archive task | `p.tasks.tasks.archive()` |
| Tasks | Assign task | `p.tasks.tasks.assign()` |
| Tasks | Create project | `p.tasks.projects.create()` |
| Tasks | Archive project | `p.tasks.projects.archive()` |
| Tasks | Create comment | `p.tasks.comments.create()` |
| Tasks | Create link | `p.tasks.links.create()` |
| Tasks | Log time | `p.tasks.timeEntries.create()` |
| Tasks | Create reminder | `p.tasks.reminders.create()` |
| Tasks | Create automation rule | `p.tasks.automation.create()` |
| Drive | Upload file | `p.drive.files.upload()` |
| Drive | Update file | `p.drive.files.update()` |
| Drive | Delete file | `p.drive.files.delete()` |
| Drive | Create folder | `p.drive.folders.create()` |
| Drive | Move item | `p.drive.files.move()` / `p.drive.folders.move()` |
| Drive | Share item | `p.drive.shares.create()` |
| Drive | Create public link | `p.drive.publicLinks.create()` |
| Drive | Trash item | `p.drive.files.delete()` / `p.drive.folders.delete()` |
| Drive | Restore item | `p.drive.trash.restore()` |
| Drive | Empty trash | `p.drive.trash.emptyTrash()` |
| Drive | Apply label | `p.drive.labels.apply()` |
| Management Plane | Onboard tenant | `p.management.tenants.onboard()` |
| Management Plane | Update tenant | `p.management.tenants.update()` |
| Management Plane | Create SP | `p.management.serviceProviders.create()` |
| Management Plane | Update SP | `p.management.serviceProviders.update()` |
| Management Plane | Activate SP | `p.management.serviceProviders.activate()` |
| Management Plane | Deactivate SP | `p.management.serviceProviders.deactivate()` |
| Management Plane | Create platform user | `p.management.users.create()` |
| Management Plane | Update platform user | `p.management.users.update()` |
| Management Plane | Delete platform user | `p.management.users.delete()` |
| Management Plane | Assign role | `p.management.users.assignRole()` |
| Management Plane | Assign user to SP | `p.management.users.assignToServiceProvider()` |

### Queries (Read Side)

| Context | Query | Method |
|---|---|---|
| Auth | Get user by ID | `auth.user.get({ id })` |
| Auth | Get user by email | `auth.user.get({ email })` |
| Auth | Validate session | `auth.session.validate()` |
| Auth | List roles | `auth.role.list()` |
| Storage | Get signed URL | `storage.getSignedGetUrl()` |
| Storage | List files | `storage.list()` |
| Storage | Get metadata | `storage.getMetadata()` |
| Logs | Query logs | `logs.query()` |
| Logs | Get stats | `logs.getStats()` |
| KV | Get key | `kv.get()` |
| KV | Check exists | `kv.exists()` |
| PubSub | Get queue size | `pubsub.getQueueSize()` |
| PubSub | List produced-but-unsubscribed topics | `pubsub.getUnsubscribedProducedTopics()` |
| Platform | Health check | `p.healthCheck()` |
| Organization | Get org | `p.organization.organizations.get()` |
| Branch | List branches | `p.organization.branches.list()` |
| Branch | Get tree | `p.organization.branches.getTree()` |
| Connection | Search | `p.organization.connections.search()` |
| Connection | List contacts | `p.organization.connections.listContacts()` |
| Address | List addresses | `p.organization.addresses.list()` |
| Bank Account | List accounts | `p.organization.bankAccounts.list()` |
| Compliance | Get by ID | `p.compliance.documents.getById()` |
| Compliance | List documents | `p.compliance.documents.list()` |
| Compliance | Get expiring | `p.compliance.documents.getExpiring()` |
| Compliance | Get due soon | `p.compliance.documents.getDueSoon()` |
| Compliance | Get expired | `p.compliance.documents.getExpired()` |
| Compliance | Get overdue | `p.compliance.documents.getOverdue()` |
| Compliance | Get renewal chain | `p.compliance.documents.getRenewalChain()` |
| Compliance | Get timeline | `p.compliance.documents.getTimeline()` |
| Compliance | Get dashboard summary | `p.compliance.dashboard.getSummary()` |
| Compliance | Get audit trail | `p.compliance.audit.getAuditTrail()` |
| Compliance | List obligations | `p.compliance.obligations.list()` |
| Compliance | List verification rules | `p.compliance.verification.list()` |
| Tasks | Get task | `p.tasks.tasks.getById()` |
| Tasks | List tasks | `p.tasks.tasks.list()` |
| Tasks | Get sub-tasks | `p.tasks.tasks.getSubTasks()` |
| Tasks | Get completion summary | `p.tasks.tasks.getCompletionSummary()` |
| Tasks | List project members | `p.tasks.projects.listMembers()` |
| Tasks | Get dependency graph | `p.tasks.links.getDependencyGraph()` |
| Tasks | Get critical path | `p.tasks.links.getCriticalPath()` |
| Tasks | Topological sort | `p.tasks.links.topologicalSort()` |
| Tasks | Task summary report | `p.tasks.reports.getTaskSummary()` |
| Tasks | Workload report | `p.tasks.reports.getWorkloadReport()` |
| Tasks | Time report | `p.tasks.reports.getTimeReport()` |
| Tasks | Cumulative flow | `p.tasks.reports.getCumulativeFlow()` |
| Drive | Get file | `p.drive.files.getById()` |
| Drive | List folder | `p.drive.folders.list()` |
| Drive | Get folder metadata | `p.drive.folders.get()` |
| Drive | List file versions | `p.drive.files.listVersions()` |
| Drive | Get download link | `p.drive.files.getDownloadLink()` |
| Drive | Search | `p.drive.search.search()` |
| Drive | List shares | `p.drive.shares.list()` |
| Drive | List shared with me | `p.drive.shares.listSharedWithMe()` |
| Drive | List trash | `p.drive.trash.list()` |
| Drive | List labels | `p.drive.labels.list()` |
| Drive | Get breadcrumbs | `p.drive.paths.getBreadcrumbs()` |
| Management Plane | Get tenant | `p.management.tenants.get()` |
| Management Plane | List tenants | `p.management.tenants.list()` |
| Management Plane | Get SP | `p.management.serviceProviders.get()` |
| Management Plane | List SPs | `p.management.serviceProviders.list()` |
| Management Plane | Get SP assigned tenants | `p.management.serviceProviders.getAssignedTenants()` |
| Management Plane | Get SP users | `p.management.serviceProviders.getUsers()` |
| Management Plane | Get platform user | `p.management.users.get()` |
| Management Plane | List platform users | `p.management.users.list()` |

## Invariants & Business Rules

### Cross-Cutting

1. **All IDs are text** — either app-generated via `crypto.randomUUID()` or DB-generated via `uuidv7()`
2. **All timestamps are TIMESTAMPTZ** — `withTimezone: true` on all timestamp columns
3. **Cascade deletes** — User deletion cascades to sessions and accounts
4. **No barrel files** — explicit convention in CODING_CONVENTIONS.md
5. **No DB-level foreign keys in domain modules** — compliance, tasks, drive, organization, and management all use soft FKs (logical references by naming convention, not enforced by the database)

### Auth

6. **Email uniqueness** — enforced by DB unique constraint
7. **Session token uniqueness** — enforced by DB unique constraint
8. **Phone number uniqueness** — enforced by DB unique constraint (nullable)
9. **Username uniqueness** — enforced by DB unique constraint (nullable)
10. **Roles are strings** — stored as text on user table, not as separate entities

### Organization

11. **Slug uniqueness** — enforced by DB unique constraint on organization.slug
12. **Branch code uniqueness** — enforced by DB unique constraint on branch.code
13. **Single headquarters** — exactly one branch of type `headquarters` per organization (enforced in workflow)
14. **Branch hierarchy depth** — max 5 levels deep (enforced in workflow)
15. **No circular branch parents** — detected via recursive traversal in workflow

### Compliance

16. **Verification status derivation** — status is derived from dates + renewal state by `StatusDerivation` service, not set directly (except by explicit `updateStatus`)
17. **Renewal chain integrity** — renewing archives the old document and creates a new one linked via `renewedFrom`
18. **Reminder thresholds** — `reminderDays` array (default [90, 60, 30, 7]) controls when expiry notifications fire
19. **Escalation thresholds** — `escalationDays` array (default [1, 7, 30]) controls when escalations fire
20. **Obligation auto-generation** — active obligations with `autoGenerate=true` produce documents on their frequency schedule
21. **Idempotent document generation** — `ObligationGenerator` uses idempotency keys to prevent duplicate documents

### Tasks

22. **Project key uniqueness** — enforced by DB unique constraint
23. **Task number sequence** — `taskCounter` on project is incremented per task; display number is `KEY-seq`
24. **Task parent depth** — max 3 levels of nesting (enforced in workflow)
25. **No circular task parents** — cycle detection via recursive traversal
26. **Task link cycle detection** — creating a `blocks` link runs BFS cycle detection; throws on cycle
27. **Status transition rules** — `TaskStatusTransition` can constrain which status changes are allowed (optionally requiring a comment or role)
28. **Project deletion guard** — projects with existing tasks cannot be deleted (must archive first)

### Drive

29. **Path uniqueness** — folder and file paths must be unique (enforced by DB unique constraint)
30. **Path cascade** — moving/renaming a folder updates all descendant paths
31. **Max nesting depth** — configurable (default 20); enforced by `PathService`
32. **Name uniqueness within parent** — case-insensitive uniqueness check
33. **No circular folder parents** — cycle detection via `PathService.wouldCreateCycle()`
34. **Version pruning** — old file versions pruned based on `maxVersions` (default 10)
35. **Permission inheritance** — `AccessService.getEffectivePermission()` walks up the parent folder chain for inherited permissions
36. **Trash retention** — trashed items are purged after `trashRetentionDays` (default 30) via scheduled cron
37. **Public link validation** — token, expiry, maxViews, and password (bcrypt) are checked on access

### Storage

38. **Key uniqueness** — enforced by DB unique constraint on file_metadata.key
39. **Archive immutability** — archived files get new key, original marked as archived

### KV Store

40. **Lazy TTL eviction** — expired entries deleted on read, not by background job
41. **UNLOGGED table** — data lost on Postgres crash (by design — cache semantics)

### Management Plane

42. **SP slug uniqueness** — enforced by DB unique constraint on service_provider.slug
43. **SP user requires spId** — if `role = 'sp_user'`, `spId` must be set; otherwise `spId` must NOT be set (enforced in workflow)
44. **Tenant status transitions** — `onboarding` → `active` → `suspended` ↔ `active` → `churned` (enforced in workflow)
45. **Audit log append-only** — no updates or deletes; written via platform `ctx.audit.write(...)` inline in each workflow (the platform's `audit_log` table, not a module-local table)
46. **Tenant-Organization ID sharing** — tenant companion table ID = better-auth organization ID (1:1 relationship)
47. **Provisioning idempotency** — `CREATE DATABASE` catches "already exists" errors and continues

## Anti-Patterns to Avoid

1. **Don't create barrel files** unless explicitly told
2. **Don't use native UUID columns** — always text
3. **Don't use `timestamp without time zone`** — always `withTimezone: true`
4. **Don't call `create()` then try to register more modules** — pass all modules to `Platform.create()` at once
5. **Don't assume dedicated role/permission tables** — roles are text on user table
6. **Don't add DB-level foreign key constraints in domain modules** — use soft FKs (logical references by naming convention)
7. **Don't set compliance verification status directly** — use the lifecycle commands (submit, verify, reject, etc.) or `updateStatus`
