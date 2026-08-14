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

┌──────────────────────────────────────────────────────────────────────┐
│                       DMS DOMAIN                                     │
│                                                                      │
│  Single `file` entity — filesystem + records consolidated:           │
│                                                                      │
│  ┌─────────────────┐   1:N    ┌─────────────────────┐                │
│  │      File       │─────────→│    FileVersion      │                │
│  │ id              │          │ id                  │                │
│  │ status (enum:   │          │ fileId (FK)         │                │
│  │  triaged/active/│          │ version             │                │
│  │  expired/trashed)│         │ storageKey          │                │
│  │ version         │          │ size / etag         │                │
│  │ folderId / path │          └─────────────────────┘                │
│  │ classId (soft   │                                                 │
│  │  FK → Class)    │                                                 │
│  │ fieldValues     │                                                 │
│  │ expiryDate      │                                                 │
│  │ storageKey      │                                                 │
│  │ docNumber       │                                                 │
│  └───────┬─────────┘                                                 │
│          │ N:1                                                       │
│          ▼                                                           │
│  ┌─────────────────┐   1:N    ┌─────────────────────┐                │
│  │      Class      │─────────→│    ClassField       │                │
│  │ id              │          │ id                  │                │
│  │ name            │          │ classId (FK)        │                │
│  │ retentionDays   │          │ type (enum)         │                │
│  │ namingSchema    │          │ required / default  │                │
│  │ (archived, not  │          └─────────────────────┘                │
│  │  hard-deleted)  │                                                 │
│  └─────────────────┘                                                 │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │   Label      │  │   Contact    │  │  LegalHold   │                │
│  │ id           │  │ id           │  │ id           │                │
│  │ name/color   │  │ name / email │  │ fileId       │                │
│  │ isGlobal     │  │ phone/design.│  │ reason       │                │
│  │ ownerId      │  └──────────────┘  └──────────────┘                │
│  └──────────────┘                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │  FileView    │  │   Pin        │  │   Setting    │                │
│  │ id           │  │ id           │  │ key / value  │                │
│  │ name/filters │  │ itemType     │  └──────────────┘                │
│  │ isShared     │  │ (triage/     │                                  │
│  │ isDefault    │  │  file_view/  │                                  │
│  └──────────────┘  │  class)      │                                  │
│                    └──────────────┘                                  │
│                                                                      │
│  Folder tree — containers with materialized paths:                   │
│                                                                      │
│  ┌──────────────┐──self──┐                                           │
│  │   Folder     │        │ parentId                                  │
│  │ id           │        ▼                                           │
│  │ name         │  (path materialized, depth ≤ 20)                   │
│  │ path (uniq)  │──1:N──┌──────────────┐                             │
│  │ ownerId      │       │    File      │                             │
│  │ isTrashed    │       │ (folderId,   │                             │
│  └──────────────┘       │  path, in a  │                             │
│  ┌──────────────┐       │  folder ⇒    │                             │
│  │ EntityLabel  │       │  active)     │                             │
│  │ entityId     │       └──────────────┘                             │
│  │ entityType   │       (labels apply to file or folder)             │
│  │ labelId (FK) │                                                    │
│  └──────────────┘                                                    │
│  ┌──────────────┐    ┌──────────────┐                                │
│  │    Share     │    │ PublicLink   │  (file or folder entity)       │
│  │ entityId     │    │ entityId     │                                │
│  │ entityType   │    │ entityType   │                                │
│  │ granteeId    │    │ token (uniq)  │                               │
│  │ granteeType  │    │ permission   │                                │
│  │  (user/group/│    │ password     │                                │
│  │   contact)   │    │ maxViews     │                                │
│  │ permission   │    │ viewCount    │                                │
│  │ sharedBy     │    └──────────────┘                                │
│  │ expiresAt    │                                                    │
│  └──────────────┘                                                    │
│  ┌──────────────┐    (file or folder entity)                         │
│  │ AccessLog    │──polymorphic (entityId, entityType)                │
│  │ accessedBy   │                                                    │
│  │ action       │                                                    │
│  │ ip           │                                                    │
│  │ userAgent    │                                                    │
│  │ publicLinkId │                                                    │
│  └──────────────┘                                                    │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     STORAGE DOMAIN                                    │
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
│  (regular pgTable — NOT UNLOGGED)                                    │
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
│                        HR DOMAIN (50 tables, 8 sub-domains)         │
│                                                                     │
│  Employee ←─ 1:N ─→ Attendance, Leave, Lifecycle, Overtime, Shift   │
│  Setup: Department, Designation, EmploymentType, Grade, HolidayList │
│  Access: HR Users, Roles, Permissions, Branch-wise Access           │
│  (Module fully conformant — `implements Module`, `$prepareRuntime()`│
│   schedules DAILY_ATTENDANCE_SYNC + DAILY_LEAVE_ACCRUAL crons)      │
│  Tables: 50 (14 control-plane, 36 tenant)                           │
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
│  │  logo             │       │  ServiceProviderUser  │                │
│  │  metadata         │       │  id (PK)              │                │
│  └──────────────────┘       │  userId (FK→User)     │                │
│                              │  serviceProviderId    │                │
│                              │    (FK→ServiceProvider)│               │
│                              │  (1:1 join, no spId    │               │
│                              │   column on user)      │               │
│                              └──────────┬───────────┘                │
│                                         │ 1:N                        │
│                                         ▼                            │
│  Owned tables (control_plane):   ServiceProvider                      │
│    tenant, service_provider,                                         │
│    service_provider_user                                             │
│  Shadow tables (tenant):   (none — tenant_schemas is empty)          │
│                                                                       │
│  Roles: platform_admin, sp_user, tenant_admin, tenant_user             │
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

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)` — the `uuidv7` JS function)

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

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)` — the `uuidv7` JS function)

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

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)` — the `uuidv7` JS function)

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

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)` — the `uuidv7` JS function)

**Lifecycle commands**:

