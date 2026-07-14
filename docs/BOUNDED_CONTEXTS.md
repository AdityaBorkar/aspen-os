# Bounded Contexts & Context Map

## Context Map Overview

```
                    ┌─────────────────────────────────┐
                    │      SHARED KERNEL               │
                    │  Unit & Module interfaces        │
                    │  (inline in server/index.ts      │
                    │   and client/index.ts)            │
                    └──────────────┬──────────────────┘
                                   │
           ┌───────────────────────┼───────────────────────┐
           │                       │                       │
           ▼                       ▼                       ▼
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
│                     DOMAIN MODULES                               │
│                                                                  │
│  ┌───────────────┐  ┌───────────────────┐  ┌───────────────┐   │
│  │ Recruiter App │  │ Organization      │  │ Compliance    │   │
│  │               │  │ Module            │  │ Module        │   │
│  │ creates via   │  │ 5 workflows       │  │ 5 workflows   │   │
│  │ Framework.    │  │ 7 tables          │  │ 5 services     │   │
│  │ create()      │  │ 11 events         │  │ 4 tables       │   │
│  └───────────────┘  │ units: db, pubsub │  │ 23 events      │   │
│                     └───────────────────┘  │ units: db,     │   │
│                                            │ kvStore, pubsub│   │
│  ┌───────────────┐  ┌───────────────┐     └───────────────┘   │
│  │ Tasks         │  │ Drive         │     ┌───────────────┐   │
│  │ Module        │  │ Module        │     │ HR Module     │   │
│  │ 11 workflows  │  │ 6 workflows   │     │ (incomplete)   │   │
│  │ 4 services    │  │ 5 services     │     │ 7 workflows    │   │
│  │ 17 tables     │  │ 8 tables       │     │ 44 tables      │   │
│  │ 10 events     │  │ 14 events      │     │ 0 events       │   │
│  │ units:        │  │ units:         │     │ module class   │   │
│  │  db, pubsub   │  │  db, storage,  │     │ not wired      │   │
│  │               │  │  pubsub         │     └───────────────┘   │
│  └───────────────┘  └───────────────┘                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     STUB MODULES                                 │
│  accounting, crm, fleet, inventory, reports, pharmacy           │
│  (package.json only — no source)                                 │
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

**Contents** (inline in `packages/framework/src/server/index.ts` and `packages/framework/src/client/index.ts`):
- `Unit` interface — `{ $name: string, $destroy(): Promise<void>, $prepare?(): Promise<void> }`
- `Module` interface — `{ $name: N, $initialize?(units: Record<string, Unit>): void, $prepare?(): Promise<void>, $destroy(): Promise<void> }`

Both server and client use the `$` prefix for lifecycle methods and the name property.

**Note**: There is no separate `types.ts` file. The interfaces are defined inline at the top of each framework entry point. `DatabaseConfig`, `AuthConfig`, `LogConfig`, etc. live in their respective unit directories.

**Rules**:
- Changes to the shared kernel require coordinated updates across all units
- The shared kernel should remain minimal — only truly universal types
- No implementation details leak through the shared kernel

### 2. Customer-Supplier: Framework → Units

**Direction**: Framework creates and wires units via `Framework.create(config, modules)`. Units have no knowledge of Framework.

```
Framework.create(config, modules)
    │
    ├── creates DatabaseUnit(config.db)
    ├── creates LogUnit(config.logs, { db })
    ├── creates PubSubUnit(config.pubsub, { db })
    ├── creates StorageUnit(config.storage, { db })
    ├── creates AuthUnit(config.auth, { db })
    ├── creates RpcUnit(config.rpc, { auth, db, logs, pubsub })
    ├── creates KvStoreUnit(config.kvStore, { db })
    │
    └── calls mod.$initialize(units) for each module
        └── returns proxy-wrapped FrameworkInstance
