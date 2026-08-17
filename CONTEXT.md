# Aspen OS

Aspen OS = business application framework on Bun/TypeScript. Platform kernel provides composable infrastructure (database, auth, logging, pub/sub, RPC, storage, KV store) so domain modules build on top without reinventing plumbing.

## Language

### Platform Kernel

**Platform**:
Server-side orchestrator class. Exports three self-contained classes — `SingleTenantPlatform`, `SharedTenantPlatform`, `IsolatedTenantPlatform` — one per tenancy architecture. Each has own `create()` static factory, config type, `run()` signature. Created via `Platform.create(config, modules)`, which instantiates all Units, validates module `$dependencies`, calls `module.$initialize(units)` on each module, returns proxy-wrapped instance. Lifecycle: `create()` → `$prepareInfra()` → `run()` → `$cleanup()`.
_Avoid_: Framework (on server — that name reserved for client class), App, Container, DI Container

**Platform** (client only):
Client-side orchestrator class. Created via `Platform.create(config, modules)` w/ 3 units (auth, logs, rpc). No database, no tenancy. Has `run(fn)` method that sets client-side context (module-level variable, not `AsyncLocalStorage`) w/ `{ auth, logs, rpc }`, invokes `fn`. Server has no `Framework` class — use a Platform class.
_Avoid_: Framework (on client — class renamed to `Platform`), App, Container, DI Container

**Unit**:
Infrastructure building block w/ `$name`, `$cleanup()` method, optional `$prepareInfra()` method. Eight core server units: `db`, `auth`, `logs`, `pubsub`, `rpc`, `storage`, `kvStore`, `audit`. Three client units: `auth`, `logs`, `rpc`. Both server + client Unit interfaces use `$` prefix for lifecycle methods + name property.
_Avoid_: Service, Provider

**Module**:
Business logic plugin passed to `Platform.create()`. Receives unit dependencies via `$initialize(units)`. Declares infra needs via `$prepareInfra()` (returns `ModuleInfra`), runtime setup via `$prepareRuntime()`, optional per-tenant setup via `$prepareTenant?(tenantId)`. Declares module dependencies via `$dependencies: readonly string[]` (validated at `create()` time — throws if dependency not provided). Accessed on platform instance via proxy — e.g. `p.organization`. Both server + client Module interfaces use `$` prefix.
_Avoid_: Plugin, Extension

**Create**:
Static factory `Platform.create(config, modules)`. Instantiates all Units from config, validates module `$dependencies`, calls `module.$initialize(units)` on each module, returns proxy-wrapped platform instance. Only way to construct a Platform — constructor internal.
_Avoid_: Register, Mount, Attach

**PrepareInfra**:
Post-creation infrastructure setup on all Units + Modules. Called after `create()`. Calls `unit.$prepareInfra()` on each unit, collects `mod.$prepareInfra()` declarations (schemas, ACL, events) from modules, merges them, calls `db.prepareWithModules()` (schema push) + `auth.applyModuleAcl()`, then `mod.$prepareRuntime()` on each module. In isolated mode, also iterates tenants from `resolver.list()` + calls `mod.$prepareTenant(tenantId)` per tenant. In shared mode, applies RLS policies via `db.applyRlsPolicies()`.
_Avoid_: Migrate, Setup, Prepare

**Run**:
Executing a function within `AsyncLocalStorage` context providing `auth`, `db` (drizzle instance), `pubsub` (full PubSubUnit). Signature varies by platform: `SingleTenantPlatform.run(fn)` takes no tenant ID; `SharedTenantPlatform.run(tenantId, fn)` + `IsolatedTenantPlatform.run(tenantId, fn)` require one. In shared mode, opens transaction, sets `app.tenant_id` + `SET LOCAL ROLE tenant_role`, creates per-call drizzle instance. In isolated mode, resolves + connects to tenant DB.
_Avoid_: Execute, Dispatch

**Destroy**:
Graceful shutdown of all Modules, then all Units. Clears internal state. Implemented as `$cleanup()`, not `destroy()`.
_Avoid_: Shutdown

**GetUnit**:
Typed accessor to retrieve a Unit by name after creation. Requires a name — no zero-arg overload.
_Avoid_: Resolve, Get

**GetModule**:
Typed accessor to retrieve a Module by name. Requires a name — throws if not found. No zero-arg overload.
_Avoid_: Resolve, Get

**Health Check**:
Liveness probe on platform via `BasePlatform.healthCheck()`. Returns `HealthReport` `{ status, checks: { db, pubsub }, unsubscribedTopics?, tenancyMode, at }`. Probes control-plane DB (`SELECT 1`) + pub/sub (`getQueueSize` on probe topic — lazily starting control-plane pg-boss, proving it can connect). Also reports topics produced to but w/ no registered subscriber (`unsubscribedTopics`) — pg-boss silently drops these, so they flag producer/consumer wiring bug. `status` = `"ok"` only when every check passes AND no unsubscribed produced topics exist. `checkDbHealth`/`checkPubSubHealth` = protected hooks derived classes may override.
_Avoid_: Ping, Health Probe, Heartbeat

### Database

**DatabaseUnit**:
Core unit owning `pg.Pool` + drizzle `NodePgDatabase`. `$name` = `"db"`. Exposes `$prepareInfra()` which runs `pushSchema()` from drizzle-kit to apply schema migrations. Also exposes `tenancyMode`, `controlPlaneDb`, `resolver`, `pool`, `applyRlsPolicies()`, `prepareWithModules()`.
_Avoid_: DbUnit, ConnectionPool

**DatabaseConfig**:
Connection parameters: `host`, `port`, `user`, `password`, `database`, `ssl?`, `maxConnections?`.

### Authentication

**AuthUnit**:
Core unit wrapping better-auth. Exposes `service` getter (better-auth instance, incl. `.api` admin/organization endpoints), HTTP handler (`fetchHandler(request)`), `_` getter w/ REST-style `resource.action` workflow methods for user, session, role management. (Browser-side `AuthUnit` in `@aspen-os/platform/client` wraps better-auth React client instead.) ACL **not** part of `AuthConfig` — applied later during `prepareInfra()` via `AuthUnit.applyModuleAcl(mergedAcl)`, which creates `AccessControl` from merged module ACL declarations + rebuilds better-auth instance w/ `admin({ ac: accessControl })` plugin. Initial construction includes `admin()` without `ac` — AC only applied after module infra collected.
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
Plain text field on the User table. In Recruiter app, values `admin`, `bd`, `caller`, `qc`, `rm`, `sc`, `tl`. Not separate entity — no dedicated role table exists.
_Avoid_: Permission Group, Access Level