- `create(input)` → Address
- `update(id, input)` → Address
- `delete(id)` → void
- `setPrimary(id)` → Address
- `unsetPrimary(id)` → Address
- `list(filters?)` → Address[]

### Bank Account (Aggregate Root)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)` — the `uuidv7` JS function)

**Lifecycle commands**:

- `create(input)` → BankAccount
- `update(id, input)` → BankAccount
- `delete(id)` → void
- `setPrimary(id)` → BankAccount
- `activate(id)` / `deactivate(id)` → BankAccount
- `list(filters?)` → BankAccount[]

### Compliance Document (Aggregate Root)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)` — the `uuidv7` JS function)

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

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)` — the `uuidv7` JS function)

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

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)` — the `uuidv7` JS function)

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

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)` — the `uuidv7` JS function)

**Note**: Compliance audit entries are written to the platform's `audit_log` table via `ctx.audit.write(...)` and queried via `ctx.audit.query(...)`. There is no module-local `compliance_audit_entry` table. The `AuditWorkflow` (`compliance/src/workflows/audit.ts`) provides `getAuditTrail`, `list`, and `export` by querying the platform audit log.

**Invariants**:

- Append-only (no updates/deletes)
- Polymorphic: `entityType` + `entityId` references any compliance entity
- `action` is one of 18 defined audit actions (module-local constants)

### Project (Aggregate Root)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)` — the `uuidv7` JS function)

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

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)` — the `uuidv7` JS function)

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

### Document (Aggregate Root — DMS)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)` — the `uuidv7` JS function)

**Value objects**:

- `DocumentStatus` — enum: `triaged`, `active`, `expired`, `deleted`
- `FieldType` — enum: text, number, date, select, multi-select, boolean, user, contact, url, email, phone
- `GranteeType` — enum: contact, user
- `SharePermission` — enum: viewer, editor

**Invariants**:

- A Document never enters the active set directly — it always lands in `triaged` and exits only via `classify()` (→ `active`)
- `classify` validates the class's required fields and may apply the class file-naming schema (metadata-only rename, never an S3 move)
- Storage keys are version-bound: `dms/{tenant}/{documentId}/v{n}/{name}`
- Pruning retains `maxVersions` (default 10); skipped while a Legal Hold is active
- Permanent deletion (Recycle Bin) is **admin-only** and blocked by an active Legal Hold

**Lifecycle commands** (via `p.dms.documents`, `p.dms.triage`, `p.dms.versions`):

- `upload(input)` / `uploadBulk(input)` → Document (status `triaged`)
- `triage.classify(id, { classId, fieldValues })` → Document (→ `active`)
- `update(id, patch)` / `delete(id)` (soft) / `restore(id)` / `download(id)`
- `addMetadata` / `removeMetadata` / `tag` / `untag`
- `version.new(id, input)` → DocumentVersion / `version.revert(id, versionId)` / `version.delete` / `version.getCurrent` / `version.list`
- `bin.list` / `bin.restore` / `bin.empty` / `bin.deletePermanently` (admin-only, hold-aware)
- `holds.place(id, { reason })` / `holds.release(id)` / `holds.list`
- `share.create(id, { grantee, permission })` / `share.resolveToken` / `share.update` / `share.remove` / `share.list` / `share.listByGrantee`
- `view.apply` / `view.create` / `view.setDefault` / `view.pin` / `search.quick` / `search.search` / `search.promoteToView`

**Relationships**:

- Optionally belongs to `DocumentClass` (N:1, via `classId` — soft FK)
- Has many `DocumentVersion` (1:N)
- Has many `Tag` (N:M via `dms_document_tag`)
- Has many `Share` (1:N)
- Optionally has one `LegalHold` (1:1)
- Activity projected from platform `audit_log` (not a DMS-owned table)

### Document Class (Aggregate Root — DMS)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)` — the `uuidv7` JS function)

**Invariants**:

- Superseded classes are archived, not hard-deleted
- Class Fields carry typed validation; required fields must be satisfied before a Document can become active in the class
- Optional file-naming schema with field/date/sequence placeholders
- Optional per-class retention period (`retentionDays`)

**Lifecycle commands** (via `p.dms.classes`):

- `create(input)` / `get(id)` / `list(filters?)` / `update(id, patch)` / `archive(id)`
- `addField(input)` / `updateField(id, patch)` / `deactivateField(id)`

**Relationships**:

- Has many `ClassField` (1:N)
- Has many `Document` (1:N, soft FK)

### Item File / Folder (Aggregate Roots — DMS item filesystem)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)` — the `uuidv7` JS function)

**Invariants**:

- `path` must be unique (hierarchical, e.g., `/Projects/2024`); folders materialize paths with depth limits (default 20) and cycle-safe moves
- Files are S3-backed with versioning (`dms_file_version`); old versions pruned by `maxVersions`
- `isTrashed` is a soft-delete flag; item trash auto-purges after `trashRetentionDays` (default 30) via the `dms:item-auto-purge` cron
- Name uniqueness within parent (case-insensitive)

**Lifecycle commands** (via `p.dms.files`, `p.dms.folders`, `p.dms.trash`, `p.dms.labels`, `p.dms.publicLinks`, `p.dms.shares`, `p.dms.paths`, `p.dms.access`, `p.dms.archive`, `p.dms.storage`):

- `files.upload` / `copy` / `move` / `rename` / `update` / `get` / `getById` / `download` / `getDownloadLink` / `listVersions` / `purge` / `restore` / `delete`
- `folders.create` / `rename` / `move` / `update` / `get` / `getById` / `list` / `restore` / `delete`
- `trash.list` / `restore` / `purgeExpired` / `emptyTrash`
- `labels.apply` / `remove` / `list` / `listByLabel` / `create` / `delete`
- `publicLinks.create` / `update` / `revoke` / `resolve` / `get` / `list`
- `shares.create` / `update` / `remove` / `list` / `listSharedWithMe` / `get`
- `paths.getBreadcrumbs` / `computeFilePath` / `computeFolderPath` / `resolvePath` / `wouldCreateCycle` / `getSubtreeMaxDepth` / `checkNameUniqueness` / `getDepth` / `getFilePath` / `getFolderPath`
- `access.checkPermission` / `getEffectivePermission` / `isOwner` / `logAccess`
- `archive.createArchive` / `processArchiveJob`; `storage.upload` / `get` / `exists` / `copy` / `move` / `remove` / `getSignedGetUrl` / `computeStorageKey` / `computeArchiveKey`
- `driveSearch.search` (scope: all / my_files / shared_with_me)