```

**Dependency graph** (constructor injection):
```
DatabaseUnit ← LogUnit
DatabaseUnit ← PubSubUnit
DatabaseUnit ← StorageUnit
DatabaseUnit ← AuthUnit
DatabaseUnit ← RpcUnit
LogUnit  ← AuthUnit
PubSubUnit   ← AuthUnit
LogUnit  ← RpcUnit
PubSubUnit   ← RpcUnit
AuthUnit     ← RpcUnit
DatabaseUnit ← KvStoreUnit
```

### 3. Conformist: Auth → better-auth

**Relationship**: AuthUnit conforms to better-auth's API surface. It adapts better-auth's plugin system (access control, admin, custom session, phone number, two-factor, passkey) into Aspen's domain model.

**Adaptations**:
- `createAccessControl` → re-exported from better-auth
- `betterAuth()` → wrapped in AuthUnit constructor
- `drizzleAdapter` → configures better-auth to use framework's drizzle instance
- better-auth's session/user/role APIs → wrapped as workflow functions

**Schema**: Auth tables follow better-auth's adapter pattern:
- `user` table — core identity (id, email, name, role, phone, etc.)
- `session` table — authentication tokens (token, userId, expiresAt)
- `account` table — credentials and OAuth tokens (providerId, password, accessToken)
- `verification` table — email verification, password reset tokens

**Role model**: Roles are stored as a plain `text` column on the `user` table — not as separate entities. Access control statements are defined at the application level via `createAccessControl`, not at the framework level.

**Access control flow**: `access_control` and `roles` from `AuthConfig` are destructured out of the top-level config to avoid being spread into `betterAuth()` as top-level options. They ARE passed to better-auth via the `admin({ ac: access_control, roles })` plugin. The client AuthUnit receives them via the `adminClient()` plugin.

**Auth plugins**: `admin`, `username`, `phoneNumber`, `lastLoginMethod`, `twoFactor`, `passkey`, and optionally `captcha` (when `cfSecretKey` is provided).

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
- pg-boss `schedule()` → exposed for cron-based job scheduling

**Public API**: `publish`, `publishBatch`, `subscribe`, `unsubscribe`, `getQueueSize`, `purgeQueue`, `schedule`

**Note**: PubSubUnit creates its own pg connection pool (does not reuse DatabaseUnit's pool). This is because pg-boss manages its own connection lifecycle.

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

**Note**: The RPC unit's constructor accepts `{ auth, db, logs, pubsub }` as deps but does not use them. The `RpcContext` is passed at request time via `handle()`, not injected at construction.

### 8. Conformist: KV Store → Postgres

**Relationship**: KV Store adapts Postgres as a key-value store (Redis alternative).

**Adaptations**:
- `UNLOGGED TABLE` → no WAL for performance (cache semantics)
- TTL → `expiresAt` column with lazy eviction on read
- Redis-like API → implemented via SQL operations

**Status**: Core unit, not optional. Required in `FrameworkConfig`.

### 9. Downstream: Recruiter → Framework

**Relationship**: Recruiter app creates the framework via `Framework.create(config, modules)` and passes domain modules.

**Lifecycle**:
```
Framework.create(config, { organization, compliance, tasks, drive })
    → framework.prepare()    // runs unit.$prepare() + mod.$prepare()
    → framework.run(fn)      // AsyncLocalStorage context
    → framework.destroy()    // mod.$destroy() then unit.$destroy()