**Access Control**:
Declarative statement matrix defining `{ resource: [actions...] }`. Modules declare ACL via `defineAcl()` (type-helper from `@aspen-os/platform/server`) returning `AclDeclaration`. During `prepareInfra()`, platform merges all module ACLs + calls `AuthUnit.applyModuleAcl(mergedAcl)`, which creates `AccessControl` via `createAccessControl` (from better-auth) + rebuilds better-auth instance w/ `admin({ ac: accessControl })` plugin. Initial `AuthUnit` construction includes `admin({})` without `ac` — AC applied only after module infra collected.
_Avoid_: Permission Matrix, ACL

**Auth Event**:
Typed domain event contract defined in auth services (`services/{role,session,user}.ts`). Events: `user:created`, `user:updated`, `user:deleted`, `session:created`, `session:invalidated`, `role:assigned`, `role:unassigned`, `role:deleted`. Published via PubSub as plain string topics — type-level contract, not runtime bus.
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
Core unit backed by pg-boss. Topic-based publish/subscribe over Postgres job queue. Exposes `publish`, `publishBatch`, `subscribe`, `unsubscribe`, `getQueueSize`, `purgeQueue`, `schedule`, `getUnsubscribedProducedTopics`. Uses single control-plane pg-boss started lazily on first use (not in `$prepareInfra()`). Tracks produced topics so Health Check can flag topics published to w/ no registered subscriber — pg-boss silently drops these (its `send()` returns no job id). On such no-id result, `publish()` warns but does not throw.
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
Named RPC handler w/ typed input/output. Built-in: `echo`, `health.check`.
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

### Organization Domain

**Organization**:
Business entity w/ `name`, `slug` (unique), `status` (active/suspended/archived), contact info, branding (logo, accent color), locale settings. Root entity of organization context.
_Avoid_: Company, Tenant

**Branch**:
Physical or logical location belonging to an Organization. Has `name`, `code` (unique), `type` (headquarters/office/warehouse/store/factory/remote/other), supports hierarchical nesting up to 5 levels deep. Exactly one headquarters branch per organization.
_Avoid_: Location, Site, Office

**Organization Workflow**:
Domain operation within Organization module, built on platform `Workflow` builder. Two workflows: `OrganizationWorkflow`, `BranchWorkflow`. Exposed as readonly properties on module instance: `p.organization.organizations`, `p.organization.branches`.
_Avoid_: Service, Handler

> Former Connection, Connection Contact, Connection Note, Address, + Bank Account entities now live in **Masters** module as polymorphic master data (see "Masters Domain" below).

### Masters Domain

**Contact**:
Standalone business relationship record (vendor/client/insurer/…) w/ `name`, `email`, `phone`, `title`, `company`, `type` (`CONTACT_TYPE`), per-scope `isPrimary` flag. Scoped to owner via `(entityType, entityId)`.
_Avoid_: Connection (business relationship)

**Connection**:
**Integration connection** to external API/entity — `type` (`INTEGRATION_TYPE`: api_key/oauth2/webhook/basic_auth/database/other), `status` (active/inactive/expired/revoked), `baseUrl`, `description`, `credentialRef` referencing encrypted secret in platform `kvStore`. Credential material never stored in plaintext; `test` validates endpoint, `rotateCredential` writes new kvStore secret + bumps `credentialRef`.
_Avoid_: Vendor, Client, Partner (those are `Contact` records)

**Address**:
Postal address w/ `line1`, `line2`, `city`, `state`, `postalCode`, `country`, optional `label`, per-scope `isPrimary` flag. Scoped via `(entityType, entityId)`.
_Avoid_: Location, Street Address

**Bank Account**:
Financial account record w/ `accountHolderName`, `accountNumber`, `bankName`, `routingNumber`, `swiftCode`, `currency`, per-scope `isActive`/`isPrimary` flags. Scoped via `(entityType, entityId)`.
_Avoid_: Payment Method, Financial Account

**Entity**:
Tenant-level business party (company/institution) w/ rich metadata — `name`, optional unique `code`, `type` (`ENTITY_TYPE`: customer/vendor/partner/hospital/clinic/laboratory/pharmacy/insurer/regulator/bank/staffing_agency/training_institute/government/other), `status` (`ENTITY_STATUS`: active/inactive/archived), `industry`, `website`, `phone`, `email`, `taxId`, `registrationNumber`, `foundedDate`, `timezone`, `locale`, optional `organizationId` link. It is an **owner** (a `master_entity_type` value) so existing masters can scope to it; `setStatus` enforces `active` ↔ `inactive`, → `archived` (terminal).
_Avoid_: "Entity" for any polymorphic row owner; Vendors/Clients/Insurers (those are `Contact` records)

**Unit of Measure**:
Tenant-wide reference data (not polymorphic) — units across `UOM_CATEGORY` (length/mass/volume/count/time/area/temperature/data/other) w/ `name`, unique `code`, `symbol`, `decimalPlaces`, `isBaseUnit`, `baseUnitId` (self-reference), `conversionFactor`, `isActive`. Exactly one base unit per category; derived units reference category's base; unit referenced as another's `baseUnitId` cannot be deleted.
_Avoid_: Per-owner UOM sets; "measurement unit" synonyms

**Payment Method**:
Mode of payment w/ `type` (`PAYMENT_METHOD_TYPE`: bank_account/card/upi/imps/cheque), `direction` (`inbound`/`outbound`/`both`), `status` (`active`/`inactive`/`archived`), type-specific detail fields, per-`(entityType, entityId, direction)` `isPrimary` flag. `bankAccountId` = logical FK to `master_bank_account` for bank-backed types. **Card data masked-only** (`cardBrand`/`cardLast4`/expiry) — no PAN, no CVV, no token refs.
_Avoid_: Payment, Transaction, Ledger (this is method _configuration_, not payment execution)

