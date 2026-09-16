# Aspen OS

Aspen OS = business application framework on Bun/TypeScript. Platform kernel provides composable infrastructure (database, auth, logging, pub/sub, RPC, storage, KV store) so domain modules build on top without reinventing plumbing.

> **Ubiquitous-language harmonization (2026-09-09, re-verified 2026-09-16 against code):** `Contact` = Masters business relationship (canonical); others are `ContactRef/AttendeeContact/RecipientContact` in prose (enum values stay wire-compat). `Connection` = Masters integration credential (glossary note; never business relationship). `Reminder` = Calendar (single dispatcher); `DeliverySchedule` = Workspace (per-dashboard cron). Compliance `reminder_*` → `expiry_policy_*`; `SCHEDULE_EVENTS` alias deleted. `Notification` = Comms inbox; `Announcement` = HR authoring only (`announcement.published` is intent, Comms owns delivery). `Dashboard` = Workspace composable; Compliance `Summary` (renamed `dashboard.*` → `summary.*`, `getSummary` kept; `dashboard` remains a deprecated alias). `Draft` = Workspace entity; others are draft status values. `AuditLog` = platform store; per-module `ActivityFeed` is projection (Tasks `activity_log` exempt). `Tenant` = SaaS customer (Management); Masters `Entity` + `OrgBranch`; `organization` package does not exist on disk — org surface is `masters.orgBranches` + `management.organizations`. Roles scoped: `PlatformRole, ProjectRole, HrRole, ChannelRole`. `Share` (grant) + `PublicLink` (token) = DMS; `Attendee` = Calendar invite. Masters has no `bank_account` table — bank details are inline fields on `payment_method`.

## Language

### Platform Kernel

**Platform**:
Server side has no generic `Platform` class — three self-contained classes, one per tenancy architecture: `SingleTenantPlatform`, `SharedTenantPlatform`, `IsolatedTenantPlatform`. Each has its own `create(config, modules)` static factory. Created via `XxxPlatform.create(config, modules)`, which instantiates all Units, validates module `$dependencies`, calls `module.$initialize(units)` on each module, returns proxy-wrapped instance. Lifecycle: `create()` → `$prepareInfra()` → `run()` → `$cleanup()`.
_Avoid_: Framework (on server), App, Container, DI Container

**Platform** (client only):
Client-side orchestrator class. Created via `Platform.create(config, modules)` w/ 3 units (auth, logs, rpc). No database, no tenancy. Has `run(fn)` method that sets client-side context (module-level variable, not `AsyncLocalStorage`) w/ `{ auth, logs, rpc }`, invokes `fn`. The generic `Platform` name exists only on the client; server exports a `PlatformInstance` type only.
_Avoid_: Framework (on client — class renamed to `Platform`), App, Container, DI Container

**Unit**:
Infrastructure building block w/ `$name`, required `$cleanup()` method, optional `$prepareInfra()` method. Eight core server units: `db`, `auth`, `logs`, `pubsub`, `rpc`, `storage`, `kvStore`, `audit`. Three client units: `auth`, `logs`, `rpc`. Both server + client Unit interfaces use `$` prefix for lifecycle methods + name property.
_Avoid_: Service, Provider

**Module**:
Business logic plugin passed to `XxxPlatform.create()`. Receives unit dependencies via `$initialize(units)`. Declares infra needs via `$prepareInfra()` (returns `ModuleInfra`), runtime setup via `$prepareRuntime()`, optional per-tenant setup via `$prepareTenant?(tenantId)` (isolated mode only). Declares hard module dependencies via `$dependencies: readonly string[]` (validated at `create()` time — throws if dependency not provided) and introspection-only peer topics via `$consumes: readonly string[]` (never validated). Accessed on platform instance via proxy — e.g. `p.masters`. Both server + client Module interfaces use `$` prefix.
_Avoid_: Plugin, Extension

**Create**:
Per-class static factory (`SingleTenantPlatform.create`, `SharedTenantPlatform.create`, `IsolatedTenantPlatform.create`). Instantiates all Units from config, validates module `$dependencies`, calls `module.$initialize(units)` on each module, returns proxy-wrapped platform instance. Only way to construct a Platform — constructor internal.
_Avoid_: Register, Mount, Attach

**PrepareInfra**:
Post-creation infrastructure setup on all Units + Modules. Called after `create()`. Runs each `unit.$prepareInfra()` under a `$global` context, collects `mod.$prepareInfra()` declarations (schemas, ACL, events) from modules, merges them, calls `db.prepareWithModules()` (schema push) + `auth.applyModuleAcl()`, then `mod.$prepareRuntime()` on each module under `$global`. In isolated mode, also iterates tenants from `resolver.list()` + calls `mod.$prepareTenant(tenantId)` per tenant (errors logged, non-fatal). In shared mode, applies RLS policies via `db.applyRlsPolicies()`. PubSub boss stays lazy — `$prepareInfra()` on PubSubUnit is a no-op.
_Avoid_: Migrate, Setup, Prepare

**Run**:
Executing a function within `AsyncLocalStorage` context providing `audit`, `auth`, `db` (per-request drizzle instance), `log`, `pubsub`. Uniform signature on all three server classes: `run(tenantId, fn)` (`BasePlatform.run`, incl. `SingleTenantPlatform` — there is no zero-arg server `run(fn)`). `"$global"` routes to the control-plane DB; any other ID resolves per mode (shared: RLS transaction setting `app.tenant_id` + `SET LOCAL ROLE tenant_role`; isolated: per-tenant pool via `getTenantDb`, throws for unknown tenant outside isolated mode).
_Avoid_: Execute, Dispatch

**Destroy**:
Graceful shutdown of all Modules, then all Units (via `Promise.allSettled`, `AggregateError` on failure). Clears internal state. Implemented as `$cleanup()`, not `destroy()`.
_Avoid_: Shutdown

**GetUnit**:
Typed accessor to retrieve a Unit by name after creation. Requires a name — no zero-arg overload.
_Avoid_: Resolve, Get

**GetModule**:
Typed accessor to retrieve a Module by name. Requires a name — throws if not found. No zero-arg overload.
_Avoid_: Resolve, Get

**Health Check**:
There is no `BasePlatform.healthCheck()`. Liveness = RPC `health.check` procedure (trivial `base.handler(async () => ({ status: "ok" }))`, routed as `health.check` alongside `echo`) plus `PubSubUnit.getUnsubscribedProducedTopics()` — topics published to w/ no registered subscriber (pg-boss silently drops these, so they flag a producer/consumer wiring bug; `publish()` warns but does not throw on the no-id result).
_Avoid_: Ping, Health Probe, Heartbeat (as platform method names)

### Database

**DatabaseUnit**:
Core unit owning `pg.Pool` + drizzle `NodePgDatabase`. `$name` = `"db"`. Exposes `$prepareInfra()` which runs `pushSchema()` from drizzle-kit to apply schema migrations. Also exposes `tenancyMode`, `controlPlaneDb`, `resolver`, `pool`, `applyRlsPolicies()`, `prepareWithModules()`, `getTenantDb()`, `provisionTenant()`, `runWithTenant()`.
_Avoid_: DbUnit, ConnectionPool

**DatabaseConfig**:
Connection parameters: `host`, `port`, `user`, `password`, `database`, `ssl?`, `maxConnections?`.

### Authentication

**AuthUnit**:
Core unit wrapping better-auth. Exposes `service` getter (better-auth instance, incl. `.api` admin/organization endpoints), HTTP handler (`fetchHandler(request)`), `_` getter w/ REST-style `resource.action` workflow methods for user, session, role management. (Browser-side `AuthUnit` in `@aspen-os/platform/client` wraps better-auth React client instead.) ACL **not** part of `AuthConfig` — applied later during `prepareInfra()` via `AuthUnit.applyModuleAcl(mergedAcl)`, which creates `AccessControl` from merged module ACL declarations + rebuilds better-auth instance w/ `admin({ ac: accessControl })` plugin. Initial construction includes `admin()` without `ac` — AC applied only after module infra collected.
_Avoid_: Auth, AuthProvider

**User**:
Authenticated identity w/ `id`, `email`, `name`, optional `phoneNumber`, `image`, `role` (text field), metadata. Passwords stored in separate `account` table, not on user record.
_Avoid_: Account, Profile

**Session**:
Time-bounded authentication token tied to a User. Has `id`, `token`, `userId`, `expiresAt`. Cascades delete from User. `AuthConfig` extends `BetterAuthOptions`, so session expiry configured via `AuthConfig.session.expiresIn` + forwarded into `betterAuth({ ...config, ... })`; better-auth handles expiry internally.
_Avoid_: Token, Login

**Account**:
Credential record linking a User to an authentication provider (email/password, OAuth, etc.). Stores `password`, `accessToken`, `refreshToken`, provider metadata. Not same as User.
_Avoid_: Credential, AuthMethod