**Relationships**:

- Folder is self-referential (`parentId`) for hierarchy; has many `File` (1:N)
- File belongs to `Folder` (N:1, via `folderId` — soft FK); has many `FileVersion` (1:N)
- Labels: `ItemLabel` polymorphic join (`itemId`/`itemType` file|folder)
- Shares / Public Links: polymorphic on `itemId`/`itemType`
- `AccessLog`: polymorphic access/download logging (public-link access, `logDownloads`)

### Label (Aggregate Root — DMS)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)` — the `uuidv7` JS function)

**Invariants**:

- `isGlobal` labels have `ownerId = null`
- Non-global labels are owned by a user
- Distinct from `Tag` (records system): labels apply to item files/folders via the polymorphic `ItemLabel` join

**Lifecycle commands**:

- `create(input)` / `delete(id)` (cascades item labels)
- `apply(input)` / `remove(itemId, itemType, labelId)`
- `list(opts?)` / `listByLabel(labelId, opts?)` → `{ files, folders }`

### Employee (Aggregate Root — HR)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)` — the `uuidv7` JS function)

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

**Note**: HR workflows are wired to the module class via `$initialize()`. The module is fully conformant — `implements Module`, `$name = "hr"`, `static create()`, `$prepareInfra()` (returns full `ModuleInfra`), `$prepareRuntime()` (schedules `DAILY_ATTENDANCE_SYNC` + `DAILY_LEAVE_ACCRUAL` crons) and `$cleanup()` (unschedules them). Workflow groups are exposed as `readonly` accessor objects (`access`, `attendance`, `employee`, `leave`, `lifecycle`, `overtime`, `setup`, `shift`), backed by per-action workflow files and per-group `barrel-*` barrels.

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

- SP membership is via a `service_provider_user` join row (1:1 user→SP), not an `spId` column on `user`
- If `role = 'sp_user'`, a `service_provider_user` row must exist
- If `role != 'sp_user'`, no `service_provider_user` row for that user
- Created/deleted via `AuthUnit.user` API (better-auth); the SP link is managed on `service_provider_user` in the control-plane DB

**Lifecycle commands** (via `PlatformUserWorkflow`):

- `create(input)` → User (delegates to `auth.api.createUser()`, inserts `service_provider_user` row if SP user)
- `get(id)` → User
- `list(filters?)` → User[] (leftJoin `service_provider_user` to surface `spId` = `serviceProviderId`)
- `update(id, patch)` → User (delegates name/role to `auth.user.update()`, manages `service_provider_user` row)
- `delete(id)` → void (delegates to `auth.user.remove()`, cascades the `service_provider_user` row)
- `assignRole(id, role)` → void (delegates to `auth.user.role.assign()`)
- `assignToServiceProvider(userId, spId)` → void (sets `role='sp_user'` + inserts `service_provider_user` row)

### AuditLog (Entity — append-only, Platform Core)

**Identity**: `id` (uuid, PK, `$defaultFn(() => uuidv7())`) — note: this is the one exception to the `text + uuidv7()` convention

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

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)` — the `uuidv7` JS function)

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

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)` — the `uuidv7` JS function)

**Invariants**:

- Append-only (no updates/deletes from application)
- Level priority: debug(0) < info(1) < warn(2) < error(3) < fatal(4)

### KVEntry (Entity)

**Identity**: `key` (text, PK)

**Invariants**:

- Expired entries are lazily evicted on read
- Table is a regular `pgTable` (no UNLOGGED modifier — durability over performance)

## Domain Events

### Auth Events — 8 events

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

### Organization Events (OrganizationDomainEventMap) — 11 events

| Event                           | Payload                                                                  | Trigger                   |
| ------------------------------- | ------------------------------------------------------------------------ | ------------------------- |
| `organization:updated`          | `{ changes: Record<string, unknown>, organization: { id, name, slug } }` | Organization updated      |
| `organization:branding_updated` | `{ logo?: string, accentColor?: string, name?: string }`                 | Branding changed          |
| `branch:created`                | `{ branch: { code, id, name, type } }`                                   | Branch created            |
| `branch:updated`                | `{ branch: { id, name }, changes: Record<string, unknown> }`             | Branch updated            |
| `branch:activated`              | `{ branchId: string }`                                                   | Branch activated          |
| `branch:deactivated`            | `{ branchId: string }`                                                   | Branch deactivated        |
| `branch:closed`                 | `{ branchId: string, date: string }`                                     | Branch closed             |
| `connection:created`            | `{ connection: { id, name, type } }`                                     | Connection created        |
| `connection:updated`            | `{ connection: { id, name }, changes: Record<string, unknown> }`         | Connection updated        |
| `connection:status_changed`     | `{ connectionId, fromStatus, toStatus }`                                 | Connection status changed |
| `connection:note_added`         | `{ connectionId, note: { content, id, type } }`                          | Note added to connection  |

### Compliance Events (ComplianceEventMap) — 23 events