```

**Adaptations**:
- Domain resources mapped to auth statements
- Roles defined for recruitment workflow
- Environment variables mapped to framework config

### 10. Downstream: Organization Module → Framework

**Relationship**: Organization module implements the `Module` interface and receives unit dependencies via `$initialize(units)`.

**Structure** (`packages/organization/`):
- `OrganizationModule.create()` — factory that returns a Module instance
- `$initialize(units)` — extracts `db` and `pubsub` from units, creates 5 workflow instances
- 5 workflows: `OrganizationWorkflow`, `BranchWorkflow`, `AddressWorkflow`, `BankAccountWorkflow`, `ConnectionWorkflow`
- 7 database tables: `organization`, `branch`, `connection`, `connection_contact`, `connection_note`, `address`, `bank_account`
- 11 domain events published via PubSub
- Valibot validation schemas for all inputs
- No `$prepare()` — schema pushing handled by `DatabaseUnit.$prepare()`

**Exposed on framework instance**: `framework.organization.addresses`, `framework.organization.branches`, `framework.organization.connections`, `framework.organization.organization`, `framework.organization.bankAccounts`

### 11. Downstream: Compliance Module → Framework

**Relationship**: Compliance module implements the `Module` interface and receives `{ db, kvStore, pubsub }` via `$initialize(units)`.

**Structure** (`packages/compliance/`):
- `ComplianceModule.create(config)` — factory that returns a Module instance
- 5 workflows: `DocumentWorkflow`, `ObligationWorkflow`, `VerificationWorkflow`, `AuditWorkflow`, `DashboardWorkflow`
- 5 services: `AuditWriter`, `EventBridge`, `ObligationGenerator`, `ReminderEngine`, `StatusDerivation` (pure functions)
- 4 database tables: `compliance_document`, `compliance_obligation`, `compliance_verification_rule`, `compliance_audit_entry`
- 23 domain events published via PubSub
- `$prepare()` — pushes schema to DB, registers reminder cron schedules, obligation generator handler, and event bridge subscriptions

**Cross-context integration**: The `EventBridge` service subscribes to events from other modules:
- `hr:employee_onboarded` → creates background check + ID verification documents
- `hr:employee_separated` → creates exit documents + final settlement documents
- `fleet:vehicle_registered` → creates pollution certificate + semi-annual obligation
- `organization:branch_created` → creates trade license + fire safety certificate + annual obligation
- `accounting:financial_year_started` → creates monthly GST return obligation
- `organization:connection_created` → creates insurance policy document (if type is insurer)

**Config**: `ComplianceModuleConfig = { country: "INDIA", dashboardCacheTtl?, defaultEscalationDays?, defaultReminderDays? }`

### 12. Downstream: Tasks Module → Framework

**Relationship**: Tasks module implements the `Module` interface and receives `{ db, pubsub }` via `$initialize(units)`.

**Structure** (`packages/tasks/`):
- `TaskModule.create(config?)` — factory that returns a Module instance
- 11 workflows: `TaskWorkflow`, `ProjectWorkflow`, `StatusWorkflow`, `TaskTypeWorkflow`, `CommentWorkflow`, `LinkWorkflow`, `TimeEntryWorkflow`, `ReminderWorkflow`, `ViewWorkflow`, `AutomationWorkflow`, `CollaborationWorkflow`
- 4 services: `NotificationBridge`, `ReportService`, `FilterEngine`, `DependencyGraphService`
- 17 database tables covering projects, tasks, statuses, types, links, time entries, reminders, comments, attachments, watchers, saved views, and automation rules
- 10 domain events published via PubSub
- No `$prepare()` — schema pushing handled by `DatabaseUnit.$prepare()`

**Config**: `TaskModuleConfig = { enableNotifications?: boolean }`

### 13. Downstream: Drive Module → Framework

**Relationship**: Drive module implements the `Module` interface and receives `{ db, storage, pubsub }` via `$initialize(units)`.

**Structure** (`packages/drive/`):
- `DriveModule.create(config?)` — factory that returns a Module instance
- 6 workflows: `FileWorkflow`, `FolderWorkflow`, `LabelWorkflow`, `ShareWorkflow`, `PublicLinkWorkflow`, `TrashWorkflow`
- 5 services: `AccessService`, `ArchiveService`, `PathService`, `SearchService`, `StorageBridge`
- 8 database tables: `drive_folder`, `drive_file`, `drive_file_version`, `drive_label`, `drive_item_label`, `drive_share`, `drive_public_link`, `drive_access_log`
- 14 domain events published via PubSub
- `$prepare()` — registers trash purge cron (`0 3 * * *`) on topic `drive:auto-purge`

**Config**: `DriveModuleConfig = { allowedContentTypes?, maxFileSize?, maxNestingDepth?, maxVersions?, trashRetentionDays?, ... }`

### 14. Downstream: HR Module → Framework (Incomplete)

**Relationship**: HR module will implement the `Module` interface and receive unit dependencies. Currently incomplete.

**Current state**: 7 fully implemented workflow classes (`EmployeeWorkflow`, `AttendanceWorkflow`, `LeaveWorkflow`, `LeaveWorkflow`, `LifecycleWorkflow`, `OvertimeWorkflow`, `ShiftWorkflow`, `SetupWorkflow`) with 235 public methods across 44 database tables. However, the `HrModule` class is non-conformant: no `$name` property, no `static create()` factory, `$initialize()` takes no arguments, workflows are not instantiated or exposed by the module, `event-map.ts` is empty, and `db_schema` export is named `dbSchemas` instead of `db_schema`.

### 15. Client Framework

**Exported as**: `@aspen-os/framework/client`

**Relationship**: A separate `Framework` class for browser-side use with 3 units:
- `AuthUnit` — wraps better-auth React client with plugins (admin, emailOTP, username, phoneNumber)
- `LogUnit` — stub (throws on `$prepare()`/`$destroy()`)
- `RpcUnit` — stub (no-op)

**No database dependency**: Client framework has no `DatabaseUnit`, `PubSubUnit`, `StorageUnit`, or `KvStoreUnit`.

**No `run()` method**: Client framework has no `AsyncLocalStorage` — the `client/context.ts` file is empty.

## Integration Patterns

### Framework.create() (Static Factory)

All units are created and wired inside `Framework.create()`:

```typescript
const framework = Framework.create(
  { auth, db, kvStore, logs, pubsub, rpc, storage },  // FrameworkConfig
  { organization, compliance, tasks, drive },           // modules record
);
```

This:
1. Instantiates all 7 units in dependency order
2. Calls `mod.$initialize(units)` on each module
3. Returns a proxy-wrapped `FrameworkInstance` that allows `framework.organization` syntax

### AsyncLocalStorage Context

The `run()` method provides request-scoped context:

```typescript
await framework.run(async () => {
  const { db, pubsub } = getContext();
  // db: NodePgDatabase (drizzle instance)
  // pubsub: PubSubUnit (full unit, not just publish)
});
```

### Event-Driven (Active)

Domain events are published via PubSub as plain string topics:

```
AuthWorkflow → pubsub.publish("user:created", { user }) → pg-boss topic
OrganizationWorkflow → pubsub.publish("branch:created", { branch }) → pg-boss topic
ComplianceDocumentWorkflow → pubsub.publish("compliance:document_created", { document }) → pg-boss topic
TaskWorkflow → pubsub.publish("task:created", { task }) → pg-boss topic
DriveFileWorkflow → pubsub.publish("drive:file_uploaded", { file }) → pg-boss topic
```

Event counts by module:
- Auth: 9 events
- Organization: 11 events
- Compliance: 23 events
- Tasks: 10 events
- Drive: 14 events
- HR: 0 events (event map empty)

Event maps are type-level contracts (`*EventMap` types), not runtime type-safe buses. Workflows publish via `pubsub.publish("topic_string", payload)`.

### Cross-Context Event Subscriptions

The Compliance module's `EventBridge` service actively subscribes to events from other modules to auto-create compliance documents and obligations. This is the primary cross-context integration mechanism:

| Subscribed Topic | Source Module | Action |
|---|---|---|
| `hr:employee_onboarded` | HR | Creates background check + ID verification documents |
| `hr:employee_separated` | HR | Creates exit documents + final settlement documents |
| `fleet:vehicle_registered` | Fleet (stub) | Creates pollution certificate + semi-annual obligation |
| `organization:branch_created` | Organization | Creates trade license + fire safety certificate + annual obligation |
| `accounting:financial_year_started` | Accounting (stub) | Creates monthly GST return obligation |
| `organization:connection_created` | Organization | Creates insurance policy document (if type is insurer) |

### Schema Management

`DatabaseUnit.$prepare()` uses `pushSchema()` from drizzle-kit to automatically apply schema changes:

```
Framework.prepare() → unit.$prepare() + mod.$prepare()
    → DatabaseUnit.$prepare() → pushSchema(allSchemas, db) → apply()
