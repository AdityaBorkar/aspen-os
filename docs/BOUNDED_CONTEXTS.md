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
│  CORE: AUDIT UNIT                                                │
│  Native platform unit — audit_log table, DB-record replayability│
│  write(entry, tx?), query(filters), reconstructState(), diff()  │
│  Not a conformist — no external dependency                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     DOMAIN MODULES                               │
│                                                                  │
│  ┌───────────────┐  ┌───────────────────┐  ┌───────────────┐   │
│  │ Recruiter App │  │ Organization      │  │ Compliance    │   │
│  │               │  │ Module            │  │ Module        │   │
│  │ creates via   │  │ 5 workflows       │  │ 5 workflows   │   │
│  │ SingleTenant  │  │ 7 tables          │  │ 3 services     │   │
│  │ Platform      │  │ 11 events         │  │ 3 tables       │   │
│  │ .create()     │  │ units: db, pubsub │  │ 23 events      │   │
│  └───────────────┘  └───────────────────┘  │ units: db,     │   │
│                                            │ kvStore, pubsub│   │
│  ┌───────────────┐  ┌───────────────┐     └───────────────┘   │
│  │ Tasks         │  │ Drive         │     ┌───────────────┐   │
│  │ Module        │  │ Module        │     │ HR Module     │   │
│  │ 11 workflows  │  │ 6 workflows   │     │ (partial)     │   │
│  │ 3 services    │  │ 5 services     │     │ 8 workflows    │   │
│  │ 17 tables     │  │ 8 tables       │     │ 50 tables      │   │
│  │ 10 events     │  │ 14 events      │     │ 43 events      │   │
│  │ units:        │  │ units:         │     │ not fully      │   │
│  │  db, pubsub   │  │  db, storage,  │     │ conformant     │   │
│  │               │  │  pubsub         │     └───────────────┘   │
│  └───────────────┘  └───────────────┘                          │
│  ┌───────────────────────────┐                                   │
│  │ Management Plane          │                                   │
│  │ Module                    │                                   │
│  │ 10 workflow groups        │                                   │
│  │ 2 owned + 2 shadow tables │                                   │
│  │ 16 events                 │                                   │
│  │ deps: organization        │                                   │
│  │ units: db, auth, pubsub   │                                   │
│  └───────────────────────────┘                                   │
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

**Contents** (inline in `packages/platform/src/server/index.ts` and `packages/platform/src/client/index.ts`):
- `Unit` interface — `{ readonly $name: string, $cleanup(): Promise<void>, $prepareInfra?(): Promise<void> }`
- `Module` interface — `{ readonly $name: N, readonly $dependencies: readonly string[], $initialize(units: Record<string, Unit>): void, $prepareInfra(): ModuleInfra, $prepareRuntime(): void | Promise<void>, $prepareTenant?(tenantId: string): Promise<void>, $cleanup(): void | Promise<void> }`
- `PlatformUnits` (server) — `{ audit, auth, db, kvStore, logs, pubsub, rpc, storage }` (8 units)
- `PlatformUnits` (client) — `{ auth, logs, rpc }` (3 units)

Both server and client use the `$` prefix for lifecycle methods and the name property.

**Note**: There is no separate `types.ts` file. The interfaces are defined inline at the top of each platform entry point. `DatabaseConfig`, `AuthConfig`, `LogConfig`, etc. live in their respective unit directories.

**Rules**:
- Changes to the shared kernel require coordinated updates across all units
- The shared kernel should remain minimal — only truly universal types
- No implementation details leak through the shared kernel

### 2. Customer-Supplier: Platform → Units

**Direction**: Platform classes create and wire units via `Platform.create(config, modules)`. Units have no knowledge of Platform. Three server platform classes: `SingleTenantPlatform`, `SharedTenantPlatform`, `IsolatedTenantPlatform`. The client has a single `Platform` class.