| Event                                     | Payload                                                                                                      | Trigger                                      |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| `compliance:document_created`             | `{ document: { category, id, name } }`                                                                       | Document created                             |
| `compliance:document_updated`             | `{ changes, document: { id, name } }`                                                                        | Document updated                             |
| `compliance:document_submitted`           | `{ documentId, submittedBy }`                                                                                | Document submitted for review                |
| `compliance:document_verified`            | `{ category, documentId, sourceEntityId, sourceModule, verifiedBy }`                                         | Document verified                            |
| `compliance:document_rejected`            | `{ category, documentId, reason, rejectedBy, sourceEntityId, sourceModule }`                                 | Document rejected                            |
| `compliance:document_expiring`            | `{ daysUntilExpiry, documentId, sourceEntityId, sourceModule }`                                              | Expiry notification                          |
| `compliance:document_due`                 | `{ daysUntilDue, documentId, sourceEntityId, sourceModule }`                                                 | Due date notification                        |
| `compliance:document_expired`             | `{ category, documentId, sourceEntityId, sourceModule }`                                                     | Document expired                             |
| `compliance:document_overdue`             | `{ category, daysOverdue, documentId, sourceEntityId, sourceModule }`                                        | Document past due                            |
| `compliance:document_completed`           | `{ completedAt, documentId, referenceNumber, sourceEntityId, sourceModule }`                                 | Document completed                           |
| `compliance:document_escalated`           | `{ daysSinceExpiry, documentId, escalationLevel }`                                                           | Escalation threshold reached                 |
| `compliance:document_renewed`             | `{ newDocumentId, oldDocumentId }`                                                                           | Document renewed (old archived, new created) |
| `compliance:document_archived`            | `{ documentId }`                                                                                             | Document archived                            |
| `compliance:document_reviewer_assigned`   | `{ documentId, reviewerId }`                                                                                 | Reviewer assigned                            |
| `compliance:document_attachment_uploaded` | `{ documentId, storageKey }`                                                                                 | Attachment uploaded                          |
| `compliance:document_snoozed`             | `{ documentId, snoozedBy, snoozedUntil }`                                                                    | Document snoozed                             |
| `compliance:document_generated`           | `{ documentId, obligationId, sourceModule }`                                                                 | Auto-generated from obligation               |
| `compliance:obligation_created`           | `{ obligation: { category, id, name } }`                                                                     | Obligation created                           |
| `compliance:obligation_activated`         | `{ obligationId }`                                                                                           | Obligation activated                         |
| `compliance:obligation_deactivated`       | `{ obligationId }`                                                                                           | Obligation deactivated                       |
| `compliance:obligation_updated`           | `{ changes, obligation: { id, name } }`                                                                      | Obligation updated                           |
| `compliance:weekly_summary`               | `{ summary: { activeObligations, documentsGenerated30d, expired, expiringSoon, overdue, total, verified } }` | Weekly dashboard summary                     |
| `compliance:scheduled_job_executed`       | `{ errors, executionTime, jobName, recordsProcessed }`                                                       | Scheduled job completed                      |

### Tasks Events (TaskDomainEventMap) — 10 events

| Event                 | Payload                                                     | Trigger                   |
| --------------------- | ----------------------------------------------------------- | ------------------------- |
| `task:created`        | `{ task: { id, number, projectId, title } }`                | Task created              |
| `task:updated`        | `{ task: { id, title }, changes: Record<string, unknown> }` | Task updated              |
| `task:deleted`        | `{ taskId: string }`                                        | Task deleted              |
| `task:status_changed` | `{ task: { id, title }, fromStatus, toStatus }`             | Task status changed       |
| `task:assigned`       | `{ taskId, userId, assignedBy }`                            | User assigned to task     |
| `task:unassigned`     | `{ taskId, userId }`                                        | User unassigned from task |
| `task:linked`         | `{ sourceId, targetId, linkType }`                          | Task link created         |
| `task:unlinked`       | `{ sourceId, targetId }`                                    | Task link removed         |
| `task:commented`      | `{ taskId, comment: { id, body } }`                         | Comment added             |
| `reminder:fired`      | `{ taskId, reminder: { id, type, userId } }`                | Reminder fired            |

### DMS Events (DmsEventMap) — 40 events (6 maps)

#### Document Events (`DOCUMENT_EVENTS`) — 13

| Event                           | Payload                         | Trigger                            |
| ------------------------------- | ------------------------------- | ---------------------------------- |
| `dms:document_uploaded`         | `{ document: { id, name } }`    | Document uploaded (into Triage)    |
| `dms:document_classified`       | `{ documentId, classId }`       | Document classified (→ active)     |
| `dms:document_updated`          | `{ document: { id }, changes }` | Document updated                   |
| `dms:document_tagged`           | `{ documentId, tag }`           | Tag applied                        |
| `dms:document_untagged`         | `{ documentId, tag }`           | Tag removed                        |
| `dms:document_deleted`          | `{ documentId }`                | Document soft-deleted (→ deleted)  |
| `dms:document_restored`         | `{ documentId }`                | Document restored from bin         |
| `dms:document_expired`          | `{ documentId }`                | Expiry scanner promoted to expired |
| `dms:document_purged`           | `{ documentId }`                | Document permanently purged        |
| `dms:document_version_added`    | `{ documentId, version }`       | New version written                |
| `dms:document_version_reverted` | `{ documentId, version }`       | Version reverted                   |
| `dms:document_hold_placed`      | `{ documentId, holdId }`        | Legal hold placed                  |
| `dms:document_hold_released`    | `{ documentId }`                | Legal hold released                |

#### Class Events (`CLASS_EVENTS`) — 3

| Event                | Payload       | Trigger        |
| -------------------- | ------------- | -------------- |
| `dms:class_created`  | `{ classId }` | Class created  |
| `dms:class_updated`  | `{ classId }` | Class updated  |
| `dms:class_archived` | `{ classId }` | Class archived |

#### Contact Events (`CONTACT_EVENTS`) — 3

| Event                 | Payload         | Trigger         |
| --------------------- | --------------- | --------------- |
| `dms:contact_created` | `{ contactId }` | Contact created |
| `dms:contact_updated` | `{ contactId }` | Contact updated |
| `dms:contact_removed` | `{ contactId }` | Contact removed |

#### Share Events (`SHARE_EVENTS`) — 2

| Event               | Payload       | Trigger                |
| ------------------- | ------------- | ---------------------- |
| `dms:share_created` | `{ shareId }` | Document share created |
| `dms:share_revoked` | `{ shareId }` | Document share revoked |