```

Schemas collected by `DatabaseUnit.$prepare()`: `authSchema`, `logSchema`, `storageSchema`, `kvStoreSchema`, plus module `db_schema` exports.

**Note**: The Compliance module also pushes its own schema in its `$prepare()` method (in addition to the framework's `DatabaseUnit.$prepare()`), because it needs schema available before registering cron handlers.

### Scheduled Jobs

Two modules register scheduled cron jobs via PubSub:

| Module | Topic | Cron | Action |
|---|---|---|---|
| Compliance | `compliance:daily-expiry-scan` | `0 8 * * *` | Scan expiring documents |
| Compliance | `compliance:daily-status-transition` | `0 0 * * *` | Transition expired/overdue statuses |
| Compliance | `compliance:daily-escalation` | `0 9 * * *` | Escalate past threshold |
| Compliance | `compliance:weekly-summary` | `0 9 * * 1` | Generate weekly summary |
| Compliance | `compliance:obligation-generate` | `0 6 * * *` | Generate documents from obligations |
| Drive | `drive:auto-purge` | `0 3 * * *` | Purge trashed items older than retention |

## Context Map Table

| Context | Type | Upstream | Downstream | Relationship |
|---|---|---|---|---|
| Shared Kernel | Shared | — | All units/modules | Unit & Module interfaces (inline) |
| Database | Shared Kernel | — | All units | Foundation |
| Framework | Customer | — | Units, Modules | Creates & wires via `create()` |
| Auth | Conformist | better-auth | Modules | Adapts API |
| Logs | Conformist | pino, OTel | — | Adapts API |
| PubSub | Conformist | pg-boss | — | Adapts API |
| Storage | Partner | S3 (AWS SDK) | Drive module | Defines interface |
| RPC | Conformist | oRPC | — | Adapts API |
| KV Store | Conformist | Postgres | Compliance module | Redis-like API (core) |
| Client Framework | — | — | — | Browser-side (3 units) |
| Recruiter | Downstream | Framework | — | Uses framework |
| Organization | Downstream | Framework | Compliance | 5 workflows, 7 tables |
| Compliance | Downstream | Framework, HR, Organization, Fleet, Accounting | — | 5 workflows, 4 tables, subscribes to external events |
| Tasks | Downstream | Framework | — | 11 workflows, 17 tables |
| Drive | Downstream | Framework, Storage | — | 6 workflows, 8 tables |
| HR | Downstream (incomplete) | Framework | Compliance | 7 workflows (unwired), 44 tables |
| Accounting | Stub | — | — | Package.json only |
| CRM | Stub | — | — | Package.json only |
| Fleet | Stub | — | — | Package.json only |
| Inventory | Stub | — | — | Package.json only |
| Reports | Stub | — | — | Package.json only |
| Pharmacy | Stub | — | — | Package.json only |

## Language Boundaries

### Framework Kernel Language
- Unit, Module, Framework, Create, Prepare, Destroy, Run, GetUnit, GetModule

### Auth Language
- User, Session, Account, Verification, Role, Access Control, Auth Event

### Logging Language
- Log Entry, Level, Service, Span, Trace, Buffer, Flush, Drain, Query, Stats

### PubSub Language
- Topic, Publish, Subscribe, Unsubscribe, Message, Handler, Retry, Priority, Queue, Schedule

### Storage Language
- File, Bucket, Key, Upload, Download, Archive, Signed URL, ETag, Metadata

### RPC Language
- Procedure, Router, Handler, Middleware, Context, Request, Response

### KV Store Language
- Key, Value, TTL, Cache, Evict, Scan, Increment, Decrement

### Organization Language
- Organization, Branch, Connection, Connection Contact, Connection Note, Address, Bank Account, Workflow

### Compliance Language
- Compliance Document, Compliance Obligation, Verification Rule, Audit Entry, Verification Status, Renewal Chain, Reminder Engine, Obligation Generator, Event Bridge

### Tasks Language
- Project, Task, Task Status, Task Type, Task Link, Saved View, Automation Rule, Time Entry, Task Reminder, Watcher, Activity Log

### Drive Language
- Drive Folder, Drive File, File Version, Label, Share, Public Link, Access Log, Trash, Storage Bridge, Path Service

### HR Language
- Employee, Attendance, Employee Check-in, Leave, Lifecycle, Overtime, Shift, Department, Designation, Employment Type