**Master Entity Scope**:
Every polymorphic masters row owned by `(entityType, entityId)` pair where `entityType ∈ { organization, branch, connection, contact, entity }` (`master_entity_type`). All list queries filter on pair; primary flags scoped to it — for payment methods per `(entityType, entityId, direction)`. `unitOfMeasure` tenant-wide (no scope pair).

**Masters Workflow**:
Domain operation within Masters module, built on platform `Workflow` builder. Seven groups exposed on module instance: `p.masters.contacts`, `p.masters.addresses`, `p.masters.bankAccounts`, `p.masters.connections`, `p.masters.entities`, `p.masters.paymentMethods`, `p.masters.unitsOfMeasure`. `connections` group bound to platform `kvStore` unit for secret storage.
_Avoid_: Service, Handler

### Notes Domain

**Note**:
First-class note w/ optional `title` (quick-capture allowed), required `body`, `type` (`NOTE_TYPE`: general/call/email/meeting/contract_renewal/issue), `access` (`personal`/`global`, default `personal`), `ownerId` (soft FK to better-auth user), `tags` (`text[]`), optional polymorphic `(scopeType, scopeId)` scope where `scopeType` = documented `<module>:<entity>` registry value (e.g. `masters:contact`, `tasks:task`, `calendar:event`). Access enforced via `services/access-service.ts`: read = `global` OR owner; mutate = owner or tenant admin.
_Avoid_: Draft (that is workspace — approval-lifecycle content), Activity, Log Entry

**Notes Workflow**:
Domain operation within Notes module, built on platform `Workflow` builder. One group exposed: `p.notes.notes` (`create`, `get`, `list`, `update`, `delete`). `create` derives `ownerId` from `actorId`; `list` access-scoped w/ `scopeType`/`scopeId`, `type`, `tags`, `search` filters.
_Avoid_: Service, Handler

### Compliance Domain

**Compliance Document**:
Regulatory or legal document tracked through verification lifecycle. Has `name`, `category` (tax/license/certificate/permit/insurance/regulatory/legal/hr/safety/environmental + module-local: data_privacy/financial/vehicle/property/audit/other), `verificationStatus` (draft/submitted/under_review/verified/rejected/expired/overdue/renewed/archived), `expiryDate`, `dueDate`, `reminderDays`, `escalationDays`, optional `renewalFrequency`. Supports renewal chains (archived old + created new via `renewedFrom`). Linked to external entities via `{sourceModule, sourceEntityType, sourceEntityId}`.
_Avoid_: Certificate, Permit, Regulatory Record

**Compliance Obligation**:
Recurring schedule that auto-generates Compliance Documents on frequency basis (monthly/quarterly/semi_annual/annual/biennial/triennial/custom). Has `startDate`, `endDate`, `frequency`, `isActive`, default document configuration. Obligations expiry-based or period-based.
_Avoid_: Recurring Task, Schedule

**Verification Rule**:
Rule that matches documents by category + source module to determine required reviewer role + priority. Has `name`, `category`, `priority`, `assignedReviewer`, `requiredReviewerRole`, `isActive`.
_Avoid_: Review Policy, Approval Rule

**Audit Entry**:
Append-only record of actions taken on compliance entities (documents, obligations, verification rules). Has `entityType`, `entityId`, `action` (created/updated/submitted/verified/rejected/expired/overdue/renewed/archived/completed/escalated/reminder_sent/snoozed/attachment_uploaded/reviewer_assigned/obligation_activated/obligation_deactivated/document_generated), `performedBy`, `performedAt`, `previousState`, `newState`, `changes`.
_Avoid_: Audit Log, Change Record

**Verification Status**:
Lifecycle state of a Compliance Document: `draft` → `submitted` → `under_review` → `verified`/`rejected` → `expired`/`overdue` → `renewed`/`archived`. Status derived from dates + renewal state by `StatusDerivation` service, not set directly.
_Avoid_: Document State, Approval Status

**Renewal Chain**:
Linked sequence of Compliance Documents where each new document archives previous via `renewedFrom` FK. Chain preserves renewal history for a given obligation or entity.
_Avoid_: Renewal History, Version Chain

**Reminder Engine**:
Service that scans documents for upcoming expirations + due dates, transitions expired/overdue statuses, escalates past escalation thresholds, generates weekly summaries. Registers scheduled cron jobs for daily + weekly scans.
_Avoid_: Notification Service, Alert System

**Obligation Generator**:
Service that auto-generates Compliance Documents from active Obligations based on frequency schedule. Subscribes to scheduled job topic, publishes `document_generated` events.
_Avoid_: Document Factory, Auto-Generator

**Event Bridge**:
Service that subscribes to external module events (e.g. `hr:employee_onboarded`, `organization:branch_created`, `masters:contact_created`) + auto-creates relevant Compliance Documents + Obligations based on event type.
_Avoid_: Event Listener, Integration Hub

### Tasks Domain

**Project**:
Container for tasks w/ unique `key` (e.g. `PROJ`), `name`, `status` (active/archived/paused), `leadId`, `taskCounter` for sequential task numbering, optional `defaultTaskTypeId`. Members added w/ roles (admin/member/viewer).
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
Reusable filter/sort/group configuration w/ `name`, `type` (list/board/calendar/timeline), `filters` (jsonb), `sort` (jsonb), `groupBy`, `isShared`, `isDefault`. Owned by a user, optionally scoped to a project.
_Avoid_: Filter, Dashboard

**Automation Rule**:
Trigger-action rule w/ `trigger` (status_change/assignment_change/due_date_passed/task_created/task_updated), `conditions` (jsonb), `actions` (jsonb), `isActive`. Evaluated by `AutomationWorkflow` when triggers fire.
_Avoid_: Workflow Rule, Trigger

**Time Entry**:
Logged time record on a task w/ `duration` (minutes), `date`, `description`, `billable` flag, `userId`, `taskId`.
_Avoid_: Timesheet, Time Log

**Task Reminder**:
Time-bound follow-up on a task w/ `type` (due_date/custom/overdue), `remindAt`, `isRecurring`, `interval` (daily/weekly/monthly/every_2_hours), `isSent`, `userId`. **Moved to `@aspen-os/calendar`** — task reminders now `calendar_reminder` rows w/ `targetType = task`, materialized by calendar task bridge from `task:due_date_changed`.
_Avoid_: Alert, Notification