#### View Events (`VIEW_EVENTS`) — 5

| Event               | Payload      | Trigger       |
| ------------------- | ------------ | ------------- |
| `dms:view_created`  | `{ viewId }` | View created  |
| `dms:view_updated`  | `{ viewId }` | View updated  |
| `dms:view_deleted`  | `{ viewId }` | View deleted  |
| `dms:view_pinned`   | `{ viewId }` | View pinned   |
| `dms:view_unpinned` | `{ viewId }` | View unpinned |

#### Item Events (`ITEM_EVENTS`) — 14 (files/folders surface)

| Event                           | Payload                | Trigger                  |
| ------------------------------- | ---------------------- | ------------------------ |
| `dms:item_file_uploaded`        | `{ fileId }`           | Item file uploaded       |
| `dms:item_file_updated`         | `{ fileId }`           | Item file updated        |
| `dms:item_file_downloaded`      | `{ fileId }`           | Item file downloaded     |
| `dms:item_folder_created`       | `{ folderId }`         | Item folder created      |
| `dms:item_folder_renamed`       | `{ folderId }`         | Item folder renamed      |
| `dms:item_moved`                | `{ itemId, itemType }` | Item file/folder moved   |
| `dms:item_trashed`              | `{ itemId, itemType }` | Item moved to trash      |
| `dms:item_restored`             | `{ itemId, itemType }` | Item restored from trash |
| `dms:item_purged`               | `{ itemId, itemType }` | Item permanently deleted |
| `dms:item_shared`               | `{ shareId }`          | Item share created       |
| `dms:item_unshared`             | `{ shareId }`          | Item share removed       |
| `dms:item_public_link_created`  | `{ linkId }`           | Public link created      |
| `dms:item_public_link_revoked`  | `{ linkId }`           | Public link revoked      |
| `dms:item_public_link_accessed` | `{ linkId }`           | Public link accessed     |

### HR Events — 43 events

The HR module defines 43 events across 8 event groups, combined into `HrEventMap`:

| Group      | Count | Events                                                                                                                                                                                                                                                                                                     |
| ---------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Employee   | 4     | `employee:created`, `employee:updated`, `employee:status_changed`, `employee:group_created`                                                                                                                                                                                                                |
| Attendance | 5     | `attendance:created`, `attendance:checkin_created`, `attendance:request_created`, `attendance:request_approved`, `attendance:request_rejected`                                                                                                                                                             |
| Leave      | 6     | `leave:application_submitted`, `leave:application_approved`, `leave:application_rejected`, `leave:application_cancelled`, `leave:allocation_created`, `leave:encashment_requested`                                                                                                                         |
| Lifecycle  | 9     | `lifecycle:onboarding_started`, `lifecycle:onboarding_completed`, `lifecycle:promotion_requested`, `lifecycle:promotion_approved`, `lifecycle:transfer_requested`, `lifecycle:transfer_approved`, `lifecycle:separation_initiated`, `lifecycle:separation_completed`, `lifecycle:exit_interview_scheduled` |
| Overtime   | 3     | `overtime:slip_created`, `overtime:slip_approved`, `overtime:slip_rejected`                                                                                                                                                                                                                                |
| Setup      | 4     | `setup:department_created`, `setup:designation_created`, `setup:holiday_list_created`, `setup:settings_updated`                                                                                                                                                                                            |
| Shift      | 4     | `shift:assignment_created`, `shift:request_created`, `shift:request_approved`, `shift:request_rejected`                                                                                                                                                                                                    |
| Access     | 8     | `access:user_created`, `access:user_activated`, `access:user_deactivated`, `access:role_created`, `access:role_assigned`, `access:role_revoked`, `access:branch_access_granted`, `access:branch_access_revoked`                                                                                            |

### Management Plane Events (ManagementPlaneEventMap) — 16 events

#### Tenant Events (8)

| Event                    | Payload                            | Trigger                                                         |
| ------------------------ | ---------------------------------- | --------------------------------------------------------------- |
| `tenant:provisioned`     | `{ tenantId, serviceProviderId? }` | Tenant provisioned (DB created, schemas pushed, profile seeded) |
| `tenant:activated`       | `{ tenantId }`                     | Tenant activated (from onboarding/suspended)                    |
| `tenant:suspended`       | `{ tenantId, reason }`             | Tenant suspended                                                |
| `tenant:reactivated`     | `{ tenantId }`                     | Tenant reactivated from suspended                               |
| `tenant:churned`         | `{ tenantId, reason }`             | Tenant churned (offboarded)                                     |
| `tenant:profile_updated` | `{ tenantId, changes }`            | Tenant profile updated                                          |
| `tenant:sp_assigned`     | `{ tenantId, serviceProviderId }`  | Service Provider assigned to tenant                             |
| `tenant:sp_unassigned`   | `{ tenantId }`                     | Service Provider unassigned from tenant                         |

#### Service Provider Events (4)

| Event                          | Payload                                      | Trigger                      |
| ------------------------------ | -------------------------------------------- | ---------------------------- |
| `service_provider:created`     | `{ serviceProvider: { id, name, slug } }`    | Service Provider created     |
| `service_provider:updated`     | `{ serviceProvider: { id, name }, changes }` | Service Provider updated     |
| `service_provider:deactivated` | `{ serviceProviderId }`                      | Service Provider deactivated |
| `service_provider:activated`   | `{ serviceProviderId }`                      | Service Provider activated   |

#### Platform User Events (4)

| Event                         | Payload                         | Trigger                        |
| ----------------------------- | ------------------------------- | ------------------------------ |
| `platform_user:created`       | `{ user: { id, email, role } }` | Platform user created          |
| `platform_user:updated`       | `{ userId, changes }`           | Platform user updated          |
| `platform_user:deleted`       | `{ userId }`                    | Platform user deleted          |
| `platform_user:role_assigned` | `{ userId, role }`              | Role assigned to platform user |

### Not Yet Defined (Gaps)