```
SingleTenantPlatform.create(config, modules)
SharedTenantPlatform.create(config, modules)
IsolatedTenantPlatform.create(config, modules)
    │
    ├── creates DatabaseUnit(config.db, tenancy config)
    ├── creates LogUnit(config.logs, { db })
    ├── creates AuditUnit({ db })
    ├── creates PubSubUnit(config.pubsub, { db })
    ├── creates AuthUnit(config.auth, { db, pubsub })
    ├── wires pubsub.setAuth(auth)
    ├── creates StorageUnit(config.storage, { db })
    ├── creates KvStoreUnit(config.kvStore, { db })
    ├── creates RpcUnit(config.rpc, { auth, db, logs, pubsub })
    ├── validates module $dependencies
    │
    └── calls mod.$initialize(units) for each module
        └── returns proxy-wrapped platform instance
```

**Dependency graph** (constructor injection):
```
DatabaseUnit ← LogUnit
DatabaseUnit ← AuditUnit
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

**Role model**: Roles are stored as a plain `text` column on the `user` table — not as separate entities. Access control statements are defined at the application level via `createAccessControl`, not at the platform level.

**Access control flow**: `AuthConfig` does NOT include `access_control` or `roles` fields. Instead, modules declare their ACL via `defineAcl()` (returning an `AclDeclaration` — a `Record<string, readonly string[]>`). During `prepareInfra()`, the platform merges all module ACLs and calls `AuthUnit.applyModuleAcl(mergedAcl)`, which creates an `AccessControl` via `createAccessControl` (from better-auth) and rebuilds the better-auth instance with the `admin({ ac: accessControl })` plugin. The initial `AuthUnit` construction does not include the admin plugin.

**Auth plugins**: `admin` (applied during `prepareInfra()` via `applyModuleAcl`, not at construction), `organization`, `username`, `phoneNumber`, `emailOTP`, `apiKey`, `lastLoginMethod`, `twoFactor`, `passkey`, and optionally `captcha` (when `cfSecretKey` is provided).

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

**Status**: Core unit, not optional. Required in `PlatformConfig`.

### 9. Core: Audit Unit

**Relationship**: `AuditUnit` is a core platform unit (`$name = "audit"`) providing a cross-module audit log with DB-record replayability. Constructor-injected with `{ db }`. Not a conformist to any external library — it is a native platform unit writing to the platform's own `audit_log` table.

**Public API**: `write(entry, tx?)` (with optional transaction handle for atomicity), `withTransaction(entry, fn)` (runs fn + audit write in one `db.transaction()`), `query(filters)`, `count(filters)`, `diff(before, after)` (field-level diff), `reconstructState(entityType, entityId)` (replays `audit_log` rows in `seq` order to reconstruct a record's current state).

**Schema**: `audit_log` table (platform core schema, pushed by `DatabaseUnit.getSchemas()`):
- `id` (text PK), `tenant_id` (text, default `'default'`), `seq` (bigserial — deterministic replay order), `action` (text), `crud_action` (text, nullable — create/update/delete), `actor_id` (text), `entity_type` (text), `entity_id` (text), `previous_state` (jsonb), `new_state` (jsonb), `changes` (jsonb — `Record<string, {new, old}>`), `metadata` (jsonb), `idempotency_key` (text, with partial unique index `UNIQUE(tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL`), `workflow_run_id` (text, nullable — optional provenance), `request_id` (text), `trace_id` (text), `performed_at` (timestamptz).

**Context integration**: Reads `actorId`, `tenantId`, `requestId`, `traceId` from `AsyncLocalStorage` context. Falls back to `actorId = "system"` when context has no actor.

**Design**: Layer 1 of ADR-0009 — deliberate, application-level capture. Workflows call `ctx.audit.write(...)` inline (not via a shared step). Layer 2 (trigger-based blind-write capture, ADR-0010) is not yet implemented.

**Status**: Core unit, not optional. Created in `BasePlatform.createCore()`.

### 10. Downstream: Recruiter → Platform

**Relationship**: Recruiter app creates the platform via `SingleTenantPlatform.create(config, modules)` and passes domain modules.

**Lifecycle**:
```
SingleTenantPlatform.create(config, [organization, tasks])
    → p.$prepareInfra()  // unit.$prepareInfra() + collect mod.$prepareInfra() + db.prepareWithModules() + auth.applyModuleAcl() + mod.$prepareRuntime()
    → p.run(fn)         // AsyncLocalStorage context
    → p.$cleanup()       // mod.$cleanup() then unit.$cleanup()
```

**Adaptations**:
- Domain resources mapped to auth statements
- Roles defined for recruitment workflow
- Environment variables mapped to framework config
- Currently registers `organization` and `tasks` modules

### 11. Downstream: Organization Module → Platform

**Relationship**: Organization module implements the `Module` interface and receives unit dependencies via `$initialize(units)`.

**Structure** (`packages/organization/`):
- `Organization.create()` — factory that returns a Module instance
- `$initialize()` — empty (newer pattern: workflows are readonly properties, no unit refs stored)
- 5 workflows: `OrganizationWorkflow`, `BranchWorkflow`, `AddressWorkflow`, `BankAccountWorkflow`, `ConnectionWorkflow`
- 7 database tables (all tenant_schemas): `organization`, `branch`, `connection`, `connection_contact`, `connection_note`, `address`, `bank_account`
- 11 domain events published via PubSub
- Valibot validation schemas for all inputs
- `$prepareInfra()` returns declarative infra (db schemas, acl, events) — schema pushing handled centrally by platform

**Exposed on platform instance**: `p.organization.addresses`, `p.organization.bankAccounts`, `p.organization.branches`, `p.organization.connections`, `p.organization.organizations`

### 12. Downstream: Compliance Module → Platform

**Relationship**: Compliance module implements the `Module` interface and receives `{ db, kvStore, pubsub }` via `$initialize(units)`.

**Structure** (`packages/compliance/`):
- `Compliance.create(config)` — factory that returns a Module instance
- 5 workflows: `DocumentWorkflow`, `ObligationWorkflow`, `VerificationWorkflow`, `AuditWorkflow`, `DashboardWorkflow`
- 3 services (lifecycle-managed): `EventBridge`, `ObligationGenerator`, `ReminderEngine` — registered in `$prepareRuntime()`, unregistered in `$cleanup()`. `StatusDerivation` is a utility (pure functions used internally by workflows and the reminder engine, not lifecycle-managed).
- 3 database tables (all tenant_schemas): `compliance_document`, `compliance_obligation`, `compliance_verification_rule`
- 23 domain events published via PubSub
- `$prepareInfra()` — returns declarative infra (db schemas, acl, events)
- `$prepareRuntime()` — registers reminder cron schedules, obligation generator handler, and event bridge subscriptions
- Audit entries written via the platform's `ctx.audit.write(...)` (the `AuditWorkflow` queries the platform `audit_log` via `ctx.audit.query(...)`)

**Cross-context integration**: The `EventBridge` service subscribes to events from other modules:
- `hr:employee_onboarded` → creates background check + ID verification documents
- `hr:employee_separated` → creates exit documents + final settlement documents
- `fleet:vehicle_registered` → creates pollution certificate + semi-annual obligation
- `organization:branch_created` → creates trade license + fire safety certificate + annual obligation
- `accounting:financial_year_started` → creates monthly GST return obligation
- `organization:connection_created` → creates insurance policy document (if type is insurer)

**Config**: `ComplianceModuleConfig = { country: "INDIA", dashboardCacheTtl?, defaultEscalationDays?, defaultReminderDays? }`

### 13. Downstream: Tasks Module → Platform

**Relationship**: Tasks module implements the `Module` interface and receives `{ db, pubsub }` via `$initialize(units)`.

**Structure** (`packages/tasks/`):
- `Tasks.create(config?)` — factory that returns a Module instance
- `$initialize()` — empty (newer pattern)
- 11 workflows: `TaskWorkflow`, `ProjectWorkflow`, `StatusWorkflow`, `TaskTypeWorkflow`, `CommentWorkflow`, `LinkWorkflow`, `TimeEntryWorkflow`, `ReminderWorkflow`, `ViewWorkflow`, `AutomationWorkflow`, `CollaborationWorkflow`
- 3 service files: `notification-bridge.ts` (not imported by any workflow — dead code), `report-service.ts` (not imported by any workflow — dead code), `dependency-graph.ts` (used by `workflows/link.ts`). `filter-engine.ts` is a utility in `utils/`, not `services/`.
- 17 database tables (6 control_plane: `label`, `project`, `projectMember`, `status`, `statusTransition`, `taskType`; 11 tenant: `task`, `taskAssignee`, `taskLink`, `timeEntry`, `reminder`, `activityLog`, `comment`, `attachment`, `watcher`, `savedView`, `automationRule`) — the only module that splits tables between both control_plane and tenant
- 10 domain events published via PubSub
- `$prepareInfra()` returns declarative infra (db schemas, events) — schema pushing handled centrally by platform
- ACL is empty (`defineAcl({})`)

**Config**: `TaskModuleConfig = { enableNotifications?: boolean }`

### 14. Downstream: Drive Module → Platform

**Relationship**: Drive module implements the `Module` interface and receives `{ db, storage, pubsub }` via `$initialize(units)`.

**Structure** (`packages/drive/`):
- `Drive.create(config?)` — factory that returns a Module instance
- 6 workflows: `FileWorkflow`, `FolderWorkflow`, `LabelWorkflow`, `ShareWorkflow`, `PublicLinkWorkflow`, `TrashWorkflow`
- 5 services: `AccessService`, `ArchiveService`, `PathService`, `SearchService`, `StorageBridge` — all wired as readonly grouped accessor objects on the module class
- 8 database tables (all tenant_schemas): `drive_folder`, `drive_file`, `drive_file_version`, `drive_label`, `drive_item_label`, `drive_share`, `drive_public_link`, `drive_access_log`
- 14 domain events published via PubSub
- `$prepareInfra()` — returns declarative infra (db schemas, events)
- `$prepareRuntime()` — registers trash purge cron (`0 3 * * *`) on topic `drive:auto-purge`
- ACL is empty (`defineAcl({})`)

**Config**: `DriveModuleConfig = { allowedContentTypes?, maxFileSize?, maxNestingDepth?, maxVersions?, trashRetentionDays?, ... }`

### 15. Downstream: HR Module → Platform (Partial)

**Relationship**: HR module implements most of the `Module` interface and receives unit dependencies via `$initialize(units)`. Partially conformant.

**Current state**: 8 workflow files (`access.ts`, `attendance.ts`, `employee.ts`, `leave.ts`, `lifecycle.ts`, `overtime.ts`, `setup.ts`, `shift.ts`) with ~235 public methods across 50 database tables. The `HrModule` class has `$name = "hr"`, `static create()`, `$initialize()` (wires all 8 workflows with `units.db.db`), `$prepareInfra()` (returns full `ModuleInfra` with ACL, 14 control-plane schemas + 36 tenant schemas, and 8 event groups), and `$cleanup()`. However, it does NOT declare `implements Module` and lacks `$prepareRuntime()`. The HR event map defines 43 events across 8 groups (`EmployeeEventMap`, `AttendanceEventMap`, `LeaveEventMap`, `LifecycleEventMap`, `OvertimeEventMap`, `SetupEventMap`, `ShiftEventMap`, `AccessEventMap`), all combined into `HrEventMap`.

### 16. Downstream: Management Plane Module → Platform

**Relationship**: Management Plane module implements the `Module` interface. Uses a hybrid pattern — private `#db` field (older pattern), but `$prepareRuntime()` and `$cleanup()` are empty (newer pattern). Workflows are exposed as grouped accessor objects (getter for `tenants`, readonly for `serviceProviders` and `users`).

**Structure** (`packages/management-plane/`):
- `ManagementPlane.create(config)` — factory that returns a Module instance
- `$name = "management"`, `$dependencies = ["organization"]`
- `$initialize({ db, auth, pubsub })` — stores `db` only; `auth` and `pubsub` accepted but unused
- 3 workflow groups: `tenants` (onboard, get, list, update, activate, suspend, reactivate, churn, assignSP, unassignSP), `serviceProviders` (create, get, list, update, activate, deactivate, getAssignedTenants, getUsers), `users` (create, get, list, update, delete, assignRole, assignToServiceProvider)
- 3 workflow step files: `fetch-tenant`, `fetch-sp`, `fetch-user` (in `steps/`)
- 2 owned database tables (pushed via `$prepareInfra()` control_plane_schemas): `service_provider`, `tenant`
- 2 shadow table definitions (pushed via `$prepareInfra()` tenant_schemas — mirrors of better-auth tables for joins): `organization`, `user` (with added `spId` column)
- 16 domain events: 8 tenant + 4 service_provider + 4 platform_user
- Audit entries written via the platform's `ctx.audit.write(...)` inline in each workflow (NOT via a shared `logAuditStep` — the management plane does not own a separate `audit_log` table)
- `$prepareInfra()` returns declarative infra (db schemas, acl, events) — schema pushing handled centrally by platform
- Has build step (build script + `build` field in package.json)

**Config**: `ManagementPlaneConfig = undefined` (known WIP gap — provisioning workflow expects richer config with `tenantDbNamingScheme`, `defaultTenantDbHost`, `postgresAdminConnection`, `moduleSchemas`)

**ACL**: 3 resources (platformUser, serviceProvider, tenant)

**Roles**: `platform_admin`, `sp_user`, `tenant_admin`, `tenant_user`

**Exposed on platform instance**: `p.management.tenants`, `p.management.serviceProviders`, `p.management.users`

### 17. Client Platform

**Exported as**: `@aspen-os/platform/client`

**Relationship**: A separate client `Platform` class for browser-side use with 3 units:
- `AuthUnit` — wraps better-auth React client with plugins (admin, emailOTP, username, phoneNumber)
- `LogsUnit` — stub (stores config only, no logging methods)
- `RpcUnit` — stub (no-op)

**No database dependency**: Client platform has no `DatabaseUnit`, `PubSubUnit`, `StorageUnit`, `KvStoreUnit`, or `AuditUnit`.

**Context**: The client has `setContext()`/`getContext()` in `client/context.ts` (module-level variable, not `AsyncLocalStorage`). The `Platform.run(fn)` method sets client-side context (`{ auth, logs, rpc }`) and invokes `fn`.

## Integration Patterns

### Platform.create() (Static Factory)

All units are created and wired inside `Platform.create()`:

```typescript
import { SingleTenantPlatform } from "@aspen-os/platform/server"

const p = SingleTenantPlatform.create(
  { auth, db, kvStore, logs, pubsub, rpc, storage },  // SingleTenantConfig
  [organization, tasks],                                // modules array
);
```

This:
1. Instantiates all 8 units in dependency order
2. Wires pubsub↔auth (setAuth)
3. Validates module `$dependencies`
4. Calls `mod.$initialize(units)` on each module
5. Returns a proxy-wrapped platform instance that allows `p.organization` syntax

### AsyncLocalStorage Context

The `run()` method provides request-scoped context. Signature varies by platform class:

```typescript
// SingleTenantPlatform — no tenantId
await p.run(async () => {
  const { audit, auth, db, pubsub } = getContext();
  // db: NodePgDatabase (drizzle instance)
  // pubsub: PubSubUnit (full unit, not just publish)
  // audit: AuditUnit (platform audit log)
});

// SharedTenantPlatform / IsolatedTenantPlatform — tenantId required
await p.run(tenantId, async () => {
  const { audit, auth, db, pubsub, tenantId } = getContext();
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
- Management Plane: 16 events (8 tenant + 4 service_provider + 4 platform_user)
- HR: 43 events (8 event groups across employee, attendance, leave, lifecycle, overtime, setup, shift, access)

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

Modules declare their DB schemas via `$prepareInfra()` (returns `{ db: { control_plane_schemas, tenant_schemas } }`). The platform collects all module schemas and applies them centrally via `DatabaseUnit.prepareWithModules()`:

```
Platform.prepareInfra()
    → unit.$prepareInfra()                    // core infra (db pool, pubsub boss, etc.)
    → mod.$prepareInfra() for each module     // collect { db, auth, events } declarations
    → DatabaseUnit.prepareWithModules(schemas) // pushSchema(coreSchemas + moduleSchemas, db)
    → AuthUnit.applyModuleAcl(acl)            // store merged ACL metadata
    → mod.$prepareRuntime() for each module   // register pubsub schedules/handlers
    → [isolated only] $prepareTenant(tenantId) per tenant
    → [shared only] db.applyRlsPolicies()
```

Schemas collected by `DatabaseUnit.prepareWithModules()`: core schemas (`auditSchema`, `authSchema`, `logSchema`, `storageSchema`, `kvStoreSchema`, `workflowSchema`) merged with module `db.control_plane_schemas` and `db.tenant_schemas` from `$prepareInfra()`.

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
| Platform | Customer | — | Units, Modules | Creates & wires via `create()` — three server classes + one client class |
| Auth | Conformist | better-auth | Modules | Adapts API |
| Logs | Conformist | pino, OTel | — | Adapts API |
| PubSub | Conformist | pg-boss | — | Adapts API |
| Storage | Partner | S3 (AWS SDK) | Drive module | Defines interface |
| RPC | Conformist | oRPC | — | Adapts API |
| KV Store | Conformist | Postgres | Compliance module | Redis-like API (core) |
| Audit | Core | — | All modules | Native platform unit — `audit_log` table, DB-record replayability |
| Client Platform | — | — | — | Browser-side (3 units) |
| Recruiter | Downstream | Platform | — | Uses `SingleTenantPlatform`, registers organization + tasks |
| Organization | Downstream | Platform | Compliance, Management Plane | 5 workflows, 7 tables |
| Compliance | Downstream | Platform, HR, Organization, Fleet, Accounting | — | 5 workflows, 3 tables, 3 services, subscribes to external events |
| Tasks | Downstream | Platform | — | 11 workflows, 17 tables (6 control + 11 tenant) |
| Drive | Downstream | Platform, Storage | — | 6 workflows, 8 tables, 5 services |
| Management Plane | Downstream | Platform, Organization | — | 10 workflow groups, 2 owned + 2 shadow tables, 16 events, has build step |
| HR | Downstream (partial) | Platform | Compliance | 8 workflows, 50 tables, 43 events, not fully conformant |
| Accounting | Stub | — | — | Package.json only |
| CRM | Stub | — | — | Package.json only |
| Fleet | Stub | — | — | Package.json only |
| Inventory | Stub | — | — | Package.json only |
| Reports | Stub | — | — | Package.json only |
| Pharmacy | Stub | — | — | Package.json only |

## Language Boundaries

### Platform Kernel Language
- Platform, Platform (client), Unit, Module, Create, PrepareInfra, Destroy, Run, GetUnit, GetModule, $dependencies, Workflow, WorkflowStep, WorkflowContext, StepRunner, RunOptions, StepOptions

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

### Audit Language
- Audit Entry, Audit Log, CrudAction, Idempotency Key, Workflow Run, Workflow Step, Reconstruct State, Diff, Write, Query, WithTransaction

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

### Management Plane Language
- Tenant, Tenant Status, Service Provider, Platform User, Audit Log, Provisioning, Tenant Resolver, Control Plane, Tenant Database, Platform Admin, Service Provider User, Report