**Watcher**:
User subscribed to updates on a task. Watchers receive notifications when task updated, commented on, or status-changed.
_Avoid_: Subscriber, Follower

**Activity Log**:
Append-only record of task actions: `task_created`, `task_updated`, `status_changed`, `assignee_added`, `assignee_removed`. Has `oldValue`, `newValue` (jsonb), `userId`, `taskId`.
_Avoid_: Audit Trail, Change History

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
Invitee on an event — `email` + optional `name`/`attendeeId`/`attendeeType` (`user`/`contact`), `optional`, `status` (`invited`/`accepted`/`declined`/`tentative`). `add` publishes `calendar:attendee_invited`.
_Avoid_: Participant, Guest (implementation terms)

**Reminder**:
Platform's single polymorphic reminder surface — `calendar_reminder` rows w/ `targetType` (`event`/`task`/`note`/`file`/`custom`) + `targetId`. `type` = `offset` (resolved against target's start/due anchor), `custom`/`due_date`/`overdue` (absolute `remindAt`). Recipient-scoped via `userId`; delivered by module's dispatcher cron, which publishes `calendar:reminder_due` (full payload) + marks `isSent`. Task reminders = `targetType = task` rows created by task bridge.
_Avoid_: Alert, Notification, "Reminder Engine" (compliance's document-expiry scanner = separate, out-of-scope surface)

**Task Bridge**:
Calendar-side service (`services/task-bridge.ts`) that subscribes to `task:due_date_changed`/`task:deleted`/`task:status_changed` + materializes/cancels task due-date reminders — three `due_date` rows per recipient (due − 1d, due − 1h, due; `userIds` = assignees ∪ reporter), deletion on task delete, suppression on completion/cancellation. Event-driven, so both modules stay `$dependencies = []`.
_Avoid_: Event Listener (compliance's EventBridge = general pattern; Task Bridge = calendar-specific consumer)

### HR Domain

**Employee**:
Person record w/ `employeeId`, `firstName`, `lastName`, `email`, `phone`, `dateOfBirth`, `dateOfJoining`, `dateOfLeaving`, `department`, `designation`, `grade`, `employmentType`, `branch`, `reportsTo`, `status`. Supports health insurance, skill maps, employee groups.
_Avoid_: Staff, Worker, Personnel

**Attendance**:
Daily attendance record w/ `date`, `employeeId`, `status`, `checkInTime`, `checkOutTime`, `workingHours`, `lateEntry`/`earlyExit` minutes, `isHalfDay`, `shift`. Supports attendance requests (correction workflow).
_Avoid_: Timesheet, Presence Record

**Employee Check-in**:
Geolocation-tagged check-in/out event w/ `time`, `logType`, `latitude`, `longitude`, `deviceId`, `isOffShift`.
_Avoid_: Punch, Clock Event

**Leave**:
Leave management sub-domain covering leave types, periods, policies, allocations, applications, compensatory leave, encashment, block lists, adjustments, ledger entries. Leave applications follow approval workflow (pending → approved/rejected → cancelled).
_Avoid_: PTO, Time Off

**Lifecycle**:
Employee lifecycle sub-domain covering onboarding (tasks, completion tracking), promotions (w/ salary revision), transfers (between departments/branches/companies), separation (exit interviews, full & final settlement).
_Avoid_: Employee Journey, HR Lifecycle

**Overtime**:
Overtime tracking sub-domain w/ configurable overtime types (rates, multipliers for holidays/weekends) + overtime slips following approval workflow.
_Avoid_: Extra Hours, Overtime Log

**Shift**:
Shift management sub-domain covering shift types (start/end times, grace periods, auto-attendance), shift locations (geofencing), shift assignments, shift requests (approval workflow), shift schedules (weekly day-of-week assignments).
_Avoid_: Roster, Schedule

**Position**:
Structural sub-domain — stable job slots (`hr_position`: `name`, `department`, `branch`, `designation`, `reportsToPosition`, `employmentType`, `headcount`, `jobDescription`, `isActive`) with employee assignments (`hr_position_assignment`: `positionId`, `employeeId`, `fromDate`, `toDate`, `isPrimary`). Positions outlive incumbents; assignments retain history. Manager resolution walks the `reportsToPosition` chain, falling back to `employee.reportsTo`. Structure views: org tree, position tree, direct reports, subordinates, peers, team.
_Avoid_: Job, Role Slot

**HR Access**:
Role-based access control within HR module, w/ permissions, roles, branch-wise access controls for HR users.
_Avoid_: HR Permissions, HR Auth

**Department**:
Organizational unit w/ `name`, `code`, `manager`, `parentDepartment` (hierarchical), `isActive`.
_Avoid_: Team, Unit

**Designation**:
Job title w/ `name`, `description`, `isActive`.
_Avoid_: Title, Grade (distinct from Position — a designation tiers a position/employee)

**Employment Type**:
Classification of employment (e.g. full-time, part-time, contract) w/ `name`, `description`, `isActive`.
_Avoid_: Contract Type, Employment Status

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

**Contact**:
Org-wide address-book entry (first name, last name, email, phone, company name, designation — all mandatory) used as sharing handle for external parties; may be linked to internal AuthUnit user. Removal requires mandatory reason + revokes all shares granted to contact.
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
Color-coded tag (`name`, `color`, global or owner-scoped) applied to Files + Folders through polymorphic `dms_entity_label` join. File/folder can carry multiple labels; upload accepts `labelIds`.
_Avoid_: Tag, Category, Custom Field

**Activity Feed**:
Per-entity chronological trail of DMS actions (upload, classify, version, share, delete, expire, restore, purge, hold), projected from platform AuditUnit's `audit_log` — not DMS-owned table, not PubSub events.
_Avoid_: Audit Trail (that's the platform unit), Event Log, Change History

### Workspace Domain

> The `@aspen-os/workspace` module. Term **Workspace** here = **personal-workspace surface** — drafts, filter views, dashboards, utilities — deliberately NOT Tenancy, NOT tasks Project/Board (both list "Workspace" as avoid term). See `.working-docs/domain-model/workspace.md`.

**Draft**:
Saved, unpublished piece of content — `title`, `body` (markdown/text), `notes`, `metadata` (opaque) — w/ optional approval lifecycle (`draft → submitted → approved → published`, `reject` → `reopened` to `draft`), soft-delete trash, duplicate, threaded comments (`workspace_draft_comment`). First-class persistable entity — NOT the "draft" status value used by other modules (compliance documents, hr contracts).
_Avoid_: Draft Status, Staging Content

**Approval**:
Optional `submit → approve` gate on a Draft; hosts without a review step call `publish` directly from `draft` (approval not mandatory).
_Avoid_: Review, Sign-off (informal)

**Filter View**:
Cross-domain saved filter/sort/group configuration: `domain` (free-form `<module>:<entity>` key), `conditions` (dms `FileViewCondition` shape `{ field, operator, value }`), `sort` (`{ field, direction }`), `groupBy`, `isDefault` per `(ownerId, domain)`. `apply(id)` resolves conditions through **host-registered resolver** in module's runtime registry — module never queries other modules' tables. Built-in domains: `workspace:draft`, `tasks:task`, `dms:file`, `compliance:document`, `hr:employee`; app-defined domains allowed.
_Avoid_: Saved Filter, Saved Search, List View (that's tasks' `task_saved_view`)

**Dashboard (workspace)**:
Named collection of Widgets + jsonb grid `layout` (`{ widgetId, x, y, w, h }[]` stored on dashboard row). Supports `duplicate`, `export` (JSON snapshot incl. widgets), `import`, per-dashboard Schedules. No widget-overlap validation in v1. NOT compliance's module-local summary metrics.
_Avoid_: Board, Analytics Page

**Widget**:
Declarative datasource config on a Dashboard — `metric` (count/sum/avg/min/max over domain + filter + date range), `breakdown` (group-by + range), `list` (first-N + range), `embed` (markdown/url/iframe). Module stores + serves configs, tracks `lastRefreshedAt`/`lastError`; does **not** render or execute analytics. Datasource = `{ domain }` + exactly one of inline `filter` or `viewId` soft-FK to saved Filter View.
_Avoid_: Chart, KPI Card (implementation terms)

**Schedule (workspace)**:
Per-Dashboard cron delivery configuration (`{ recipients, format: export|pdf|url, subject? }`). `create`/`resume` register pg-boss cron on `workspace:schedule:<id>`; module's handler publishes `workspace:schedule_due` (full schedule + dashboard payload) + **host renders/delivers**. `markRun` records completion. Distinct from dms's module-level cron jobs (expiry scan, auto-purge).
_Avoid_: Recurring Delivery, Notification Job

**Pin (workspace)**:
Per-user sidebar shortcut to any tenant item via `PIN_ITEM_TYPE` registry — workspace entities (`draft`/`view`/`dashboard`) + dms items (`triage`/`file_view`/`class`), soft-referenced by `(itemType, itemId)` w/ no module dependency; unique `(userId, itemType, itemId)`. Dms module's pin surface consolidated here.
_Avoid_: Bookmark, Favorite

**Recent**:
Per-user bounded history of touched workspace entities; `touch` upserts + bumps `lastAccessedAt` + trims to configured cap (default 50).
_Avoid_: History, Recently Viewed

**Watch (workspace)**:
Per-user follow-subscription on a view/dashboard. `watches.subscribe`/`unsubscribe` = follow-subscriptions (tasks-watcher vocabulary) — **distinct from `PubSubUnit.subscribe`/`unsubscribe`** (pg-boss topics). Workspace persists subscriptions + emits `watch_subscribed`/`watch_unsubscribed`; future `notifications` module consumes them.
_Avoid_: Subscriber, Follower

**Setting (workspace)**:
Per-user workspace preference (`key`, `value` jsonb). Keys: `home_dashboard`, `default_view.<domain>`, `default_range`, `timezone`; values validated per key.
_Avoid_: Preference (informal)

**Personal / Global Access**:
First-class `access` enum on Drafts, Filter Views, Dashboards, set by user at create/update time. `personal` = visible only to `ownerId`; `global` = org-wide within tenant. Widgets + schedules **inherit** parent Dashboard's access. Replaces ad-hoc `isShared`/`isGlobal` booleans of dms/tasks **in this module** (those not retrofitted).
_Avoid_: Sharing Flag, Visibility Scope

### Management Plane Domain

**Tenancy Mode**:
Class-time choice — developer selects one of three platform classes at startup: `SingleTenantPlatform` (one database, no isolation, `run(fn)` — currently EXPERIMENTAL), `SharedTenantPlatform` (one shared database, Postgres RLS policies enforce isolation, `run(tenantId, fn)`), `IsolatedTenantPlatform` (control-plane DB + per-tenant DBs, physical isolation, `run(tenantId, fn)`). Once class chosen, mode cannot change. Same module code works in all three modes. Config type (`SingleTenantConfig`, `SharedTenantConfig`, `IsolatedTenantConfig`) does not include `tenancy` field — the class IS the mode.
_Avoid_: Tenancy Strategy, Isolation Mode, Deployment Mode

**Tenant ID**:
String identifier for tenant context of a request. In `single` mode, always `"default"`. In `shared` + `isolated` modes, resolved from authenticated session (e.g. better-auth's `session.activeOrganizationId`) + passed to `platform.run(tenantId, fn)`. Stored in `AsyncLocalStorage` context. Used by stable DB wrapper to route queries, `PubSubUnit` to route messages, `StorageUnit`/`KvStoreUnit` to prefix keys.
_Avoid_: Org ID, Workspace ID, Customer ID

**Tenant Resolver**:
Function pair provided by app in `isolated` mode: `resolve(tenantId)` returns per-tenant database name, `list()` returns all tenant IDs. Used by `DatabaseUnit` to lazily create per-tenant connection pools + by `prepareInfra()` to call `$prepareTenant()` for each tenant at startup. Note: `IsolatedTenantConfig` does NOT include `resolver` field — dummy resolver (`list: async () => []`, `resolve: async (id) => id`) constructed inline in `IsolatedTenantPlatform.create()`. Known WIP gap.
_Avoid_: Tenant Registry, Connection Provider

**Control Plane**:
Management/administration database connection. In `single` + `shared` modes, this IS the app database. In `isolated` mode, shared control-plane database holding auth tables + platform-level tables. `DatabaseUnit` always holds control-plane pool. `AuthUnit` always uses `controlPlaneDb`. Auth tables exempt from `tenant_id` columns + RLS policies.
_Avoid_: Management DB, Admin DB

**Tenant Database**:
Per-tenant Postgres database in `isolated` mode. Holds that tenant's data-plane data (all module tables). No auth tables live here. `DatabaseUnit` lazily creates pool per tenant database. Isolation physical — tenant cannot reach another tenant's database.
_Avoid_: Tenant Schema, Data Plane DB

**Stable DB Wrapper**:
JavaScript `Proxy` returned by `DatabaseUnit.db` (a getter). Created once at init time, stored by workflows as `this.db`. When any property accessed (e.g. `this.db.select()`), wrapper reads per-request drizzle instance from `AsyncLocalStorage` + delegates to it. In `single` mode, falls back to control-plane drizzle instance if no context set. Transparent to workflows — no workflow code changes.
_Avoid_: DB Proxy, Drizzle Router, Connection Resolver

**Prepare Tenant**:
Optional lifecycle method on `Module` interface: `$prepareTenant(tenantId)`. Called at startup for each existing tenant (in `isolated` mode) during `prepareInfra()` + during tenant provisioning. Modules register per-tenant cron schedules + subscriptions here. Platform sets up `AsyncLocalStorage` context w/ `tenantId` before calling each module's `$prepareTenant()`. Not called in `single` or `shared` modes.
_Avoid_: Per-Tenant Init, Tenant Setup

**Tenant**:
SaaS customer account at platform layer. Implemented as a better-auth **Organization** (via better-auth's Organization plugin) — the Tenant IS the better-auth `organization` row in control-plane DB, w/ companion `tenant` table for extra domain fields (status, plan, SP assignment, database connection params). Carries `name`, `slug`, `logo` (on better-auth org row) + account-level fields (signup date, lifecycle status, plan, SP assignment). Does NOT hold rich profile fields (accentColor, website, industry, taxId, etc.) — those live on aspen-os Organization companion. "List of Organizations" UI in SOW = projection over Tenants.
_Avoid_: Organization (when meaning SaaS customer — collides with aspen-os Organization module entity), Customer Account, Subscription, Workspace

**Tenant Status**:
Lifecycle state of a Tenant: `onboarding` (pre-go-live, SP doing physical-world work) → `active` (live) → `suspended` (voluntarily or involuntarily paused) → `churned` (offboarded). Coarse by design — `onboarding` opaque single stage; internal install/training/handoff sub-steps NOT tracked by platform. Distinct from any better-auth org status + from aspen-os Organization module's `status` (active/suspended/archived) — that one = rich-profile companion's operational state.
_Avoid_: Tenant State, Account State, Lifecycle Stage

**Organization (aspen-os module)**:
Rich-profile companion entity in aspen-os `organization` module. 1:1 with a Tenant (shares better-auth org ID). Lives in per-tenant database. Holds all company-profile fields: `name`, `slug`, `logo`, `accentColor`, `website`, `industry`, `phone`, `email`, `address`, `taxId`, `registrationNumber`, `foundedDate`, `timezone`, `locale`, `metadata`, `status`. Branches, Connections, Addresses, BankAccounts hang off this entity. Renamed conceptually to "Organization Profile" in Management Plane context to avoid collision with better-auth Organization/Tenant. Note: `name`/`slug`/`logo` duplicated between better-auth org row (control-plane) + this table (per-tenant) — provisioning workflow seeds both.
_Avoid_: Tenant (different concept), Company, better-auth Organization

**Service Provider**:
First-class platform entity — implementation/integration partner that does physical-world onboarding work for a Tenant (site setup, install, training). Each Tenant has at most one active Service Provider at a time (1:1 active assignment); an SP may serve many Tenants. SP's staged work happens during Tenant's `onboarding` stage. Lives in own table in control-plane DB; not a Tenant subtype, not reuse of aspen-os `organization` module's `Connection`.
_Avoid_: Integrator, Vendor, Partner, Connection, Reseller

**Platform Admin**:
User w/ `user.role = 'platform_admin'` + zero `member` rows. Operates management portal — CRUD over Tenants, Service Providers, platform users, reports. Works ONLY against control-plane DB; never touches tenant data-plane data directly. If platform admin needs to inspect tenant's data, uses better-auth admin-impersonation (`signInAsUser`) to act as tenant admin. Has cross-tenant visibility on control-plane entities.
_Avoid_: Super Admin, Root, Operator

**Service Provider User**:
User w/ `user.role = 'sp_user'` + `service_provider_user` join row pointing to their Service Provider. Zero tenant `member` rows. Field staff working for an SP — can view assigned Tenants, update onboarding status, upload install/training artifacts. Scope = SP they belong to, not a tenant.
_Avoid_: Integrator User, Field Agent

**Audit Log**:
Append-only record of management actions, written via platform's `AuditUnit` (`ctx.audit.write(...)`) inline in each workflow. Has `entityType` (tenant/serviceProvider/platformUser), `entityId`, `action` (one of 17 defined audit actions), `actorId`, `performedAt`, `previousState`, `newState`, `changes`, `metadata`. Lives in platform's `audit_log` table (pushed as platform core schema). Management plane does NOT own separate `audit_log` table or `logAuditStep` — uses platform unit directly.
_Avoid_: Audit Trail, Change Record

**Platform User**:
User managed by Management Plane module — distinct from tenant end-users. Includes platform admins + service provider users. Created/updated/deleted via `users` workflow, which delegates to `AuthUnit.user` for better-auth operations. SP membership modelled by `service_provider_user` join row (1:1 user→SP), not `spId` column on `user`.
_Avoid_: Admin User, Management User

**Report**:
Read-only view produced by Management Plane over control-plane DB. Four categories: (1) tenant usage metrics (users, modules, storage, API calls per tenant), (2) provisioning & lifecycle reports (tenants by lifecycle stage, assigned SP, time-in-onboarding, churn reasons), (3) audit & activity reports (who created/suspended/churned a tenant, SP assignments, role changes, platform admin actions), (4) SP performance reports (tenants per SP, avg onboarding duration, completion rates). All reports control-plane queries; never cross into per-tenant DBs.
_Avoid_: Dashboard, Analytics, Metric

**Provisioning**:
Workflow that creates a new Tenant end-to-end, run by Management Plane module via `Workflow.name("tenant.onboard")`. Steps: (1) create better-auth Organization (the Tenant) via `ctx.auth.service.api.createOrganization()`, (2) call `dbUnit.provisionTenant(tenantId, dbOptions)` — in isolated mode issues `CREATE DATABASE` against Postgres server via admin connection, runs `pushSchema()` against new tenant DB w/ all platform + module schemas, returns connection params; in shared mode no-op, (3) seed aspen-os Organization profile row in new tenant DB via `dbUnit.seedTenantDb()` (isolated only), (4) record connection params + status in control-plane `tenant` table, (5) write audit entry via `ctx.audit.write(...)`, (6) publish `tenant:provisioned` event. Sets Tenant status to `onboarding`. Exposed via `p.management.tenants.onboard()`. Note: `ManagementPlaneConfig` currently `undefined` — provisioning workflow expects richer config (`tenantDbNamingScheme`, `defaultTenantDbHost`, `postgresAdminConnection`, `moduleSchemas`) but type not defined yet. Known WIP gap.
_Avoid_: Onboarding (that's the Tenant Status stage AFTER provisioning), Setup, Initialization

## Context Relationships

```
┌──────────────────┐    ┌─────────────────────────────────────────────┐
│    Recruiter     │───→│            Server Platform Classes            │
│    (app)         │    │  SingleTenantPlatform (EXPERIMENTAL, run(fn)) │
│                  │    │  SharedTenantPlatform (EXPERIMENTAL, RLS,    │
│  uses            │    │    run(tenantId,fn))                          │
│  SingleTenant    │    │  IsolatedTenantPlatform (DB/tenant, run(...)) │
│  Platform        │    │  8 core units: db, auth, logs, pubsub,       │
│  org + tasks     │    │  rpc, storage, kvStore, audit                │
└──────────────────┘    └──────────┬──────────────────────────────────┘
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
      │  registers modules via SingleTenantPlatform.create(config, [organization, tasks])
      │
      ├──────────────┬─────────────────────┬──────────────────────┬──────────────────────┬─────────────────┬─────────────┬──────────────┐
      ▼              ▼                     ▼                      ▼                      ▼                 ▼             ▼              ▼
┌──────────┐ ┌──────────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ ┌─────────────┐ ┌──────────────┐ ┌──────────────┐
│Organizat.│ │   Compliance     │ │    Tasks     │ │     DMS      │ │     HR       │ │    Notes     │ │ Management Plane │ │   Masters   │ │  Calendar   │ │  Workspace   │
│  Module  │ │    Module        │ │   Module     │ │   Module     │ │   Module     │ │    Module    │ │     Module       │ │   Module    │ │   Module    │ │   Module     │
│          │ │                  │ │              │ │              │ │ (conformant) │ │  (stateless) │ │                  │ │             │ │             │ │              │
│2 workflows│ │ 5 wf groups     │ │ 10 wf groups │ │ 18 wf groups │ │ ~270 methods│ │ 1 wf group   │ │ 3 wf groups     │ │ 7 wf groups │ │ 4 wf groups │ │ 10 wf groups │
│2 tables  │ │ 3 services       │ │ 16 tables    │ │ 14 tables    │ │ 52 tables    │ │ 1 table      │ │ 3 owned tables   │ │ 7 tables    │ │ 4 tables    │ │ 10 tables    │
│7 events  │ │ 3 tables         │ │ 10 events    │ │ 33 events    │ │ 52 events    │ │ 3 events     │ │ 0 shadow tables  │ │ 29 events   │ │ 14 events   │ │ 32 events    │
│deps:     │ │ 23 events        │ │ units:       │ │ 11 ACL res.  │ │ 2 crons      │ │ 1 ACL res.   │ │ 16 events        │ │ 7 ACL res.  │ │ 4 ACL res.  │ │ 11 ACL res.  │
│masters   │ │ units:           │ │ db, pubsub  │ │ units:       │ │ units:       │ │ units:       │ │ deps: organization│ │ units:      │ │ units:      │ │ units:       │
│units:    │ │ db, kvStore,     │ │              │ │ db, pubsub,  │ │ db, pubsub  │ │ none         │ │ units:           │ │ db, kvStore│ │ db, pubsub │ │ db, pubsub   │
│none      │ │ pubsub           │ │              │ │ storage      │ │              │ │              │ │ db, auth, pubsub │ │ (conns)    │ │             │ │              │
│          │ │                  │ │              │ │ 2 crons in   │ │ prepareInfra │ │              │ │                  │ │             │ │ schedules in│ │ schedules in │
│          │ │ prepareInfra():  │ │              │ │ $prepareRun- │ │ 2 crons      │ │              │ │ prepareInfra():  │ │             │ │ $prepareRun-│ │ $prepareRun- │
│          │ │ schema push,     │ │              │ │ time         │ │              │ │              │ │ schema push      │ │             │ │ time        │ │ time        │
│          │ │ crons, handlers  │ │              │ │              │ │              │ │              │ │                  │ │             │ │             │ │              │
└──────────┘ └──────────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────────┘ └─────────────┘ └──────────────┘ └──────────────┘

Implemented: DMS module — unified document/files management on a single `file`
  entity: Triage → Classify → active (uploads into folders active immediately);
  classes → required-field validation + naming schema + `docNumber`; org-wide
  Contacts + unified sharing (user/group/contact grants + public links) under
  `p.dms.shares`; versioned files, full-text/quick search (records + filesystem
  merged), one trash module over `status` w/ retention + admin-only permanent
  delete + legal holds + expiry scanner, Activity Feed via AuditUnit; folders,
  labels (`dms_label` + `dms_entity_label`), file views. Reuses StorageUnit
  (unified `dms/{tenant}/{fileId}/v{n}/{name}` keys), AuthUnit, PubSub
  (expiry-scan + auto-purge crons), AuditUnit. 14 `dms_*` tables, all tenant
  schemas. No module deps. 18 workflow groups, 33 events.

Implemented: Workspace module — dependency-free personal-workspace surface:
  drafts (draft → submitted → approved → published, optional approval, reject →
  reopened, trash/restore, duplicate, threaded comments), filter views
  (cross-domain saved conditions/sort, applied via host-registered resolvers in
  `runtime.ts` — never touches other modules' tables), dashboards (widgets +
  jsonb grid layout, duplicate/export/import), declarative widgets (metric/
  breakdown/list/embed w/ date ranges + refresh metadata), event-driven
  schedules (per-schedule pg-boss crons → `workspace:schedule_due`, host
  delivers), user-scoped utilities (pins, recent, quick search, settings,
  watches). Access = first-class user-set enum — `personal` (owner-only) /
  `global` (org-wide). 10 `workspace_*` tables, all tenant schemas, 4 pgEnums,
  32 events, 11 ACL resources. No module deps. Units: db, pubsub.

Stubs (package.json only — no source): accounting, crm, fleet, inventory, reports, pharmacy
```

## Known Gaps

1. **`RoleUnassignedEvent` missing `roleName`** — unlike `RoleAssignedEvent` which has `{ roleName, userId }`, unassigned event only has `{ userId }`.
2. **No DB-level FK constraints in domain modules** — all cross-table references in compliance, tasks, organization, masters, management, hr logical (soft FKs by naming convention), not DB-enforced.
3. **DMS consolidation (`.working-docs/sow/dms-consolidation.md`) complete** — removed `@aspen-os/drive` filesystem consolidated into `@aspen-os/dms` as one `file` entity, one label mechanism, one sharing group (`p.dms.shares`), one trash module, `fileViews` terminology. `dms_document*`/`dms_tag`/`dms_view`/`dms_item_*` tables no longer exist; host deployments must run §8 migration to drop merged-away tables + rename enums/tables.
4. **`SingleTenantPlatform` + `SharedTenantPlatform` EXPERIMENTAL** — both constructors emit `console.warn("... Architecture is currently EXPERIMENTAL")`. `IsolatedTenantPlatform` does not warn.
5. **`IsolatedTenantConfig` has no `resolver` field** — dummy resolver (`list: async () => []`, `resolve: async (id) => id`) constructed inline in `IsolatedTenantPlatform.create()` instead of accepting real `TenantResolver` via config.
6. **`ManagementPlaneConfig` = `undefined`** — provisioning workflow expects richer config (`tenantDbNamingScheme`, `defaultTenantDbHost`, `postgresAdminConnection`, `moduleSchemas`) but type not defined yet.
7. **Management module `$name` = `"management"`** — matches `@aspen-os/management` package name (renamed from `management-plane`). Proxy accessor = `p.management`.
8. **`context.actorId` typed but never populated by framework** — `AsyncLocalStorage` context declares `actorId?: string` but platform never sets it from authenticated session. Audit entries fall back to `"system"` until app code or middleware populates it.
9. **ADR-0009 accepted for Layer 1** — `AuditUnit` + `audit_log` table described in ADR-0009's Layer 1 built + shipped; ADR status now "Accepted (Layer 1)". Layer 2 (trigger-based blind-write capture, ADR-0010) remains proposed/unimplemented.
10. **`audit_log.id` now conforms** — previously `uuid()` + `$defaultFn(() => uuidv7())` (the sole native uuid column); now uses `uuidv7("id").primaryKey()` (text), matching every other table.
11. **HR module fully conformant** — `Hr implements Module`, has `$prepareRuntime()`, follows one-file-per-action workflow layout. (Earlier docs marked HR "partial/not conformant"; no longer the case.)
12. **Masters extraction (`.working-docs/sow/masters.md`) complete** — `@aspen-os/masters` owns contacts, addresses, bank accounts, integration connections, + notes as polymorphic tenant master data; organization module holds only `organization` + `branch`, depends on `masters`. `connection` redesigned from business-relationship model to integration connections (credentials in platform `kvStore`, referenced by `credentialRef`). Host deployments must run §9 migration: `DROP TABLE` `address`, `bank_account`, `connection`, `connection_contact`, `connection_note` (after mapping data to masters) + remove old `organization:connection_created` compliance subscription.
13. **Masters Phase 2 (`.working-docs/sow/masters-phase-2.md`) complete** — `@aspen-os/masters` also owns `master_entity`, `master_unit_of_measure`, `master_payment_method` (8 tables, 8 workflow groups, 31 events, 8 ACL resources at Phase 2 completion). `entity` = `master_entity_type` owner value; `unitOfMeasure` tenant-wide reference data (one base unit per category); `paymentMethod` owner-scoped w/ masked-only card data + primary per `(entityType, entityId, direction)`. All Phase 2 additions additive — Phase 1 surface unchanged. (After notes module removed `master_note`, masters back to 7 tables / 7 groups / 29 events / 7 ACL resources — see gap 15.)
14. **Workspace module (`.working-docs/sow/workspace.md`) implemented** — `@aspen-os/workspace` provides drafts, filter views, dashboards, widgets, schedules, utilities (10 tenant tables, 4 pgEnums, 32 events, 11 ACL resources). Host apps must register view resolvers (`registerViewResolver`) for every domain they serve + subscribe to `workspace:schedule_due` / `workspace:draft_published` — both silently dropped by pg-boss when unsubscribed (health check flags them). `context.actorId` (gap 8) feeds module's access scoping: `create` falls back to explicit `ownerId`/`userId` input when context actor unset.
15. **Notes module (`.working-docs/sow/notes.md`) implemented** — `@aspen-os/notes` owns first-class `note` entity (`personal`/`global` access, optional `(scopeType, scopeId)` scope, `NOTE_TYPE`, tags; 1 tenant table, 3 events, 1 ACL resource). Note concept removed from `@aspen-os/masters` (`master_note`, `p.masters.notes`, `masters:note_added`/`note_removed`, `note` ACL resource, note schemas) — masters back to 7 tables / 7 groups / 29 events / 7 ACL resources. Host deployments must migrate `master_note` rows to `note` (map `entityType → scopeType = masters:<entityType>`, `entityId → scopeId`, `content → body`, `userId → ownerId`) + `DROP TABLE master_note` afterward; `pushSchema` never drops it.

## Anti-Patterns

- Don't register modules after `create()` — pass them to `Platform.create()` as second arg (an array)
- Don't use native UUID columns — always `id: uuidv7("id").primaryKey()` (SQL `text`; the `uuidv7` type generates the UUIDv7 default at insert time in JS)
- Don't use `timestamp without time zone` — always `withTimezone: true`
- Don't create barrel files unless explicitly told
- Don't import bare `@aspen-os/platform` — use `/server` or `/client` subpath explicitly