- File events (framework storage): `file:uploaded`, `file:deleted`, `file:archived`
- Log events: `log:error-threshold-exceeded`
- KV events: (none expected — cache operations are internal)

## Command-Query Separation

### Commands (Write Side)

| Context          | Command                   | Method                                            |
| ---------------- | ------------------------- | ------------------------------------------------- |
| Auth             | Create user               | `auth.user.create()`                              |
| Auth             | Delete user               | `auth.user.remove()`                              |
| Auth             | Update user               | `auth.user.update()`                              |
| Auth             | Assign role               | `auth.user.role.assign()`                         |
| Auth             | Unassign role             | `auth.user.role.unassign()`                       |
| Auth             | Create session            | `auth.session.create()`                           |
| Auth             | Invalidate session        | `auth.session.invalidate()`                       |
| Auth             | Delete role               | `auth.role.remove()`                              |
| Storage          | Upload file               | `storage.upload()`                                |
| Storage          | Delete file               | `storage.remove()`                                |
| Storage          | Archive file              | `storage.archive()`                               |
| PubSub           | Publish message           | `pubsub.publish()`                                |
| PubSub           | Subscribe                 | `pubsub.subscribe()`                              |
| KV               | Set key                   | `kv.set()`                                        |
| KV               | Delete key                | `kv.del()`                                        |
| Organization     | Create org                | `p.organization.organizations.create()`           |
| Organization     | Update org                | `p.organization.organizations.update()`           |
| Organization     | Update branding           | `p.organization.organizations.updateBranding()`   |
| Branch           | Create branch             | `p.organization.branches.create()`                |
| Branch           | Archive branch            | `p.organization.branches.archive()`               |
| Connection       | Create connection         | `p.organization.connections.create()`             |
| Connection       | Add contact               | `p.organization.connections.addContact()`         |
| Address          | Create address            | `p.organization.addresses.create()`               |
| Bank Account     | Create account            | `p.organization.bankAccounts.create()`            |
| Compliance       | Create document           | `p.compliance.documents.create()`                 |
| Compliance       | Submit document           | `p.compliance.documents.submit()`                 |
| Compliance       | Verify document           | `p.compliance.documents.verify()`                 |
| Compliance       | Reject document           | `p.compliance.documents.reject()`                 |
| Compliance       | Renew document            | `p.compliance.documents.renew()`                  |
| Compliance       | Archive document          | `p.compliance.documents.archive()`                |
| Compliance       | Snooze document           | `p.compliance.documents.snooze()`                 |
| Compliance       | Create obligation         | `p.compliance.obligations.create()`               |
| Compliance       | Activate obligation       | `p.compliance.obligations.activate()`             |
| Compliance       | Create verification rule  | `p.compliance.verification.create()`              |
| Tasks            | Create task               | `p.tasks.tasks.create()`                          |
| Tasks            | Update task               | `p.tasks.tasks.update()`                          |
| Tasks            | Archive task              | `p.tasks.tasks.archive()`                         |
| Tasks            | Assign task               | `p.tasks.tasks.assign()`                          |
| Tasks            | Create project            | `p.tasks.projects.create()`                       |
| Tasks            | Archive project           | `p.tasks.projects.archive()`                      |
| Tasks            | Create comment            | `p.tasks.comments.create()`                       |
| Tasks            | Create link               | `p.tasks.links.create()`                          |
| Tasks            | Log time                  | `p.tasks.timeEntries.create()`                    |
| Tasks            | Create reminder           | `p.tasks.reminders.create()`                      |
| Tasks            | Create automation rule    | `p.tasks.automation.create()`                     |
| DMS (records)    | Upload document           | `p.dms.documents.upload()`                        |
| DMS (records)    | Classify document         | `p.dms.triage.classify()`                         |
| DMS (records)    | Update document           | `p.dms.documents.update()`                        |
| DMS (records)    | Soft-delete document      | `p.dms.documents.delete()`                        |
| DMS (records)    | Add version               | `p.dms.versions.new()`                            |
| DMS (records)    | Revert version            | `p.dms.versions.revert()`                         |
| DMS (records)    | Place legal hold          | `p.dms.holds.place()`                             |
| DMS (records)    | Share document            | `p.dms.share.create()`                            |
| DMS (records)    | Permanently delete        | `p.dms.bin.deletePermanently()`                   |
| DMS (records)    | Create document class     | `p.dms.classes.create()`                          |
| DMS (items)      | Upload file               | `p.dms.files.upload()`                            |
| DMS (items)      | Update file               | `p.dms.files.update()`                            |
| DMS (items)      | Delete file               | `p.dms.files.delete()`                            |
| DMS (items)      | Create folder             | `p.dms.folders.create()`                          |
| DMS (items)      | Move item                 | `p.dms.files.move()` / `p.dms.folders.move()`     |
| DMS (items)      | Share item                | `p.dms.shares.create()`                           |
| DMS (items)      | Create public link        | `p.dms.publicLinks.create()`                      |
| DMS (items)      | Trash item                | `p.dms.files.delete()` / `p.dms.folders.delete()` |
| DMS (items)      | Restore item              | `p.dms.trash.restore()`                           |
| DMS (items)      | Empty trash               | `p.dms.trash.emptyTrash()`                        |
| DMS (items)      | Apply label               | `p.dms.labels.apply()`                            |
| Management Plane | Onboard tenant            | `p.management.tenants.onboard()`                  |
| Management Plane | Update tenant             | `p.management.tenants.update()`                   |
| Management Plane | Create SP                 | `p.management.serviceProviders.create()`          |
| Management Plane | Update SP                 | `p.management.serviceProviders.update()`          |
| Management Plane | Activate SP               | `p.management.serviceProviders.activate()`        |
| Management Plane | Deactivate SP             | `p.management.serviceProviders.deactivate()`      |
| Management Plane | Create platform user      | `p.management.users.create()`                     |
| Management Plane | Update platform user      | `p.management.users.update()`                     |
| Management Plane | Delete platform user      | `p.management.users.delete()`                     |
| Management Plane | Assign role               | `p.management.users.assignRole()`                 |
| Management Plane | Assign user to SP         | `p.management.users.assignToServiceProvider()`    |
| HR               | Create employee           | `p.hr.employee.create()`                          |
| HR               | Update employee           | `p.hr.employee.update()`                          |
| HR               | Create group              | `p.hr.employee.createGroup()`                     |
| HR               | Create attendance         | `p.hr.attendance.create()`                        |
| HR               | Create check-in           | `p.hr.attendance.createCheckin()`                 |
| HR               | Create leave application  | `p.hr.leave.createLeaveApplication()`             |
| HR               | Approve leave application | `p.hr.leave.approveLeaveApplication()`            |
| HR               | Create shift assignment   | `p.hr.shift.createShiftAssignment()`              |
| HR               | Create Overtime slip      | `p.hr.overtime.createOvertimeSlip()`              |
| HR               | Create department         | `p.hr.setup.createDepartment()`                   |
| HR               | Create HR user            | `p.hr.access.createUser()`                        |
| HR               | Grant branch access       | `p.hr.access.grantBranchAccess()`                 |