**Role**:
Plain text field on the User table. In Recruiter app, values `admin`, `bd`, `caller`, `qc`, `rm`, `sc`, `tl`. Not separate entity — no dedicated role table exists (HR's own RBAC is a separate sub-domain).
_Avoid_: Permission Group, Access Level

**Access Control**:
Declarative statement matrix defining `{ resource: [actions...] }`. Modules declare ACL via `defineAcl()` (type-helper from `@aspen-os/platform/server`) returning `AclDeclaration`. During `prepareInfra()`, platform merges all module ACLs + calls `AuthUnit.applyModuleAcl(mergedAcl)`, which creates `AccessControl` via `createAccessControl` (from better-auth) + rebuilds better-auth instance w/ `admin({ ac: accessControl })` plugin. Initial `AuthUnit` construction includes `admin({})` without `ac` — AC applied only after module infra collected.
_Avoid_: Permission Matrix, ACL

**Auth Event**:
Typed domain event contract defined in auth services (`services/{role,session,user}.ts`). Events: `user.created`, `user.updated`, `user.deleted`, `session.created`, `session.invalidated`, `role.assigned`, `role.unassigned`, `role.deleted`. Published via PubSub as plain string topics — type-level contract, not runtime bus.
_Avoid_: Auth Signal, Auth Hook

### Logging

**LogUnit**:
Core unit providing pino-based structured logging w/ buffered writes to Postgres `logs` table. Integrates OpenTelemetry span context.
_Avoid_: Logger, LoggingService

**LogEntry**:
Append-only record: `id`, `level`, `message`, `service`, `timestamp`, `metadata`, `error`, `traceId`, `spanId`, `userId`, `requestId`, `duration`.
_Avoid_: Log Record, Log Line

**LogLevel**:
Severity enum: `debug`, `info`, `warn`, `error`, `fatal`.
_Avoid_: Severity, Priority

### Pub/Sub

**PubSubUnit**:
Core unit backed by pg-boss. Topic-based publish/subscribe over Postgres job queue. Exposes `publish`, `publishBatch`, `subscribe`, `unsubscribe`, `getQueueSize`, `purgeQueue`, `schedule`, `unschedule`, `getSchedules`, `getUnsubscribedProducedTopics`. Uses single control-plane pg-boss started lazily on first use (not in `$prepareInfra()`). Tracks produced topics so callers can flag topics published to w/ no registered subscriber — pg-boss silently drops these (its `send()` returns no job id). On such no-id result, `publish()` warns but does not throw.
_Avoid_: EventBus, MessageBroker

**Topic**:
Named message channel. Messages published to topics, consumed by subscribers.
_Avoid_: Queue, Channel, Subject

**Message**:
Typed payload w/ `id`, `name`, `data`, `createdOn`. Generic over `T`.
_Avoid_: Event, Payload

**PublishOptions**:
Retry + delivery configuration: `retryLimit`, `retryDelay`, `retryBackoff`, `priority`, `expireInMinutes`, `startAfter`.
_Avoid_: DeliveryConfig, SendOptions

### File Storage

**StorageUnit**:
Core unit providing S3-compatible object storage w/ Postgres metadata tracking.
_Avoid_: FileUnit, ObjectStore

**FileMetadata**:
Postgres record tracking S3 objects: `id`, `key`, `bucket`, `contentType`, `size`, `etag`, `metadata`, `archived`, `archivedKey`, `createdAt`, `updatedAt`.
_Avoid_: FileRecord, FileInfo

**Key**:
Unique S3 object identifier stored in `file_metadata.key`.
_Avoid_: Path, Filename

**Archive**:
Soft-delete that moves a file to a new key + marks original as archived.
_Avoid_: SoftDelete, Trash

**Signed URL**:
Time-limited presigned URL for direct S3 upload or download.
_Avoid_: PresignedLink, TempUrl

### RPC

**RpcUnit**:
Core unit providing type-safe API layer via oRPC. Exposes router w/ middleware support.
_Avoid_: ApiUnit, EndpointUnit

**Procedure**:
Named RPC handler w/ typed input/output. Built-in: `echo`, `health.check` (trivial ok-probe, not a platform aggregate).
_Avoid_: Endpoint, Action

**RpcContext**:
Request context passed to procedures: `{ db, pubsub }`.
_Avoid_: RequestContext, HandlerContext

### Workflow (framework-level)

**Workflow**:
Framework-level builder for durable, step-based workflows persisted to `workflow_runs` + `workflow_steps` tables. `Workflow.name(name).handler(fn)` or `Workflow.name(name).input(schema).handler(fn)` returns `WorkflowInstance` w/ `.run(input, options?)`. Handler receives `WorkflowContext` (`{ actorId, audit, auth?, config, db, pubsub, runId, step }`), may call `ctx.step.run(stepInstance, input)` or `ctx.step.run("name", fn)` for sub-steps (persisted, deduped by `(runId, stepName)`, retried per `StepOptions.retries`). `ctx.step.sleep(ms)` also available. `RunOptions` (`{ actorId?, audit?, auth?, config?, db?, pubsub? }`) overrides context defaults; if omitted, uses `getContext()`. Throws if `db`/`pubsub`/`audit` missing. Steps defined w/ `WorkflowStep.name(name).handler(fn)` or `.input(schema).handler(fn)` return `WorkflowStepInstance` — reusable across workflows.
_Avoid_: Job, Task (collides with Tasks domain), Pipeline

**Workflow Run**:
Persisted execution record in `workflow_runs`: `id`, `workflowName`, `status` (running/completed/failed), `input`, `output`, `error`, `startedAt`, `completedAt`, `durationMs`, `tenantId`, `metadata`. One per `.run()` call.
_Avoid_: Execution, Run Record

**Workflow Step**:
Persisted sub-step record in `workflow_steps`: `id`, `runId`, `stepName`, `status` (pending/running/completed/failed/skipped), `attempt`, `output`, `error`, `startedAt`, `completedAt`, `durationMs`. Deduped by `(runId, stepName)` — completed step skipped on retry.
_Avoid_: Stage, Phase

### KV Store

**KvStoreUnit**:
Core unit providing Redis-like key-value API over Postgres `kv_store` table (regular `pgTable`, not UNLOGGED) w/ TTL support. `$name` = `"kvStore"`.
_Avoid_: CacheUnit, RedisUnit

**KVEntry**:
Key-value pair: `key` (PK), `value` (text, JSON-serialized), `expiresAt` (nullable TTL), `updatedAt`.
_Avoid_: CacheEntry, KVPair

**TTL**:
Time-to-live on a KV entry. Expired entries lazily evicted on read, not by background job.
_Avoid_: Expiration, TTL

### Audit

**Audit**:
Core server unit (`AuditUnit`, `$name = "audit"`) providing cross-module, platform-level audit log w/ DB-record replayability. Writes to `audit_log` table (platform schema) w/ `seq bigserial` for deterministic ordering, `idempotency_key` for dedup, `crud_action` (create/update/delete), `previous_state`/`new_state`/`changes` for full-state capture, `workflow_run_id` for optional workflow provenance. Exposes `write(entry, tx?)` (optional transaction handle for atomicity), `withTransaction(entry, fn)` (convenience wrapper), `query(filters)`, `diff(before, after)`, `reconstructState(entityType, entityId)` (replays `audit_log` rows in `seq` order to reconstruct record's current state), `count(filters)`. Reads `actorId` + `tenantId` from `AsyncLocalStorage` context. Layer 1 of ADR-0009 (deliberate, application-level capture); Layer 2 (trigger-based blind-write capture, ADR-0010) not yet implemented.
_Avoid_: Audit Trail, Change Log, Audit Service

### Organization Surface (no package)

> There is no `packages/organization` on disk. The former organization module's surface now lives in **Masters** (`p.masters.orgBranches`: `create`, `get`, `list`, `tree`, `update` over the `org_branch` table) and **Management** (`p.management.organizations`, control-plane read model). Organization profile fields (name, branding, logo) live in Masters settings (`org.*` keys). Do not import `@aspen-os/organization` — it does not exist.

### Masters Domain

**Contact**:
Standalone business relationship record (vendor/client/insurer/…) w/ `name`, `email`, `phone`, `title`, `company`, `type` (`CONTACT_TYPE`), per-scope `isPrimary` flag. Scoped to owner via `(entityType, entityId)`; may be global (owner-less, DMS address-book entries). Soft-remove via `remove(reason)` publishes `masters.contact_removed` (DMS revokes shares).
_Avoid_: Connection (business relationship)

**Connection**:
**Integration connection** to external API/entity — `type` (`INTEGRATION_TYPE`: api_key/oauth2/webhook/basic_auth/database/other), `status` (active/inactive/expired/revoked), `baseUrl`, `description`, `credentialRef` referencing encrypted secret in platform `kvStore`. Credential material never stored in plaintext; `test` validates endpoint, `rotateCredential` writes new kvStore secret + bumps `credentialRef`.
_Avoid_: Vendor, Client, Partner (those are `Contact` records)

**Address**:
Postal address w/ `line1`, `line2`, `city`, `state`, `postalCode`, `country` (ISO alpha-2 uppercase), optional `label`, per-scope `isPrimary` flag. Scoped via `(entityType, entityId)`.
_Avoid_: Location, Street Address

**Entity**:
Tenant-level business party (company/institution) w/ rich metadata — `name`, optional unique `code`, `type` (`ENTITY_TYPE`: customer/vendor/partner/hospital/clinic/laboratory/pharmacy/insurer/regulator/bank/staffing_agency/training_institute/government/other), `status` (`ENTITY_STATUS`: active/inactive/archived), `industry`, `website`, `phone`, `email`, `taxId`, `registrationNumber`, `foundedDate`, `timezone`, `locale`, optional `organizationId` link. It is an **owner** (a `master_entity_type` value) so existing masters can scope to it; `setStatus` enforces `active` ↔ `inactive`, → `archived` (terminal).
_Avoid_: "Entity" for any polymorphic row owner; Vendors/Clients/Insurers (those are `Contact` records)

**Unit of Measure**:
Tenant-wide reference data (not polymorphic) — units across `UOM_CATEGORY` (length/mass/volume/count/time/area/temperature/data/session/other) w/ `name`, unique `code` (case-insensitive), `symbol` (unique, alias-collision-checked), `decimalPlaces`, `isBaseUnit`, `baseUnitId` (self-reference, same category), `conversionFactor`, `isActive`, `status` (`draft`/`published`/`inactive`), `isDefault` (one per category), `isSystem` (governed seed rows), `isIndivisible` (whole quantities only). Lifecycle: `create`, `publish`, `retire`; `setDefault` reassigns category default; `convert` does same-category active-only math; `seed` bootstraps system units; renames alias old code (`master_uom_alias`); factor changes append `master_uom_version` rows. Exactly one base unit per category; derived units reference category's base; unit referenced as another's `baseUnitId` cannot be deleted.
_Avoid_: Per-owner UOM sets; "measurement unit" synonyms

**Payment Method**:
Mode of payment w/ `type` (`PAYMENT_METHOD_TYPE`: bank_account/card/upi/imps/cheque), `direction` (`inbound`/`outbound`/`both`), `status` (`active`/`inactive`/`archived`), type-specific inline detail fields (card: `cardBrand`/`cardLast4`/expiry; upi: `upiId`; bank-backed: `accountHolderName`/`accountNumber`/`bankName`), per-`(entityType, entityId, direction)` `isPrimary` flag. There is no `master_bank_account` table — bank details live inline on the payment method. **Card data masked-only** — no PAN, no CVV, no token refs.
_Avoid_: Payment, Transaction, Ledger (this is method _configuration_, not payment execution)

**Label (Masters)**:
Scope-keyed tag (`name`, `color`, optional `(scopeType, scopeId)`; null pair = global) applied through the `master_entity_label` join (unique per `(entityType, entityId, labelId)`). Surfaced as `p.masters.labels` (`create`, `apply`, `remove`, `list`, `listByLabel`); DMS subscribes to `masters.label_created/_updated/_removed` to mirror its cache.
_Avoid_: Tag, Category (DMS `dms_label` is the file/folder tag)

**Org Branch**:
Physical or logical location in Masters (`org_branch`, no `master_` prefix) w/ `name`, unique `code`, `type` (headquarters/office/warehouse/store/factory/remote/other), optional `parent_org_branch` tree. Surfaced as `p.masters.orgBranches` (`create`, `get`, `list`, `tree`, `update`).
_Avoid_: Location, Site, Office

**Setting (Masters)**:
Tenant/user key-value (`key`, `value` jsonb, `(key, user_id)` unique). Keys under `org.` are tenant-wide (`org.id`, `org.branding`, `org.logo`); all other keys are per-user (`user_id = actorId`). Surfaced as `p.masters.settings` (`get`, `set` upsert, audit-logged, no events).
_Avoid_: Preference (that is comms routing), Workspace Setting

**Master Entity Scope**:
Every polymorphic masters row owned by `(entityType, entityId)` pair where `entityType ∈ { organization, branch, connection, contact, entity }` (`master_entity_type`). All list queries filter on pair; primary flags scoped to it — for payment methods per `(entityType, entityId, direction)`. `unitOfMeasure` tenant-wide (no scope pair); contacts may be global (null pair).
_Avoid_: Bare `entityId` without `entityType`

**Masters Workflow**:
Domain operation within Masters module, built on platform `Workflow` builder. Nine groups exposed on module instance: `p.masters.addresses`, `p.masters.contacts`, `p.masters.entities`, `p.masters.labels`, `p.masters.orgBranches`, `p.masters.paymentMethods`, `p.masters.settings`, `p.masters.unitsOfMeasure`, `p.masters.connections` (getter-bound to platform `kvStore` for secret storage). 12 tenant tables, 12 pgEnums, 32 events, 9 ACL resources. `$dependencies = []`; units `db`, `kvStore`.
_Avoid_: Service, Handler

### Notes Domain

**Note**:
First-class note w/ optional `title` (quick-capture allowed), required `body`, `type` (`NOTE_TYPE`: general/call/email/meeting/contract_renewal/issue), `access` (`personal`/`global`, default `personal`), `ownerId` (soft FK to better-auth user), `tags` (`text[]`), optional polymorphic `(scopeType, scopeId)` scope where `scopeType` = documented `<module>:<entity>` registry value (e.g. `masters:contact`, `tasks:task`, `calendar:event`). No units captured (`$initialize()` empty).
_Avoid_: Draft (that is workspace — approval-lifecycle content), Activity, Log Entry

**Notes Workflow**:
Domain operation within Notes module, built on platform `Workflow` builder. One group exposed: `p.notes.notes` (`create`, `get`, `list`, `update`, `delete`). `create` derives `ownerId` from `actorId`; `list` access-scoped w/ `scopeType`/`scopeId`, `type`, `tags`, `search` filters. 1 tenant table (`note`) + 2 pgEnums, 3 events, 1 ACL resource. `$dependencies = []`.
_Avoid_: Service, Handler

### Compliance Domain

**Compliance Document**:
Regulatory or legal document tracked through verification lifecycle. Has `name`, `category` (tax/license/certificate/permit/insurance/regulatory/legal/hr/safety/environmental + module-local: data_privacy/financial/vehicle/property/audit/other), `verificationStatus` (draft/submitted/under_review/verified/rejected/expired/overdue/renewed/archived), `expiryDate`, `dueDate`, `expiryPolicyDays` (canonical — `reminderDays` deprecated alias), `expiryPolicyChannel` (canonical — `reminderChannel` deprecated), `escalationDays`, optional `renewalFrequency`. Supports renewal chains (archived old + created new via `renewedFrom`). Linked to external entities via `{sourceModule, sourceEntityType, sourceEntityId}`. **Harmonized:** Calendar `Reminder` owns all time-based nudges; Compliance only stores expiry policy + exposes `getActiveDocumentsForReminders` / expiring/due/overdue list queries consumed by the calendar compliance bridge.
_Avoid_: Certificate, Permit, Regulatory Record

**Compliance Obligation**:
Recurring schedule that auto-generates Compliance Documents on frequency basis (monthly/quarterly/semi_annual/annual/biennial/triennial/custom). Has `startDate`, `endDate`, `frequency`, `isActive`, default document configuration. Obligations expiry-based or period-based.
_Avoid_: Recurring Task, Schedule

**Verification Rule**:
Rule that matches documents by category + source module to determine required reviewer role + priority. Has `name`, `category`, `priority`, `assignedReviewer`, `requiredReviewerRole`, `isActive`.
_Avoid_: Review Policy, Approval Rule

**Audit Entry**:
Append-only record of actions on compliance entities, written to platform `audit_log` via `AuditUnit` — no compliance-local table. Has `entityType`, `entityId`, `action` (created/updated/submitted/verified/rejected/expired/overdue/renewed/archived/completed/escalated/reminder_sent/snoozed/attachment_uploaded/reviewer_assigned/obligation_activated/obligation_deactivated/document_generated), `performedBy`, `performedAt`, `previousState`, `newState`, `changes`.
_Avoid_: Audit Log, Change Record

**Verification Status**:
Lifecycle state of a Compliance Document: `draft` → `submitted` → `under_review` → `verified`/`rejected` → `expired`/`overdue` → `renewed`/`archived`. Status derived from dates + renewal state by `StatusDerivation` service, not set directly.
_Avoid_: Document State, Approval Status

**Renewal Chain**:
Linked sequence of Compliance Documents where each new document archives previous via `renewedFrom` FK. Chain preserves renewal history for a given obligation or entity.
_Avoid_: Renewal History, Version Chain

**Obligation Generator**:
Service that auto-generates Compliance Documents from active Obligations based on frequency schedule. Subscribes to the scheduled-job topic, publishes `document_generated` events.
_Avoid_: Document Factory, Auto-Generator

**Event Bridge**:
Service that subscribes to external module events (`hr.employee_onboarded`, `hr.employee_separated`, `fleet.vehicle_registered`, `masters.org_branch_created`, `accounting.financial_year_started`, `masters.contact_created`) + auto-creates relevant Compliance Documents + Obligations based on event type. A separate healthcare bridge handles `healthcare.operations_created`. There is no compliance-owned Reminder Engine — expiry nudges are calendar reminders.
_Avoid_: Event Listener, Integration Hub

### Tasks Domain

**Project**:
Container for tasks w/ unique `key` (e.g. `PROJ`), `name`, `status` (active/archived/paused), `leadId`, `taskCounter` for sequential task numbering, optional `defaultTaskTypeId`. Members added w/ roles (admin/member/viewer). Lives in control-plane schema (`task_project`); lead auto-added as admin on creation; cannot delete a project that still has tasks.
_Avoid_: Board, Workspace

**Task**:
Unit of work within a Project. Has `title`, `description`, `priority` (urgent/high/medium/low/none), `statusId`, `projectId`, `reporterId`, `assignees`, `labels`, `parentId` (max 3 levels nesting), `dueDate`, `estimatedHours`, `taskNumber` (display: `KEY-seq`). Supports archiving + soft-delete.
_Avoid_: Issue, Ticket, Item

**Task Status**:
Workflow state w/ `name`, `category` (backlog/unstarted/started/completed/cancelled), `color`, `sortOrder`, `isDefault`, `isResolved`. Project-scoped or global. Status transitions constrained via `TaskStatusTransition` rules.
_Avoid_: Column, Stage

**Task Link**:
Typed relationship between two tasks: `blocks`, `blocked_by`, `related_to`, `duplicates`, `caused_by`, `split_from`. Creating a link auto-creates its inverse. Cycle detection prevents circular dependencies.
_Avoid_: Task Relation, Dependency

**Saved View**:
Reusable filter/sort/group configuration w/ `name`, `type` (list/board/calendar/timeline), `filters` (jsonb), `sort` (jsonb), `groupBy`, `isShared`, `isDefault`. Owned by a user, optionally scoped to a project. (Cross-domain saved views live in Workspace as `Filter View`.)
_Avoid_: Filter, Dashboard

**Automation Rule**:
Trigger-action rule w/ `trigger` (status_change/assignment_change/due_date_passed/task_created/task_updated), `conditions` (jsonb), `actions` (jsonb), `isActive`. Evaluated by `AutomationWorkflow` when triggers fire.
_Avoid_: Workflow Rule, Trigger

**Time Entry**:
Logged time record on a task w/ `duration` (minutes), `date`, `description`, `billable` flag, `userId`, `taskId`.
_Avoid_: Timesheet, Time Log

**Task Reminder**:
Time-bound follow-up on a task. **Owned by `@aspen-os/calendar`** — task reminders are `calendar_reminder` rows w/ `targetType = task`, materialized by the calendar task bridge from `task.due_date_changed` (three `due_date` rows per recipient: due − 1d, due − 1h, due), deleted on task delete, suppressed on completion/cancellation.
_Avoid_: Alert, Notification

**Watcher**:
User subscribed to updates on a task. Watchers receive notifications when task updated, commented on, or status-changed.
_Avoid_: Subscriber, Follower

**Activity Log** (Tasks — exempt projection):
Append-only record of task actions: `task_created`, `task_updated`, `status_changed`, `assignee_added`, `assignee_removed`. Has `oldValue`, `newValue` (jsonb), `userId`, `taskId`. **Harmonized:** Platform `AuditLog` is the store; per-module `ActivityFeed` is a projection over `audit_log` (DMS `workflows/activity`, Compliance `workflows/audit`). Tasks `task_activity_log` is exempt (high-volume task timeline) — document exemption or migrate to projection.
_Avoid_: Audit Trail, Change History (use `ActivityFeed` for projection)

**Tasks Workflow**:
Domain operations within Tasks module, built on platform `Workflow` builder. Nine groups: `p.tasks.tasks` (14 actions), `p.tasks.projects` (11), `p.tasks.comments` (6), `p.tasks.links` (6), `p.tasks.timeEntries` (6), `p.tasks.statuses` (10), `p.tasks.taskTypes` (8), `p.tasks.automations` (7), `p.tasks.collaboration` (8). 14 tables (5 control-plane: project/member/status/transition/taskType; 9 tenant: task/assignee/comment/link/timeEntry/watcher/attachment/automationRule/activityLog), 11 events, empty ACL (`defineAcl({})`). `$dependencies = ["masters"]`; `$consumes` = `healthcare.nursing_created`, `healthcare.encounter_updated` (healthcare bridge creates tasks idempotently). Units `db`, `pubsub`.
_Avoid_: Service, Handler

### Calendar Domain

**Calendar**:
Named, colored collection of events w/ `access` (`personal`/`global`, workspace vocabulary), `ownerId`, `timezone`, per-owner `isDefault` flag. First calendar user creates auto-defaults; `setDefault` clears owner's other defaults. Events, attendees, reminders inherit their calendar's access.
_Avoid_: "Calendar" as render mode (tasks' `savedViewTypeEnum` value `calendar` = view type, unrelated); Agenda

**Event**:
Time-boxed calendar entry — `title`, `startsAt`/`endsAt` (timestamptz; `startsAt < endsAt` unless `allDay`), `status` (`confirmed`/`tentative`/`cancelled`), optional `location`/`description`/`color`/`timezone`, optional `recurrence` config, optional polymorphic `(sourceType, sourceEntityId)` link (`<module>:<entity>` registry, workspace `domain` convention). Recurrence = structured jsonb expanded on read by `services/recurrence.ts` — occurrences never materialized, no per-occurrence exceptions in v1.
_Avoid_: Appointment, Meeting (implementation terms)

**Occurrence**:
Computed-on-read expansion of an event's recurrence within `[from, to]` range: `{ id, eventId, startsAt, endsAt, title, location, status, calendarId }`. Non-recurring events yield their single occurrence. `count`/`until` bound series; unbounded series capped by query `limit`.
_Avoid_: Instance, Exception (v1 has no per-occurrence divergence)

**Attendee**:
Invitee on an event — `email` + optional `name`/`attendeeId`/`attendeeType` (`user`/`contact`), `optional`, `status` (`invited`/`accepted`/`declined`/`tentative`). `add` publishes `calendar.attendee_invited`.
_Avoid_: Participant, Guest (implementation terms)

**Reminder**:
Platform's single polymorphic reminder surface — `calendar_reminder` rows w/ `targetType` (`event`/`task`/`note`/`file`/`custom`/`compliance_document`) + `targetId`. `type` = `offset` (resolved against target's start/due anchor), `custom`/`due_date`/`overdue` (absolute `remindAt`). Recipient-scoped via `userId`; delivered by the `calendar.reminder-scan` dispatcher cron, which publishes `calendar.reminder_due` (full payload) + marks `isSent`. Task reminders = `targetType = task` rows created by the task bridge.
_Avoid_: Alert, Notification, "Reminder Engine" (compliance's document-expiry scanner = separate, out-of-scope surface)

**Task Bridge**:
Calendar-side service (`services/task-bridge.ts`) that subscribes to `task.due_date_changed`/`task.deleted`/`task.status_changed` + materializes/cancels task due-date reminders — three `due_date` rows per recipient (due − 1d, due − 1h, due; `userIds` = assignees ∪ reporter), deletion on task delete, suppression on completion/cancellation. Event-driven, so both modules stay `$dependencies = []`.
_Avoid_: Event Listener (compliance's EventBridge = general pattern; Task Bridge = calendar-specific consumer)

**Calendar Workflow**:
Four groups: `p.calendar.calendars` (6), `p.calendar.events` (8), `p.calendar.attendees` (5), `p.calendar.reminders` (7). 4 tenant tables, 14 events, 4 ACL resources. `$dependencies = []`; `$consumes` = 3 task + 4 compliance + 3 healthcare topics. Units `db`, `pubsub`. Services: reminder dispatcher (`calendar.reminder-scan`), task bridge, compliance bridge (`compliance_document` reminders), healthcare bridge (appointments → events + `custom` reminders).
_Avoid_: Service, Handler

### Comms Domain

**Channel**:
Named sender endpoint (`from`: email address, WhatsApp number, SMS sender ID) plus credentials to send from it. `tenant` (BYOC — credentials in tenant kvStore via `credentialRef`) or `host` (references a `comms_provider`; carries no credential material).
_Avoid_: Sender, Integration

**Provider**:
Host's delivery capability registry (control-plane `comms_provider` table). Host credentials live in host kvStore, never in tenant rows.
_Avoid_: Vendor, Gateway

**Notification**:
Persisted intent + in-app inbox row. The row **is** the inbox — in-app delivery is zero extra work. Has `type`/`title`/`body`, `severity`, `recipientType`/`recipientId`, `to` snapshot, `channelTypes[]`, `status` (unread/read/dismissed), `sourceModule`/`sourceEntity`.
_Avoid_: Alert, Inbox Item

**Message**:
Delivery outbox row (`comms_message`) — one per outbound send. Status lifecycle `queued → sending → sent → delivered/failed`, w/ attempts/retries + provider receipts. Swept by `comms.message-sweeper` cron (`* * * * *`), which dispatches per-message in tenant context. Never a `comms.deliver` topic.
_Avoid_: Event, Payload

**Recipient**:
The `to`: an internal user (resolved via Auth unit) or an external contact (address carried in producer payload). Separate from Channel (the `from`) by design — comms reads no other module's tables.
_Avoid_: Target, Destination

**Default Channel**:
At most one `isDefault` per `(type, entityType, entityId)`. Host defaults materialize lazily; a default must be `active` and verified.
_Avoid_: Fallback Channel

**Preference**:
Per-user routing + consent row: `(userId, type, channelType)` opt-outs plus the `(userId, null, channelType)` default row. `inapp` is a routing-only pseudo channel type — never a real channel.
_Avoid_: Setting (that is workspace/host config), Subscription

**Comms Workflow**:
Domain operation within Comms module, built on platform `Workflow` builder. Seven groups exposed on module instance: `p.comms.channels`, `p.comms.providers`, `p.comms.notifications` (getter-bound to `db`/`kvStore` via `createNotify`), `p.comms.preferences`, `p.comms.templates`, `p.comms.settings`, `p.comms.messages`. Runtime-wired (`auth, db, kvStore, pubsub`): `$prepareRuntime()` registers the message sweeper + 7 event-bridge subscriptions + 4 healthcare-bridge subscriptions (`$consumes` = 11 total); `$cleanup()` unregisters both. 1 control-plane table (`provider`) + 6 tenant tables, 21 events, 7 ACL resources. `$dependencies = []`.
_Avoid_: Service, Handler

### HR Domain (3 packages)

> HR is three packages, not one module: `@aspen-os/hr-core` (`$name = "hrCore"`), `@aspen-os/hr-attendance` (`$name = "hrAttendance"`), `@aspen-os/hr-leave` (`$name = "hrLeave"`). Totals: 10 workflow groups, 54 tables (14 control-plane + 40 tenant), 58 events, 3 crons. All three have `$dependencies = []` and units `db`, `pubsub`.

**Employee** (hr-core):
Person record w/ `employeeId`, `firstName`, `lastName`, `email`, `phone`, `dateOfBirth`, `dateOfJoining`, `dateOfLeaving`, `department`, `designation`, `grade`, `employmentType`, `branch`, `reportsTo`, `status`. Supports health insurance, skill maps, employee groups.
_Avoid_: Staff, Worker, Personnel

**Lifecycle** (hr-core):
Employee lifecycle sub-domain covering onboarding (tasks, completion tracking), promotions (w/ salary revision), transfers (between departments/branches/companies), separation (exit interviews, full & final settlement).
_Avoid_: Employee Journey, HR Lifecycle

**Position** (hr-core):
Structural sub-domain — stable job slots (`hr_position`: `name`, `department`, `branch`, `designation`, `reportsToPosition`, `employmentType`, `headcount`, `jobDescription`, `isActive`) with employee assignments (`hr_position_assignment`: `positionId`, `employeeId`, `fromDate`, `toDate`, `isPrimary`). Positions outlive incumbents; assignments retain history. Manager resolution walks the `reportsToPosition` chain, falling back to `employee.reportsTo`. Structure views: org tree, position tree, direct reports, subordinates, peers, team.
_Avoid_: Job, Role Slot

**HR Access** (hr-core):
Role-based access control within HR module, w/ permissions, roles, branch-wise access controls for HR users.
_Avoid_: HR Permissions, HR Auth

**Department / Designation / Employment Type / Setup** (hr-core):
Organizational setup w/ `Department` (`name`, `code`, `manager`, `parentDepartment` hierarchical, `isActive`), `Designation` (job title), `Employment Type` (full-time/part-time/contract classification), plus grades, holidays, HR/payroll settings. Setup tables are control-plane (shared across tenants). A designation tiers a position/employee — distinct from `Position` (the stable slot).
_Avoid_: Team, Unit / Title, Grade / Contract Type

**Announcement** (hr-core):
Internal broadcast authored by HR users, targeted at whole org or subset (branch/department/designation/group/role/individuals), delivered into comms inbox via `announcement.published` w/ delivery snapshot (`hr_announcement_recipient`). Status `draft → scheduled → published → archived`; only `draft`/`scheduled` editable; publish idempotent; due items delivered by the `hr.announcement-scheduler` minute cron.
_Avoid_: Notification (comms term)

**Attendance** (hr-attendance):
Daily attendance record w/ `date`, `employeeId`, `status`, `checkInTime`, `checkOutTime`, `workingHours`, `lateEntry`/`earlyExit` minutes, `isHalfDay`, `shift`. Supports attendance requests (correction workflow). Delivered by `hr.daily-attendance-sync` cron (`0 1 * * *`).
_Avoid_: Timesheet, Presence Record

**Employee Check-in** (hr-attendance):
Geolocation-tagged check-in/out event w/ `time`, `logType`, `latitude`, `longitude`, `deviceId`, `isOffShift`.
_Avoid_: Punch, Clock Event

**Overtime** (hr-attendance):
Overtime tracking sub-domain w/ configurable overtime types (rates, multipliers for holidays/weekends) + overtime slips following approval workflow.
_Avoid_: Extra Hours, Overtime Log

**Shift** (hr-attendance):
Shift management sub-domain covering shift types (start/end times, grace periods, auto-attendance), shift locations (geofencing), shift assignments, shift requests (approval workflow), shift schedules (weekly day-of-week assignments).
_Avoid_: Roster, Schedule

**Leave** (hr-leave):
Leave management sub-domain covering leave types, periods, policies, allocations, applications, compensatory leave, encashment, block lists, adjustments, ledger entries. Leave applications follow approval workflow (pending → approved/rejected → cancelled). Delivered by `hr.daily-leave-accrual` cron (`0 0 * * *`).
_Avoid_: PTO, Time Off

**HR package map**:
hr-core = 6 groups (`access` 33, `announcement` 14, `employee` 28, `lifecycle` 52, `position` 20, `setup` 41), 31 tables (14 control-plane + 17 tenant), 40 events (6 namespaces), 8 ACL resources, reconciliation subscriptions (`lifecycle.separation_completed`, `lifecycle.transfer_approved`). hr-attendance = 3 groups (`attendance` 17, `overtime` 13, `shift` 34), 11 tenant tables, 12 events (3 namespaces), 3 ACL resources, 1 cron. hr-leave = 1 group (`leave`, 60 actions), 12 tenant tables, 6 events, 1 ACL resource, 1 cron.
_Avoid_: Single `Hr` module (use `hrCore` / `hrAttendance` / `hrLeave`)

### DMS Domain

**File**:
Single central entity of DMS module — one uploaded binary carrying both filesystem attributes (`folderId`, `path`, `description`) + records attributes (`classId`, `docNumber`, `fieldValues`, `expiryDate`, `batchId`, `compression`). Has `status` (`triaged`/`active`/`expired`/`trashed`), `version` (current), `metadata` (jsonb), `owner`, `uploadedBy`, `storageKey`. Uploads into folder `active` immediately; uploads without folder staged as `triaged`.
_Avoid_: Document, Asset, Drive File

**Triage**:
Staging stage for files uploaded without a folder. Triaged file not searchable, normally listable, or shareable until classified. Only exit = `classify()` (→ `active`). Can be pinned via workspace module.
_Avoid_: Inbox, Draft Folder, Pending Queue

**Classify**:
Validation-enforced transition that assigns triaged File to a Class, validates required fields, optionally applies class's file-naming schema, assigns `docNumber`, sets status `active`. One and only way out of Triage.
_Avoid_: File Into, Assign Class, Register

**Class**:
Admin-defined template w/ typed fields (some required) that a File must satisfy to become active in that class. Optionally defines file-naming schema w/ field/date/sequence placeholders + per-class retention period. Archived (not hard-deleted) when superseded.
_Avoid_: Document Type, Category, Template

**Class Field**:
Typed column of a Class (`text`/`number`/`date`/`select`/`multi-select`/`boolean`/`user`/`contact`/`url`/`email`/`phone`) w/ required/default/options/order. Field values stored as jsonb on the File, optionally indexed for search.
_Avoid_: Column, Attribute, Metadata Key

**File Version**:
Stored revision of a File. Storage keys version-bound (`dms/{tenant}/{fileId}/v{n}/{name}`), so `newVersion` writes fresh object + prune retains `maxVersions` (skipped under legal hold). Renames + moves metadata-only — never an S3 move.
_Avoid_: Revision (allowed informally), Snapshot, Copy

**File View**:
Saved, reusable filter+sort configuration over active files. Conditions cover file-level columns, classes, class fields (`classField:<name>`), labels, free-text `search` term. Personal views user-owned; admins publish shared views. Pinned via `workspace_pin`, item type `file_view`.
_Avoid_: Saved Filter, Dashboard, Query, View

**Full-Text Search**:
Search over current-version name, description, metadata, class field values (indexed `tsvector`, not file contents). Quick search offers type-ahead results over files, classes, labels; search can be promoted into persisted File View.
_Avoid_: Content Search, Semantic Search (AI — deferred)

**Contact (DMS)**:
Org-wide address-book entry used as sharing handle for external parties; may be linked to an internal AuthUnit user. Removal requires mandatory reason + revokes all shares granted to contact. Removal is driven by `masters.contact_removed` (contact-share bridge) — DMS owns no contact table.
_Avoid_: Sharee, External Recipient, Address Book Entry

**Share (DMS)**:
Permission grant (`viewer`/`editor`/`owner`) on a File or Folder to a grantee — a Contact (token-based access, no login required), internal User, or Group. Revoking, or removing the contact, invalidates access immediately. Folder grants inherit down the folder tree.
_Avoid_: External Link, Access Grant

**Public Link (DMS)**:
Token-based shareable link (optional password, `view`/`edit` permission, optional `maxViews`/`expiresAt`) for a File or Folder, managed by same `shares` group as grants.
_Avoid_: External Link, Share Link

**Legal Hold**:
Admin-placed flag (w/ mandatory reason) that blocks permanent deletion + auto-purge of a File + stops version pruning. Released only by an admin.
_Avoid_: Freeze, Guard, Retention Lock

**Retention**:
Per-class (or settings-default) period after which `trashed`/`expired` Files auto-purged; trashed folders purged after `trashRetentionDays`. Purge skipped for files on active Legal Hold.
_Avoid_: Retention Policy (informal), Archival Window, Deletion Schedule

**Trash (DMS)**:
Read-mostly view over Files w/ status `trashed` or `expired` + trashed Folders. Restore (owner/admin) reactivates; permanent deletion **admin-only** + blocked by active Legal Hold.
_Avoid_: Recycle Bin, Deleted Items, Bin

**Label (DMS)**:
Color-coded tag (`name`, `color`, global or owner-scoped) applied to Files + Folders through polymorphic `dms_entity_label` join (plus `dms_label_cache` mirror). File/folder can carry multiple labels; upload accepts `labelIds`. Label lifecycle events (`masters.label_created/_updated/_removed`) are consumed via the label bridge.
_Avoid_: Tag, Category, Custom Field

**Activity Feed**:
Per-entity chronological trail of DMS actions (upload, classify, version, share, delete, expire, restore, purge, hold), projected from platform AuditUnit's `audit_log` — not DMS-owned table (access attempts additionally logged to `dms_access_log`), not PubSub events.
_Avoid_: Audit Trail (that's the platform unit), Event Log, Change History

**DMS Workflow**:
Sixteen workflow/service exports surfaced as `p.dms.*`: `activity` (3), `classes` (8), `files` (20), `folders` (9), `holds` (3), `labels` (7), `search` (2), `settings` (2), `shares` (14, incl. public links), `trash` (5), `triage` (3), `versions` (6), plus service helpers `access` (4), `archive` (2), `paths` (11), `storage` (9). 12 tenant tables, 6 pgEnums, 27 events, 9 ACL resources. `$dependencies = ["masters"]`; `$consumes` = `masters.contact_removed`, `masters.label_created/_updated/_removed`. Units `db`, `pubsub`, `storage` (+ `audit` from context). Crons: `dms.expiry-scan` (`5 0 * * *`), `dms.auto-purge` (`30 3 * * *`).
_Avoid_: Service, Handler

### Workspace Domain

> The `@aspen-os/workspace` module. Term **Workspace** here = **personal-workspace surface** — drafts, filter views, dashboards, utilities — deliberately NOT Tenancy, NOT tasks Project/Board (both list "Workspace" as avoid term). See `.working-docs/domain-model/workspace.md`.

**Draft**:
Saved, unpublished piece of content — `title`, `body` (markdown/text), `notes`, `metadata` (opaque) — w/ optional approval lifecycle (`draft → submitted → approved → published`, `reject` → `reopened` to `draft`), soft-delete trash, duplicate, threaded comments (`workspace_draft_comment`). First-class persistable entity — NOT the "draft" status value used by other modules (compliance documents, hr contracts).
_Avoid_: Draft Status, Staging Content

**Approval**:
Optional `submit → approve` gate on a Draft; hosts without a review step call `publish` directly from `draft` (approval not mandatory).
_Avoid_: Review, Sign-off (informal)

**Filter View**:
Cross-domain saved filter/sort/group configuration: `domain` (free-form `<module>:<entity>` text, validated by `DOMAIN_REGEX`), `conditions` (`{ field, operator, value }`), `sort` (`{ field, direction }`), `groupBy`, `isDefault` per `(ownerId, domain)`. Documented domains (`FILTER_VIEW_DOMAIN`): `workspace:draft`, `tasks:task`, `dms:file`, `compliance:document`, `hr:employee`, `notes:note` — any `module:entity` string passes validation; the module never queries other modules' tables and there is no resolver registry in code. Datasource rule: non-embed widgets require `domain` + exactly one of inline `filter` or `viewId` soft-FK.
_Avoid_: Saved Filter, Saved Search, List View (that's tasks' `task_saved_view`)

**Dashboard (workspace)**:
Named collection of Widgets + jsonb grid `layout` (`{ widgetId, x, y, w, h }[]` stored on dashboard row). Supports `duplicate`, `export` (JSON snapshot incl. widgets), `import`, per-dashboard Schedules. No widget-overlap validation in v1. NOT compliance's module-local summary metrics.
_Avoid_: Board, Analytics Page

**Widget**:
Declarative datasource config on a Dashboard — `metric` (count/sum/avg/min/max over domain + filter + date range), `breakdown` (group-by + range), `list` (first-N + range), `embed` (markdown/url/iframe). Module stores + serves configs, tracks `lastRefreshedAt`/`lastError`; does **not** render or execute analytics. Datasource = `{ domain }` + exactly one of inline `filter` or `viewId` soft-FK to saved Filter View.
_Avoid_: Chart, KPI Card (implementation terms)

**DeliverySchedule (workspace)**:
Per-Dashboard cron delivery configuration (`{ recipients, format: export|pdf|url, subject? }`). `create`/`resume` register per-schedule pg-boss cron on `workspace.delivery_schedule.<id>`; module's handler publishes `workspace.delivery_due` (full schedule + dashboard payload) + **host renders/delivers**. `markRun` records completion. No fixed cron — schedules boot-re-register all `is_active` rows. **Harmonized:** Workspace `DeliverySchedule` is canonical; never use "Schedule" for Calendar reminders (use Calendar `Reminder`).
_Avoid_: Schedule (bare — use `DeliverySchedule`), Recurring Delivery, Notification Job

**Pin (workspace)**:
Per-user sidebar shortcut to any tenant item via `PIN_ITEM_TYPE` registry — workspace entities (`draft`/`view`/`dashboard`) + dms items (`triage`/`file_view`/`class`), soft-referenced by `(itemType, itemId)` w/ no module dependency; unique `(userId, itemType, itemId)`. Dms module's pin surface consolidated here.
_Avoid_: Bookmark, Favorite

**Recent**:
Per-user bounded history of touched workspace entities; `touch` upserts + bumps `lastAccessedAt` + trims to configured cap (default 50).
_Avoid_: History, Recently Viewed

**Setting (workspace)**:
Per-user workspace preference (`key`, `value` jsonb). Keys: `home_dashboard`, `default_view.<domain>`, `default_range`, `timezone`; values validated per key.
_Avoid_: Preference (informal)

**Personal / Global Access**:
First-class `access` enum on Drafts, Filter Views, Dashboards, set by user at create/update time. `personal` = visible only to `ownerId`; `global` = org-wide within tenant. Widgets + schedules **inherit** parent Dashboard's access. Replaces ad-hoc `isShared`/`isGlobal` booleans of dms/tasks **in this module** (those not retrofitted).
_Avoid_: Sharing Flag, Visibility Scope

**Workspace Workflow**:
Eight groups: `p.workspace.dashboards` (8), `p.workspace.drafts` (16), `p.workspace.pins` (3), `p.workspace.recent` (2), `p.workspace.schedules` (8), `p.workspace.filterViews` (8), `p.workspace.search` (1, drafts + dashboards only), `p.workspace.widgets` (7). 8 tenant tables, 6 pgEnums, 30 events, 9 ACL resources. `$dependencies = []`. Units `db`, `pubsub` (+ `audit` from context).
_Avoid_: Service, Handler

### Healthcare Domain

> Full subdomain detail (21 workflow groups, 140 tables + 13 pgEnums, 47 events) lives in `.working-docs/domain-model/healthcare.md`. Terms below are the cross-module vocabulary; per-group method lists stay out of the glossary.

**Patient**:
Registered person receiving care — `healthcare_patient` + family links, allergies, consents, flags, recalls, merge requests. Dedupe on phone/ABHA; duplicates merge two-party (`requestMerge` → `approveMerge`).
_Avoid_: Contact (that is masters business relationship), User (that is auth identity)

**Practitioner**:
Doctor master — registration, education, postings, weekly schedules, fee versions, leave blocks. `conflict` reports leave vs booked overlap; `nextFreeSlot` scans 14 days.
_Avoid_: Employee (that is HR), User

**Facility**:
Room, chair, or equipment w/ weekly schedules, blocks, single-occupancy occupy/release, sterilization logs.
_Avoid_: Branch (that is masters `org_branch` or healthcare's subdomain routing row)

**Healthcare Branch**:
Subdomain routing row (`healthcare_branch`, `subdomain` UNIQUE) carrying `branchId` (defaults `"main"`) + `pricelist_ids` for pricelist resolution. Not org structure.
_Avoid_: Branch (organization's physical location), OrgBranch (masters `org_branch`)

**Service**:
Billable clinical service w/ versioned prices (`healthcare_service_price`), discount rules, package defs. Resolved per branch via pricelists.
_Avoid_: Procedure (that is RPC handler), Workflow Step

**Pricelist**:
Named price list bound to branches; `publish` freezes a version, `bulkRevision` reprices, `resolvePrice` picks the branch-applicable price.
_Avoid_: Price (a resolved number, not the list)

**Appointment**:
Booked visit — slot computation, queue tokens (`callNext`/`checkin`), video sessions, certificates, recalls. `reschedule` requires a reason.
_Avoid_: Encounter (the visit record itself), Visit Log (that is residents round log)

**Encounter**:
Visit record — diagnoses, prescriptions, vitals, clinic orders, follow-ups, addenda. `sign` closes it.
_Avoid_: Appointment (booking), SOAP Note (one allopathy artifact inside it)

**Healthcare Workflow**:
Stateless OPD clinic backend (`$initialize`/`$prepareRuntime`/`$cleanup` empty, no schedules, no subscriptions): 21 workflow groups (admin, allopathy, appointments, ayush, billing, dental, diagnostics, encounters, facilities, nursing, operations, patients, pharmacy, practitioners, pricelists, psych, records, rehab, residents, services, staff). 140 `healthcare_*` tables (all tenant) + 13 pgEnums, 47 events sharing one `HealthcareEntityEvent` payload, 19 ACL resources (elevated only `billing:discount-approve`, `diagnostics:authorize`, `psych:override`). `$dependencies = []`. OPD only — no ADT/IPD, no OT, no insurance/TPA.
_Avoid_: Service, Handler

### Management Plane Domain

**Tenancy Mode**:
Class-time choice — developer selects one of three platform classes at startup: `SingleTenantPlatform` (one database, no isolation — currently EXPERIMENTAL), `SharedTenantPlatform` (one shared database, Postgres RLS policies enforce isolation — currently EXPERIMENTAL), `IsolatedTenantPlatform` (control-plane DB + per-tenant DBs, physical isolation). Once class chosen, mode cannot change. Same module code works in all three modes. Config type (`SingleTenantConfig`, `SharedTenantConfig`, `IsolatedTenantConfig`) does not include `tenancy` field — the class IS the mode. All three share the uniform `run(tenantId, fn)` signature; `"$global"` = control plane.
_Avoid_: Tenancy Strategy, Isolation Mode, Deployment Mode

**Tenant ID**:
String identifier for tenant context of a request. `"$global"` addresses the control plane; any other ID addresses a tenant (resolved from authenticated session, e.g. better-auth's `session.activeOrganizationId`, + passed to `platform.run(tenantId, fn)`). Stored in `AsyncLocalStorage` context. Used by stable DB wrapper to route queries, `PubSubUnit` to route messages, `StorageUnit`/`KvStoreUnit` to prefix keys.
_Avoid_: Org ID, Workspace ID, Customer ID

**Tenant Resolver**:
Function pair used in `isolated` mode: `resolve(tenantId)` returns per-tenant database name, `list()` returns all tenant IDs. Used by `DatabaseUnit` to lazily create per-tenant connection pools + by `prepareInfra()` to call `$prepareTenant()` for each tenant at startup. Note: `IsolatedTenantConfig` does NOT include `resolver` field — dummy resolver (`list: async () => []`, `resolve: async (id) => id`) constructed inline in `IsolatedTenantPlatform.create()`. Known WIP gap.
_Avoid_: Tenant Registry, Connection Provider

**Control Plane**:
Management/administration database connection. In `single` + `shared` modes, this IS the app database. In `isolated` mode, shared control-plane database holding auth tables + platform-level tables. `DatabaseUnit` always holds control-plane pool. `AuthUnit` always uses `controlPlaneDb`. Auth tables exempt from `tenant_id` columns + RLS policies.
_Avoid_: Management DB, Admin DB

**Tenant Database**:
Per-tenant Postgres database in `isolated` mode. Holds that tenant's data-plane data (all module tables). No auth tables live here. `DatabaseUnit` lazily creates pool per tenant database. Isolation physical — tenant cannot reach another tenant's database.
_Avoid_: Tenant Schema, Data Plane DB

**Stable DB Wrapper**:
JavaScript `Proxy` returned by `DatabaseUnit.db` (a getter). Created once at init time, stored by workflows as `this.db`. When any property accessed (e.g. `this.db.select()`), wrapper reads per-request drizzle instance from `AsyncLocalStorage` + delegates to it. Transparent to workflows — no workflow code changes.
_Avoid_: DB Proxy, Drizzle Router, Connection Resolver

**Prepare Tenant**:
Optional lifecycle method on `Module` interface: `$prepareTenant(tenantId)`. Called at startup for each existing tenant (in `isolated` mode) during `prepareInfra()` + during tenant provisioning. Modules register per-tenant cron schedules + subscriptions here. Platform sets up `AsyncLocalStorage` context w/ `tenantId` before calling each module's `$prepareTenant()`. Not called in `single` or `shared` modes.
_Avoid_: Per-Tenant Init, Tenant Setup

**Tenant**:
SaaS customer account at platform layer. Implemented as a better-auth **Organization** (via better-auth's Organization plugin) — the Tenant IS the better-auth `organization` row in control-plane DB, w/ companion `tenant` table for extra domain fields (status, plan, SP assignment, database connection params). Carries `name`, `slug`, `logo` (on better-auth org row) + account-level fields (signup date, lifecycle status, plan, SP assignment). Does NOT hold rich profile fields (accentColor, website, industry, taxId, etc.) — those live on Masters settings (`org.*`) / `management.organizations` read model. "List of Organizations" UI in SOW = projection over Tenants.
_Avoid_: Organization (when meaning SaaS customer — there is no `@aspen-os/organization` package), Customer Account, Subscription, Workspace

**Tenant Status**:
Lifecycle state of a Tenant: `onboarding` (pre-go-live, SP doing physical-world work) → `active` (live) → `suspended` (voluntarily or involuntarily paused) → `churned` (offboarded). Coarse by design — `onboarding` opaque single stage; internal install/training/handoff sub-steps NOT tracked by platform.
_Avoid_: Tenant State, Account State, Lifecycle Stage

**Organization (management read model)**:
Control-plane read projection over tenants (`p.management.organizations`: 4 actions) — not a separate profile table. The rich company-profile fields live in Masters settings + tenant companion row. 1:1 with a Tenant by shared ID.
_Avoid_: Tenant (different concept), Company, better-auth Organization

**Service Provider**:
First-class platform entity — implementation/integration partner that does physical-world onboarding work for a Tenant (site setup, install, training). Each Tenant has at most one active Service Provider at a time (1:1 active assignment); an SP may serve many Tenants. SP's staged work happens during Tenant's `onboarding` stage. Lives in own table in control-plane DB; not a Tenant subtype, not a Masters `Connection`.
_Avoid_: Integrator, Vendor, Partner, Connection, Reseller

**Platform Admin**:
User w/ `user.role = 'platform_admin'` + zero `member` rows. Operates management portal — CRUD over Tenants, Service Providers, platform users, reports. Works ONLY against control-plane DB; never touches tenant data-plane data directly. If platform admin needs to inspect tenant's data, uses better-auth admin-impersonation (`signInAsUser`) to act as tenant admin. Has cross-tenant visibility on control-plane entities.
_Avoid_: Super Admin, Root, Operator

**Service Provider User**:
User w/ `user.role = 'sp_user'` + `service_provider_user` join row pointing to their Service Provider. Zero tenant `member` rows. Field staff working for an SP — can view assigned Tenants, update onboarding status, upload install/training artifacts. Scope = SP they belong to, not a tenant.
_Avoid_: Integrator User, Field Agent

**Audit Log**:
Append-only record of management actions, written via platform's `AuditUnit` (`ctx.audit.write(...)`) inline in each workflow. Has `entityType` (tenant/serviceProvider/platformUser), `entityId`, `action` (audit-action constants), `actorId`, `performedAt`, `previousState`, `newState`, `changes`, `metadata`. Lives in platform's `audit_log` table (pushed as platform core schema). Management plane does NOT own separate `audit_log` table or `logAuditStep` — uses platform unit directly.
_Avoid_: Audit Trail, Change Record

**Platform User**:
User managed by Management Plane module — distinct from tenant end-users. Includes platform admins + service provider users. Created/updated/deleted via `users` workflow, which delegates to `AuthUnit.user` for better-auth operations. SP membership modelled by `service_provider_user` join row (1:1 user→SP), not `spId` column on `user`.
_Avoid_: Admin User, Management User

**Report**:
Read-only view produced by Management Plane over control-plane DB. Four categories: (1) tenant usage metrics (users, modules, storage, API calls per tenant), (2) provisioning & lifecycle reports (tenants by lifecycle stage, assigned SP, time-in-onboarding, churn reasons), (3) audit & activity reports (who created/suspended/churned a tenant, SP assignments, role changes, platform admin actions), (4) SP performance reports (tenants per SP, avg onboarding duration, completion rates). All reports control-plane queries; never cross into per-tenant DBs.
_Avoid_: Dashboard, Analytics, Metric

**Provisioning**:
Workflow that creates a new Tenant end-to-end, run by Management Plane module via `Workflow.name("tenant.onboard")`. Steps: (1) create better-auth Organization (the Tenant) via `ctx.auth.service.api.createOrganization()`, (2) call `dbUnit.provisionTenant(tenantId, dbOptions)` — in isolated mode issues `CREATE DATABASE` against Postgres server via admin connection, runs `pushSchema()` against new tenant DB w/ all platform + module schemas, returns connection params; in shared mode no-op, (3) seed profile row in new tenant DB via `dbUnit.seedTenantDb()` (isolated only), (4) record connection params + status in control-plane `tenant` table, (5) write audit entry via `ctx.audit.write(...)`, (6) publish `tenant.provisioned` event. Sets Tenant status to `onboarding`. Exposed via `p.management.tenants.onboard()`. Note: `ManagementPlaneConfig` currently `undefined` — provisioning workflow expects richer config (`tenantDbNamingScheme`, `defaultTenantDbHost`, `postgresAdminConnection`, `moduleSchemas`) but type not defined yet. Known WIP gap.
_Avoid_: Onboarding (that's the Tenant Status stage AFTER provisioning), Setup, Initialization

**Management Workflow**:
Five groups: `p.management.tenants` (15: onboard/get/list/update/activate/suspend/churn/assignServiceProvider/…), `p.management.tenantMembers` (5), `p.management.serviceProviders` (8), `p.management.organizations` (4), `p.management.users` (7). 4 owned control-plane tables (`tenant`, `service_provider`, `service_provider_user`, `managedOrganization`) + 2 shadow re-exports (`organization`, `user` from platform); `tenant_schemas = {}`. 22 events across 5 namespaces, 4 ACL resources. `$name = "management"`; `$dependencies = []`; `$initialize` accepts `{ db, auth, pubsub }` but only stores `db`.
_Avoid_: Service, Handler

## Context Relationships

```
┌────────────────────────────────────────┐    ┌─────────────────────────────────────────────┐
│    Recruiter                           │───→│            Server Platform Classes            │
│    (not in repo; examples/ holds only  │    │  SingleTenantPlatform (EXPERIMENTAL)         │
│    seaweedfs-s3.json stub)             │    │  SharedTenantPlatform (EXPERIMENTAL, RLS)    │
│                                        │    │  IsolatedTenantPlatform (DB/tenant)         │
│  registers modules via                 │    │  uniform run(tenantId, fn); "$global" =     │
│  XxxPlatform.create(config, [modules]) │    │  control plane; 8 core units: db, auth,     │
│                                        │    │  logs, pubsub, rpc, storage, kvStore, audit │
└────────────────────────────────────────┘    └──────────┬──────────────────────────────────┘
      │                            │ wires
      │                  ┌─────────┼──────────┬──────────────┐
      │                  ▼         ▼          ▼              ▼
      │               Database   AuthUnit   LogUnit      PubSubUnit
      │                  │          │          │              │
      │                  │          │ uses     │ uses         │ uses
      │                  │          ▼          ▼              ▼
      │                  │     better-auth   pino         pg-boss
      │                  │
      │                  ├──────────────────────────────────────┐
      │                  ▼          ▼              ▼            ▼
      │            StorageUnit  KvStoreUnit     RpcUnit      AuditUnit
      │                  │          │              │              │
      │                  ▼          │              ▼              ▼
      │               S3 SDK       │           oRPC         audit_log table
      │                             │                         (platform schema)
      │                         Postgres
      │
      ├──────────────┬─────────────────────┬──────────────────────┬──────────────────────┬─────────────────┬──────────────┬──────────────┐
      ▼              ▼                     ▼                      ▼                      ▼                 ▼              ▼              ▼
┌──────────┐ ┌──────────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│Masters   │ │   Compliance     │ │    Tasks     │ │     DMS      │ │  HR (3 pkgs)   │ │    Notes     │ │ Management   │ │  Calendar   │ │  Workspace   │
│  Module  │ │    Module        │ │   Module     │ │   Module     │ │  hrCore/hrAtt/ │ │    Module    │ │   Module     │ │   Module    │ │   Module     │
│          │ │                  │ │              │ │              │ │  hrLeave       │ │  (no units)  │ │              │ │             │ │              │
│9 wf grps │ │ 5 wf groups      │ │ 9 wf groups  │ │ 16 wf exports│ │ 10 wf groups   │ │ 1 wf group   │ │ 5 wf groups  │ │ 4 wf groups │ │ 8 wf groups  │
│12 tables │ │ (+dashboard alias)│ │ 14 tables    │ │ 12 tables    │ │ 54 tables      │ │ 1 table      │ │ 4 owned +    │ │ 4 tables    │ │ 8 tables     │
│32 events │ │ 3 tables         │ │ 5 ctl + 9 ten│ │ 27 events    │ │ 14 ctl + 40 ten│ │ 3 events     │ │ 2 shadow     │ │ 14 events   │ │ 30 events    │
│9 ACL res.│ │ 23 events        │ │ 11 events    │ │ 9 ACL res.   │ │ 58 events      │ │ 1 ACL res.   │ │ 22 events    │ │ 4 ACL res.  │ │ 9 ACL res.   │
│deps: none│ │ 3 ACL res.       │ │ empty ACL    │ │ deps: masters│ │ 12 ACL res.    │ │ deps: none   │ │ 4 ACL res.   │ │ deps: none  │ │ deps: none   │
│units:    │ │ units:           │ │ deps: masters│ │ $cons: 4     │ │ deps: none     │ │              │ │ deps: none   │ │ $cons: 10   │ │ $cons: none  │
│db,kvStore│ │ db, kvStore,     │ │ units:       │ │ units:       │ │ units:         │ │              │ │ units: db    │ │ units:      │ │ units:       │
│          │ │ pubsub           │ │ db, pubsub   │ │ db, pubsub,  │ │ db, pubsub     │ │              │ │ (auth/pubsub │ │ db, pubsub  │ │ db, pubsub   │
│          │ │                  │ │              │ │ storage      │ │                │ │              │ │ accepted,    │ │             │ │              │
│          │ │                  │ │              │ │ 2 crons      │ │ 2 crons +      │ │              │ │ unused)      │ │ 1 cron +    │ │ per-schedule │
│          │ │                  │ │              │ │              │ │ 1 scheduler    │ │              │ │              │ │ 3 bridges   │ │ crons        │
└──────────┘ └──────────────────┘ └──────────────┘ └──────────────┘ └──────────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘

Implemented: DMS module — unified document/files management on a single `file`
  entity: Triage → Classify → active (uploads into folders active immediately);
  classes → required-field validation + naming schema + `docNumber`; unified
  sharing (user/group/contact grants + public links) under `p.dms.shares`;
  versioned files, full-text/quick search, one trash module over `status` w/
  retention + admin-only permanent delete + legal holds + expiry scanner,
  Activity Feed via AuditUnit (+ `dms_access_log` for access attempts);
  folders, labels (`dms_label` + `dms_entity_label` + `dms_label_cache`),
  file views. Contact/label lifecycle driven by masters bridges
  (`masters.contact_removed`, `masters.label_created/_updated/_removed`).
  Reuses StorageUnit (unified `dms/{tenant}/{fileId}/v{n}/{name}` keys),
  AuthUnit, PubSub (expiry-scan + auto-purge crons), AuditUnit. 12 `dms_*`
  tables, all tenant schemas. `$dependencies = ["masters"]`. 16 workflow/
  service exports, 27 events.

Implemented: Workspace module — dependency-free personal-workspace surface:
  drafts (draft → submitted → approved → published, optional approval, reject →
  reopened, trash/restore, duplicate, threaded comments), filter views
  (cross-domain saved conditions/sort, free-form `domain` + documented
  `FILTER_VIEW_DOMAIN` 6 values — no resolver registry in code), dashboards
  (widgets + jsonb grid layout, duplicate/export/import), declarative widgets
  (metric/breakdown/list/embed w/ date ranges + refresh metadata),
  event-driven schedules (per-schedule pg-boss crons →
  `workspace.delivery_due`, host delivers), user-scoped utilities (pins,
  recent, quick search over drafts + dashboards only, settings). Access =
  first-class user-set enum — `personal` (owner-only) / `global` (org-wide).
  8 `workspace_*` tables, all tenant schemas, 6 pgEnums, 30 events, 9 ACL
  resources. No module deps. Units: db, pubsub (+ audit from context).

Implemented: Comms module — notification/inbox + out-of-band delivery on a
  three-layer model: channel (sender `from` endpoint, tenant BYOC or host
  provider ref, credentials only in kvStore), notification (persisted intent
  + in-app inbox row), message (delivery outbox, `queued → sending → sent →
  delivered/failed`, swept by `comms.message-sweeper` cron `* * * * *`).
  Runtime-wired (`auth, db, kvStore, pubsub`); `$prepareRuntime()` registers
  sweeper + 7 event-bridge subscriptions (`calendar.reminder_due`,
  `dms.file_expired`, `announcement.published`, `workspace.delivery_due`,
  `tenant.provisioned`/`tenant.activated`, `auth.email_otp_requested` — OTP
  never persisted, delivered inline) + 4 healthcare-bridge subscriptions
  (`$consumes` = 11 total). 1 control-plane table (`provider`) + 6 tenant
  tables, 21 events, 7 ACL resources. No module deps.

Implemented: Healthcare module — stateless OPD clinic backend (`$initialize`/
  `$prepareRuntime`/`$cleanup` empty, no schedules, no subscriptions): patients
  (phone/ABHA dedupe, two-party merge), practitioners (schedules, fee versions,
  `conflict`/`nextFreeSlot`), facilities (occupy/release, sterilization),
  services + pricelists (branch resolution, publish/bulk-revision), appointments
  (slots, queue, video), encounters (dx/rx/vitals, `sign`), five-specialty EMR
  (allopathy/dental/ayush/rehab/psych), residents (long-stay, not IPD),
  pharmacy (batch stock, ledger), diagnostics (order→sample→result→deliver +
  radio track, `authorize`-gated), billing (raise→finalize→collect/settle,
  `discount-approve`-gated), nursing (board, handover, escalation), records
  (merge, retention, share logging), operations (explorer, reports, seed),
  staff, admin. 140 `healthcare_*` tables (all tenant) + 13 pgEnums (153
  `healthcareTables` entries), 47 events sharing one `HealthcareEntityEvent`
  payload, 19 ACL resources (elevated only `billing:discount-approve`,
  `diagnostics:authorize`, `psych:override`). No module deps. OPD only — no
  ADT/IPD, no OT, no insurance/TPA.

Implemented: HR as three packages — hr-core (6 groups, 31 tables 14
  control + 17 tenant, 40 events, 8 ACL, reconciliation subscriptions),
  hr-attendance (3 groups, 11 tenant tables, 12 events, 3 ACL,
  `hr.daily-attendance-sync` cron), hr-leave (1 group of 60 actions, 12
  tenant tables, 6 events, 1 ACL, `hr.daily-leave-accrual` cron). Announcements
  (`hr.announcement.*`, incl. `announcement.published` consumed by comms)
  live in hr-core w/ `hr.announcement-scheduler` minute cron. Totals: 10
  groups, 54 tables, 58 events, 12 ACL resources. All `$dependencies = []`;
  units `db`, `pubsub`.

Stubs (empty `src/index.ts` + `docs/` shell + `package.json` name only — no
  source): crm, fleet, inventory, reports
```

## Known Gaps

1. **`RoleUnassignedEvent` missing `roleName`** — unlike `RoleAssignedEvent` which has `{ roleName, userId }`, unassigned event only has `{ userId }`.
2. **No DB-level FK constraints in domain modules** — all cross-table references in compliance, tasks, masters, management, hr logical (soft FKs by naming convention), not DB-enforced.
3. **DMS consolidation (`.working-docs/sow/dms-consolidation.md`) complete** — removed `@aspen-os/drive` filesystem consolidated into `@aspen-os/dms` as one `file` entity, one label mechanism, one sharing group (`p.dms.shares`), one trash module, `fileViews` terminology. `dms_document*`/`dms_tag`/`dms_view`/`dms_item_*` tables no longer exist; host deployments must run §8 migration to drop merged-away tables + rename enums/tables.
4. **`SingleTenantPlatform` + `SharedTenantPlatform` EXPERIMENTAL** — both constructors emit `console.warn("... Architecture is currently EXPERIMENTAL")`. `IsolatedTenantPlatform` does not warn.
5. **`IsolatedTenantConfig` has no `resolver` field** — dummy resolver (`list: async () => []`, `resolve: async (id) => id`) constructed inline in `IsolatedTenantPlatform.create()` instead of accepting real `TenantResolver` via config.
6. **`ManagementPlaneConfig` = `undefined`** — provisioning workflow expects richer config (`tenantDbNamingScheme`, `defaultTenantDbHost`, `postgresAdminConnection`, `moduleSchemas`) but type not defined yet.
7. **Management module `$name` = `"management"`** — matches `@aspen-os/management` package name (renamed from `management-plane`). Proxy accessor = `p.management`. Exposes 5 groups (`tenants`, `tenantMembers`, `serviceProviders`, `organizations`, `users`); `$dependencies = []`.
8. **`context.actorId` typed but never populated by framework** — `AsyncLocalStorage` context declares `actorId?: string` but platform never sets it from authenticated session. Audit entries fall back to `"system"` until app code or middleware populates it.
9. **ADR-0009 accepted for Layer 1** — `AuditUnit` + `audit_log` table described in ADR-0009's Layer 1 built + shipped; ADR status now "Accepted (Layer 1)". Layer 2 (trigger-based blind-write capture, ADR-0010) remains proposed/unimplemented.
10. **`audit_log.id` now conforms** — previously `uuid()` + `$defaultFn(() => uuidv7())` (the sole native uuid column); now uses `uuidv7().primaryKey()` (text), matching every other table.
11. **HR split into 3 packages** — `@aspen-os/hr-core` (`$name = "hrCore"`), `@aspen-os/hr-attendance` (`$name = "hrAttendance"`), `@aspen-os/hr-leave` (`$name = "hrLeave"`). Earlier docs marked HR "partial/not conformant" or a single `Hr` module; all three are now conformant (`implements Module`, `$prepareRuntime()`, one-file-per-action layout).
12. **Masters extraction complete; no `bank_account` table** — `@aspen-os/masters` owns contacts, addresses, integration connections, entities, payment methods (inline bank details, no `master_bank_account` table), labels, org branches, settings, units of measure (9 groups, 12 tables, 32 events, 9 ACL). `connection` = integration credential (secrets in platform `kvStore` via `credentialRef`). There is no `packages/organization` — org surface is `masters.orgBranches` + `management.organizations`.
13. **Masters UOM + labels/settings added post-Phase-2** — `unitOfMeasure` tenant-wide reference data (one base unit per category; `master_uom_alias` / `master_uom_version` history); `labels` scope-keyed + `settings` (`org.*` tenant-wide, else per-user). Payment-method `bankAccountId` FK is gone — type-specific inline fields instead.
14. **Workspace module implemented (no resolver registry)** — `@aspen-os/workspace` provides drafts, filter views, dashboards, widgets, schedules, utilities (8 tenant tables, 6 pgEnums, 30 events, 9 ACL resources). `domain` is free-form `<module>:<entity>` text w/ documented `FILTER_VIEW_DOMAIN` 6 values — there is no host-registered resolver registry in code. Host apps must subscribe to `workspace.delivery_due` / `workspace.draft_published` — both silently dropped by pg-boss when unsubscribed (detect via `getUnsubscribedProducedTopics`). `context.actorId` (gap 8) feeds access scoping: `create` falls back to explicit `ownerId`/`userId` input when context actor unset.
15. **Notes module implemented; `master_note` removed** — `@aspen-os/notes` owns first-class `note` entity (`personal`/`global` access, optional `(scopeType, scopeId)` scope, `NOTE_TYPE`, tags; 1 tenant table + 2 enums, 3 events, 1 ACL resource; no units). Host deployments must migrate `master_note` rows to `note` (map `entityType → scopeType = masters:<entityType>`, `entityId → scopeId`, `content → body`, `userId → ownerId`) + `DROP TABLE master_note` afterward; `pushSchema` never drops it.
16. **`.working-docs/` lags code** — still references `packages/organization` (deleted), tasks "15 tables / 6 control-plane" (code: 14 / 5+9), management "3 groups / 3 owned / 0 shadow / 17 events / deps organization" (code: 5 groups / 4 owned + 2 shadow / 22 events / deps []), workspace "28 events / 4 enums / resolver registry" (code: 30 / 6 / none), compliance Reminder Engine (none in code — calendar owns reminders), masters `bank_account` tables/events (removed), HR single-module shape (now 3 packages), `BasePlatform.healthCheck` + zero-arg `SingleTenantPlatform.run(fn)` (code: uniform `run(tenantId, fn)`, only rpc `health.check`). Code is truth; fix docs before relying on them.

## Anti-Patterns

- Don't register modules after `create()` — pass them to `XxxPlatform.create()` as second arg (an array)
- Don't use native UUID columns — always `id: uuidv7().primaryKey()` (SQL `text`; the `uuidv7` type generates the UUIDv7 default at insert time in JS)
- Don't use `timestamp without time zone` — always `withTimezone: true`
- Don't create barrel files unless explicitly told
- Don't import bare `@aspen-os/platform` — use `/server` or `/client` subpath explicitly
- Don't import `@aspen-os/organization` — the package does not exist; use `p.masters.orgBranches` + `p.management.organizations`
- Don't assume a single `Hr` module — use `hrCore` / `hrAttendance` / `hrLeave` (`p.hrCore`, `p.hrAttendance`, `p.hrLeave`)
- Don't assume `SingleTenantPlatform.run(fn)` — all server platforms use uniform `run(tenantId, fn)` (`"$global"` = control plane)
- Don't assume `BasePlatform.healthCheck()` exists — use rpc `health.check` + `pubsub.getUnsubscribedProducedTopics()`
- Don't assume a workspace view-resolver registry — `domain` is free-form text + documented constants; the module never queries other modules' tables
- Don't add a second `task_reminder` surface or compliance Reminder Engine — `@aspen-os/calendar` owns the single reminder surface
- Don't assume a `master_bank_account` table — bank details are inline fields on `master_payment_method`