### Queries (Read Side)

| Context          | Query                                 | Method                                               |
| ---------------- | ------------------------------------- | ---------------------------------------------------- |
| Auth             | Get user by ID                        | `auth.user.get({ id })`                              |
| Auth             | Get user by email                     | `auth.user.get({ email })`                           |
| Auth             | Validate session                      | `auth.session.validate()`                            |
| Auth             | List roles                            | `auth.role.list()`                                   |
| Storage          | Get signed URL                        | `storage.getSignedGetUrl()`                          |
| Storage          | List files                            | `storage.list()`                                     |
| Storage          | Get metadata                          | `storage.getMetadata()`                              |
| Logs             | Query logs                            | `logs.query()`                                       |
| Logs             | Get stats                             | `logs.getStats()`                                    |
| KV               | Get key                               | `kv.get()`                                           |
| KV               | Check exists                          | `kv.exists()`                                        |
| PubSub           | Get queue size                        | `pubsub.getQueueSize()`                              |
| PubSub           | List produced-but-unsubscribed topics | `pubsub.getUnsubscribedProducedTopics()`             |
| Platform         | Health check                          | `p.healthCheck()`                                    |
| Organization     | Get org                               | `p.organization.organizations.get()`                 |
| Branch           | List branches                         | `p.organization.branches.list()`                     |
| Branch           | Get tree                              | `p.organization.branches.getTree()`                  |
| Connection       | Search                                | `p.organization.connections.search()`                |
| Connection       | List contacts                         | `p.organization.connections.listContacts()`          |
| Address          | List addresses                        | `p.organization.addresses.list()`                    |
| Bank Account     | List accounts                         | `p.organization.bankAccounts.list()`                 |
| Compliance       | Get by ID                             | `p.compliance.documents.getById()`                   |
| Compliance       | List documents                        | `p.compliance.documents.list()`                      |
| Compliance       | Get expiring                          | `p.compliance.documents.getExpiring()`               |
| Compliance       | Get due soon                          | `p.compliance.documents.getDueSoon()`                |
| Compliance       | Get expired                           | `p.compliance.documents.getExpired()`                |
| Compliance       | Get overdue                           | `p.compliance.documents.getOverdue()`                |
| Compliance       | Get renewal chain                     | `p.compliance.documents.getRenewalChain()`           |
| Compliance       | Get timeline                          | `p.compliance.documents.getTimeline()`               |
| Compliance       | Get dashboard summary                 | `p.compliance.dashboard.getSummary()`                |
| Compliance       | Get audit trail                       | `p.compliance.audit.getAuditTrail()`                 |
| Compliance       | List obligations                      | `p.compliance.obligations.list()`                    |
| Compliance       | List verification rules               | `p.compliance.verification.list()`                   |
| Tasks            | Get task                              | `p.tasks.tasks.getById()`                            |
| Tasks            | List tasks                            | `p.tasks.tasks.list()`                               |
| Tasks            | Get sub-tasks                         | `p.tasks.tasks.getSubTasks()`                        |
| Tasks            | Get completion summary                | `p.tasks.tasks.getCompletionSummary()`               |
| Tasks            | List project members                  | `p.tasks.projects.listMembers()`                     |
| Tasks            | Get dependency graph                  | `p.tasks.links.getDependencyGraph()`                 |
| Tasks            | Get critical path                     | `p.tasks.links.getCriticalPath()`                    |
| Tasks            | Topological sort                      | `p.tasks.links.topologicalSort()`                    |
| Tasks            | Task summary report                   | `p.tasks.reports.getTaskSummary()`                   |
| Tasks            | Workload report                       | `p.tasks.reports.getWorkloadReport()`                |
| Tasks            | Time report                           | `p.tasks.reports.getTimeReport()`                    |
| Tasks            | Cumulative flow                       | `p.tasks.reports.getCumulativeFlow()`                |
| DMS (items)      | Get file                              | `p.dms.files.getById()`                              |
| DMS (items)      | List folder                           | `p.dms.folders.list()`                               |
| DMS (items)      | Get folder metadata                   | `p.dms.folders.get()`                                |
| DMS (items)      | List file versions                    | `p.dms.files.listVersions()`                         |
| DMS (items)      | Get download link                     | `p.dms.files.getDownloadLink()`                      |
| DMS (items)      | Search (files/folders)                | `p.dms.driveSearch.search()`                         |
| DMS (items)      | List shares                           | `p.dms.shares.list()`                                |
| DMS (items)      | List shared with me                   | `p.dms.shares.listSharedWithMe()`                    |
| DMS (items)      | List trash                            | `p.dms.trash.list()`                                 |
| DMS (items)      | List labels                           | `p.dms.labels.list()`                                |
| DMS (items)      | Get breadcrumbs                       | `p.dms.paths.getBreadcrumbs()`                       |
| DMS (records)    | List triaged documents                | `p.dms.triage.list()`                                |
| DMS (records)    | Search documents                      | `p.dms.search.quick()` / `p.dms.search.search()`     |
| DMS (records)    | List document versions                | `p.dms.versions.list()`                              |
| DMS (records)    | List document shares                  | `p.dms.documentShares.list()`                        |
| DMS (records)    | Get document activity feed            | `p.dms.activity.getDocument()`                       |
| DMS (records)    | List views                            | `p.dms.views.list()`                                 |
| Management Plane | Get tenant                            | `p.management.tenants.get()`                         |
| Management Plane | List tenants                          | `p.management.tenants.list()`                        |
| Management Plane | Get SP                                | `p.management.serviceProviders.get()`                |
| Management Plane | List SPs                              | `p.management.serviceProviders.list()`               |
| Management Plane | Get SP assigned tenants               | `p.management.serviceProviders.getAssignedTenants()` |
| Management Plane | Get SP users                          | `p.management.serviceProviders.getUsers()`           |
| Management Plane | Get platform user                     | `p.management.users.get()`                           |
| Management Plane | List platform users                   | `p.management.users.list()`                          |
| HR               | Get employee                          | `p.hr.employee.getById()`                            |
| HR               | List employees                        | `p.hr.employee.list()`                               |
| HR               | Get organizational chart              | `p.hr.employee.getOrganizationalChart()`             |
| HR               | List leave applications               | `p.hr.leave.listLeaveApplications()`                 |
| HR               | Get leave balance                     | `p.hr.leave.getLeaveBalance()`                       |
| HR               | List roles                            | `p.hr.access.listRoles()`                            |
| HR               | Get HR settings                       | `p.hr.setup.getHrSettings()`                         |

## Invariants & Business Rules

### Cross-Cutting

1. **All IDs are text** — either app-generated via `crypto.randomUUID()` or via the JS `uuidv7()` function (inserted via drizzle's `$defaultFn`)
2. **All timestamps are TIMESTAMPTZ** — `withTimezone: true` on all timestamp columns
3. **Cascade deletes** — User deletion cascades to sessions and accounts
4. **No barrel files** — explicit convention in CODING_CONVENTIONS.md
5. **No DB-level foreign keys in domain modules** — compliance, tasks, organization, management, and hr all use soft FKs (logical references by naming convention, not enforced by the database)

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

### DMS

29. **Path uniqueness** — item folder and file paths must be unique (enforced by DB unique constraint)
30. **Path cascade** — moving/renaming a folder updates all descendant paths (`p.dms.paths`)
31. **Max nesting depth** — configurable (default 20)
32. **Name uniqueness within parent** — case-insensitive uniqueness check
33. **No circular folder parents** — cycle detection via `paths.wouldCreateCycle()`
34. **Version pruning** — old versions pruned based on `maxVersions` (default 10); skipped under an active Legal Hold
35. **Permission inheritance** — `access.getEffectivePermission()` walks up the parent folder chain for inherited permissions
36. **Item trash retention** — trashed files/folders are purged after `trashRetentionDays` (default 30) via the `dms:item-auto-purge` cron
37. **Public link validation** — token, expiry, maxViews, and password (bcrypt) are checked on access
38. **Mandatory Triage gate** — uploads always land in `triaged`; the only exit is `triage.classify()` (→ `active`)
39. **Hold-aware purge** — permanent deletion and auto-purge of Documents are blocked while an active Legal Hold exists; `bin.deletePermanently` is admin-only
40. **Retention** — class-level `retentionDays` overrides the settings default; purged via the `dms:auto-purge` cron

### Storage

38. **Key uniqueness** — enforced by DB unique constraint on file_metadata.key
39. **Archive immutability** — archived files get new key, original marked as archived

### KV Store

40. **Lazy TTL eviction** — expired entries deleted on read, not by background job
41. **Regular table** — `kv_store` is a normal `pgTable` (not UNLOGGED; no WAL-style sacrifice — durability over cache semantics)

### Management Plane

42. **SP slug uniqueness** — enforced by DB unique constraint on service_provider.slug
43. **SP user resolved via service_provider_user table** — `service_provider_user` is a join table (1:1 from user to SP via FK), replacing the earlier `user.spId` column design. Role `'sp_user'` requires a matching `service_provider_user` row; enforced in workflow
44. **Tenant status transitions** — `onboarding` → `active` → `suspended` ↔ `active` → `churned` (enforced in workflow)
45. **Audit log append-only** — no updates or deletes; written via platform `ctx.audit.write(...)` inline in each workflow (the platform's `audit_log` table, not a module-local table)
46. **Tenant-Organization ID sharing** — tenant companion table ID = better-auth organization ID (1:1 relationship)
47. **Provisioning idempotency** — `CREATE DATABASE` catches "already exists" errors and continues

### HR

48. **Scheduled cron jobs** — `DAILY_ATTENDANCE_SYNC` and `DAILY_LEAVE_ACCRUAL` are registered in `$prepareRuntime()` and unregistered in `$cleanup()`.
49. **Schema placement** — 14 setup/access tables (departments, designations, grades, employment types, holidays, HR users/roles/permissions/branch-access, settings, payroll settings) live in the control plane (shared across tenants); the 36 operational/transactional tables (employee, attendance, leave, lifecycle, overtime, shift, health insurance, skill maps, groups) live in tenant schemas.

## Anti-Patterns to Avoid

1. **Don't create barrel files** unless explicitly told
2. **Don't use native UUID columns** — always text
3. **Don't use `timestamp without time zone`** — always `withTimezone: true`
4. **Don't call `create()` then try to register more modules** — pass all modules to `Platform.create()` at once
5. **Don't assume dedicated role/permission tables** — roles are text on user table
6. **Don't add DB-level foreign key constraints in domain modules** — use soft FKs (logical references by naming convention)
7. **Don't set compliance verification status directly** — use the lifecycle commands (submit, verify, reject, etc.) or `updateStatus`
