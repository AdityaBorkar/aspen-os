# Aspen OS

Aspen OS is a business application framework built on Bun/TypeScript. The platform kernel provides composable infrastructure (database, auth, logging, pub/sub, RPC, storage, KV store) so domain-specific modules can be built on top without reinventing plumbing. The first concrete application is **Recruiter** — a recruitment management system.

## Language

### Platform Kernel

**Platform**:
A server-side orchestrator class. The platform exports three self-contained classes — `SingleTenantPlatform`, `SharedTenantPlatform`, `IsolatedTenantPlatform` — one per tenancy architecture. Each has its own `create()` static factory, config type, and `run()` signature. Created via `Platform.create(config, modules)`, which instantiates all Units, validates module `$dependencies`, calls `module.$initialize(units)` on each module, and returns a proxy-wrapped instance. Lifecycle: `create()` → `prepareInfra()` → `run()` → `destroy()`.
_Avoid_: Framework (on the server — that name is reserved for the client class), App, Container, DI Container

**Framework** (client only):
The client-side orchestrator class. Created via `Platform.create(config, modules)` with 3 units (auth, logs, rpc). No database, no tenancy. The server has no `Framework` class — use a Platform class instead.
_Avoid_: Platform (on the client)

**Unit**:
An infrastructure building block with a `$name`, a `$cleanup()` method, and an optional `$prepareInfra()` method. Seven core server units: `db`, `auth`, `logs`, `pubsub`, `rpc`, `storage`, `kvStore`. Three client units: `auth`, `logs`, `rpc`. Both server and client Unit interfaces use the `$` prefix for lifecycle methods and the name property.
_Avoid_: Service, Provider

**Module**:
A business logic plugin passed to `Platform.create()`. Receives unit dependencies via `$initialize(units)`. Declares infra needs via `$prepareInfra()` (returns `ModuleInfra`), runtime setup via `$prepareRuntime()`, and optional per-tenant setup via `$prepareTenant?(tenantId)`. Declares module dependencies via `$dependencies: readonly string[]` (validated at `create()` time — throws if a dependency isn't provided). Accessed on the platform instance via proxy — e.g., `f.organization`. Both server and client Module interfaces use the `$` prefix.
_Avoid_: Plugin, Extension

**Create**:
The static factory `Platform.create(config, modules)`. Instantiates all Units from config, validates module `$dependencies`, calls `module.$initialize(units)` on each module, and returns a proxy-wrapped platform instance. This is the only way to construct a Platform — the constructor is internal.
_Avoid_: Register, Mount, Attach

**PrepareInfra**:
Post-creation infrastructure setup on all Units and Modules. Called after `create()`. Calls `unit.$prepareInfra()` on each unit, collects `mod.$prepareInfra()` declarations (schemas, ACL, events) from modules, merges them, calls `db.prepareWithModules()` (schema push) and `auth.applyModuleAcl()`, then calls `mod.$prepareRuntime()` on each module. In isolated mode, also iterates tenants from `resolver.list()` and calls `mod.$prepareTenant(tenantId)` per tenant. In shared mode, applies RLS policies via `db.applyRlsPolicies()`.
_Avoid_: Migrate, Setup, Prepare

**Run**:
Executing a function within `AsyncLocalStorage` context that provides `auth`, `db` (drizzle instance), and `pubsub` (the full PubSubUnit). Signature varies by platform: `SingleTenantPlatform.run(fn)` takes no tenant ID; `SharedTenantPlatform.run(tenantId, fn)` and `IsolatedTenantPlatform.run(tenantId, fn)` require one. In shared mode, opens a transaction, sets `app.tenant_id` and `SET LOCAL ROLE tenant_role`, creates a per-call drizzle instance. In isolated mode, resolves and connects to the tenant DB.
_Avoid_: Execute, Dispatch

**Destroy**:
Graceful shutdown of all Modules, then all Units. Clears internal state.
_Avoid_: Shutdown, Cleanup

**GetUnit**:
Typed accessor to retrieve a Unit by name after creation. Requires a name — no zero-arg overload.
_Avoid_: Resolve, Get

**GetModule**:
Typed accessor to retrieve a Module by name. Requires a name — throws if not found. No zero-arg overload.
_Avoid_: Resolve, Get

### Database

**DatabaseUnit**:
Core unit owning a `pg.Pool` and drizzle `NodePgDatabase`. `$name` is `"db"`. Exposes `$prepareInfra()` which runs `pushSchema()` from drizzle-kit to apply schema migrations. Also exposes `tenancyMode`, `controlPlaneDb`, `resolver`, `pool`, `applyRlsPolicies()`, and `prepareWithModules()`.
_Avoid_: DbUnit, ConnectionPool

**DatabaseConfig**:
Connection parameters: `host`, `port`, `user`, `password`, `database`, `ssl?`, `maxConnections?`.

### Authentication

**AuthUnit**:
Core unit wrapping better-auth. Exposes a React client, an HTTP handler (`fetch_handler`), and programmatic workflows for user, session, and role management. `access_control` and `roles` from config are destructured out of the top-level spread to avoid being passed as top-level better-auth options, but ARE passed to better-auth via the `admin({ ac: access_control, roles })` plugin.
_Avoid_: Auth, AuthProvider

**User**:
An authenticated identity with `id`, `email`, `name`, optional `phoneNumber`, `image`, `role` (text field), and metadata. Passwords are stored in the separate `account` table, not on the user record.
_Avoid_: Account, Profile

**Session**:
A time-bounded authentication token tied to a User. Has `id`, `token`, `userId`, `expiresAt`. Cascades delete from User. Expiry is hardcoded at 7 days in the session workflow.
_Avoid_: Token, Login

**Account**:
A credential record linking a User to an authentication provider (email/password, OAuth, etc.). Stores `password`, `accessToken`, `refreshToken`, and provider metadata. Not the same as User.
_Avoid_: Credential, AuthMethod

**Role**:
A plain text field on the User table. In the Recruiter app, values are `admin`, `bd`, `caller`, `qc`, `rm`, `sc`, `tl`. Not a separate entity — no dedicated role table exists.
_Avoid_: Permission Group, Access Level

**Access Control**:
A declarative statement matrix defining `{ resource: [actions...] }`. Created via `createAccessControl` (from better-auth). Roles are created via `ac.newRole()`. Defined at the application level and passed to both the server AuthUnit (via `admin()` plugin) and the client AuthUnit (via `adminClient()` plugin).
_Avoid_: Permission Matrix, ACL

**Auth Event**:
A typed domain event contract defined in `AuthEventMap`. Events: `user:created`, `user:updated`, `user:deleted`, `session:created`, `session:invalidated`, `role:assigned`, `role:created`, `role:unassigned`, `role:deleted`. Published via PubSub as plain string topics — the event map is a type-level contract, not a runtime bus.
_Avoid_: Auth Signal, Auth Hook

### Logging

**LogUnit**:
Core unit providing pino-based structured logging with buffered writes to a Postgres `logs` table. Integrates OpenTelemetry span context.
_Avoid_: Logger, LoggingService

**LogEntry**:
An append-only record: `id`, `level`, `message`, `service`, `timestamp`, `metadata`, `error`, `traceId`, `spanId`, `userId`, `requestId`, `duration`.
_Avoid_: Log Record, Log Line

**LogLevel**:
Severity enum: `debug`, `info`, `warn`, `error`, `fatal`.
_Avoid_: Severity, Priority

### Pub/Sub

**PubSubUnit**:
Core unit backed by pg-boss. Provides topic-based publish/subscribe over Postgres job queue. Exposes `publish`, `publishBatch`, `subscribe`, `unsubscribe`, `getQueueSize`, `purgeQueue`, `schedule`.
_Avoid_: EventBus, MessageBroker

**Topic**:
A named message channel. Messages are published to topics and consumed by subscribers.
_Avoid_: Queue, Channel, Subject

**Message**:
A typed payload with `id`, `name`, `data`, `createdOn`. Generic over `T`.
_Avoid_: Event, Payload

**PublishOptions**:
Retry and delivery configuration: `retryLimit`, `retryDelay`, `retryBackoff`, `priority`, `expireInMinutes`, `startAfter`.
_Avoid_: DeliveryConfig, SendOptions

### File Storage

**StorageUnit**:
Core unit providing S3-compatible object storage with Postgres metadata tracking.
_Avoid_: FileUnit, ObjectStore

**FileMetadata**:
A Postgres record tracking S3 objects: `id`, `key`, `bucket`, `contentType`, `size`, `etag`, `metadata`, `archived`, `archivedKey`, `createdAt`, `updatedAt`.
_Avoid_: FileRecord, FileInfo

**Key**:
A unique S3 object identifier stored in `file_metadata.key`.
_Avoid_: Path, Filename

**Archive**:
Soft-delete that moves a file to a new key and marks the original as archived.
_Avoid_: SoftDelete, Trash

**Signed URL**:
A time-limited presigned URL for direct S3 upload or download.
_Avoid_: PresignedLink, TempUrl

### RPC

**RpcUnit**:
Core unit providing a type-safe API layer via oRPC. Exposes a router with middleware support.
_Avoid_: ApiUnit, EndpointUnit

**Procedure**:
A named RPC handler with typed input/output. Built-in: `echo`, `health.check`.
_Avoid_: Endpoint, Action

**RpcContext**:
Request context passed to procedures: `{ db, pubsub }`.
_Avoid_: RequestContext, HandlerContext

### KV Store

**KvStoreUnit**:
Core unit providing a Redis-like key-value API over a Postgres `UNLOGGED TABLE` with TTL support. `$name` is `"kvStore"`.
_Avoid_: CacheUnit, RedisUnit

**KVEntry**:
A key-value pair: `key` (PK), `value` (text, JSON-serialized), `expiresAt` (nullable TTL), `updatedAt`.
_Avoid_: CacheEntry, KVPair

**TTL**:
Time-to-live on a KV entry. Expired entries are lazily evicted on read, not by a background job.
_Avoid_: Expiration, TTL

### Organization Domain

**Organization**:
A business entity with `name`, `slug` (unique), `status` (active/suspended/archived), contact info, branding (logo, accent color), and locale settings. The root entity of the organization context.
_Avoid_: Company, Tenant

**Branch**:
A physical or logical location belonging to an Organization. Has `name`, `code` (unique), `type` (headquarters/office/warehouse/store/factory/remote/other), and supports hierarchical nesting up to 5 levels deep. Exactly one headquarters branch per organization.
_Avoid_: Location, Site, Office

**Connection**:
An external business relationship — a client, vendor, partner, or other entity the Organization interacts with. Has `name`, `type` (client/vendor/partner/subsidiary/etc.), `status` (active/inactive/prospect/former), and supports contacts and notes.
_Avoid_: Contact, Relationship, Entity

**Connection Contact**:
A person associated with a Connection. Has `name`, `email`, `phone`, `title`, and a `isPrimary` flag.
_Avoid_: Contact Person, Representative

**Connection Note**:
An interaction log entry on a Connection. Has `type` (general/call/email/meeting/contract_renewal/issue) and `content`.
_Avoid_: Activity, Log Entry

**Address**:
A postal address with `line1`, `line2`, `city`, `state`, `postalCode`, `country`, optional `label` and `isPrimary` flag. Reusable across entities.
_Avoid_: Location, Street Address

**Bank Account**:
A financial account record with `accountHolderName`, `accountNumber`, `bankName`, `routingNumber`, `swiftCode`, `currency`, and `isPrimary` flag.
_Avoid_: Payment Method, Financial Account

**Workflow**:
A domain operation class within the Organization module. Five workflows: `OrganizationWorkflow`, `BranchWorkflow`, `AddressWorkflow`, `BankAccountWorkflow`, `ConnectionWorkflow`. Each receives `db` (and optionally `pubsub`) via `$initialize()`.
_Avoid_: Service, Handler

### Compliance Domain

**Compliance Document**:
A regulatory or legal document tracked through a verification lifecycle. Has `name`, `category` (tax/license/certificate/permit/insurance/regulatory/legal/hr/safety/environmental + module-local: data_privacy/financial/vehicle/property/audit/other), `verificationStatus` (draft/submitted/under_review/verified/rejected/expired/overdue/renewed/archived), `expiryDate`, `dueDate`, `reminderDays`, `escalationDays`, and optional `renewalFrequency`. Supports renewal chains (archived old + created new via `renewedFrom`). Linked to external entities via `{sourceModule, sourceEntityType, sourceEntityId}`.
_Avoid_: Certificate, Permit, Regulatory Record

**Compliance Obligation**:
A recurring schedule that auto-generates Compliance Documents on a frequency basis (monthly/quarterly/semi_annual/annual/biennial/triennial/custom). Has `startDate`, `endDate`, `frequency`, `isActive`, and default document configuration. Obligations can be expiry-based or period-based.
_Avoid_: Recurring Task, Schedule

**Verification Rule**:
A rule that matches documents by category and source module to determine required reviewer role and priority. Has `name`, `category`, `priority`, `assignedReviewer`, `requiredReviewerRole`, `isActive`.
_Avoid_: Review Policy, Approval Rule

**Audit Entry**:
An append-only record of actions taken on compliance entities (documents, obligations, verification rules). Has `entityType`, `entityId`, `action` (created/updated/submitted/verified/rejected/expired/overdue/renewed/archived/completed/escalated/reminder_sent/snoozed/attachment_uploaded/reviewer_assigned/obligation_activated/obligation_deactivated/document_generated), `performedBy`, `performedAt`, `previousState`, `newState`, `changes`.
_Avoid_: Audit Log, Change Record

**Verification Status**:
The lifecycle state of a Compliance Document: `draft` → `submitted` → `under_review` → `verified`/`rejected` → `expired`/`overdue` → `renewed`/`archived`. Status is derived from dates and renewal state by the `StatusDerivation` service, not set directly.
_Avoid_: Document State, Approval Status

**Renewal Chain**:
A linked sequence of Compliance Documents where each new document archives the previous one via the `renewedFrom` FK. The chain preserves the history of renewals for a given obligation or entity.
_Avoid_: Renewal History, Version Chain

**Reminder Engine**:
A service that scans documents for upcoming expirations and due dates, transitions expired/overdue statuses, escalates past escalation thresholds, and generates weekly summaries. Registers scheduled cron jobs for daily and weekly scans.
_Avoid_: Notification Service, Alert System

**Obligation Generator**:
A service that auto-generates Compliance Documents from active Obligations based on their frequency schedule. Subscribes to a scheduled job topic and publishes `document_generated` events.
_Avoid_: Document Factory, Auto-Generator

**Event Bridge**:
A service that subscribes to external module events (e.g., `hr:employee_onboarded`, `organization:branch_created`) and auto-creates relevant Compliance Documents and Obligations based on the event type.
_Avoid_: Event Listener, Integration Hub

### Tasks Domain

**Project**:
A container for tasks with a unique `key` (e.g., `PROJ`), `name`, `status` (active/archived/paused), `leadId`, `taskCounter` for sequential task numbering, and optional `defaultTaskTypeId`. Members can be added with roles (admin/member/viewer).
_Avoid_: Board, Workspace

**Task**:
A unit of work within a Project. Has `title`, `description`, `priority` (urgent/high/medium/low/none), `statusId`, `projectId`, `reporterId`, `assignees`, `labels`, `parentId` (max 3 levels of nesting), `dueDate`, `estimatedHours`, `taskNumber` (display: `KEY-seq`). Supports archiving and soft-delete.
_Avoid_: Issue, Ticket, Item

**Task Status**:
A workflow state with `name`, `category` (backlog/unstarted/started/completed/cancelled), `color`, `sortOrder`, `isDefault`, `isResolved`. Can be project-scoped or global. Status transitions can be constrained via `TaskStatusTransition` rules.
_Avoid_: Column, Stage

**Task Link**:
A typed relationship between two tasks: `blocks`, `blocked_by`, `related_to`, `duplicates`, `caused_by`, `split_from`. Creating a link automatically creates its inverse. Cycle detection prevents circular dependencies.
_Avoid_: Task Relation, Dependency

**Saved View**:
A reusable filter/sort/group configuration with `name`, `type` (list/board/calendar/timeline), `filters` (jsonb), `sort` (jsonb), `groupBy`, `isShared`, `isDefault`. Owned by a user, optionally scoped to a project.
_Avoid_: Filter, Dashboard

**Automation Rule**:
A trigger-action rule with `trigger` (status_change/assignment_change/due_date_passed/task_created/task_updated), `conditions` (jsonb), `actions` (jsonb), `isActive`. Evaluated by the `AutomationWorkflow` when triggers fire.
_Avoid_: Workflow Rule, Trigger

**Time Entry**:
A logged time record on a task with `duration` (minutes), `date`, `description`, `billable` flag, `userId`, `taskId`.
_Avoid_: Timesheet, Time Log

**Task Reminder**:
A time-bound follow-up on a task with `type` (due_date/custom/overdue), `remindAt`, `isRecurring`, `interval` (daily/weekly/monthly/every_2_hours), `isSent`, `userId`.
_Avoid_: Alert, Notification

**Watcher**:
A user subscribed to updates on a task. Watchers receive notifications when the task is updated, commented on, or status-changed.
_Avoid_: Subscriber, Follower

**Activity Log**:
An append-only record of task actions: `task_created`, `task_updated`, `status_changed`, `assignee_added`, `assignee_removed`. Has `oldValue`, `newValue` (jsonb), `userId`, `taskId`.
_Avoid_: Audit Trail, Change History

### Drive Domain

**Drive Folder**:
A container for files and sub-folders with `name`, `path` (unique, hierarchical), `ownerId`, `parentId` (self-referential), `color`, `description`, `isTrashed`. Supports nesting up to a configurable max depth (default 20).
_Avoid_: Directory, Container

**Drive File**:
A tracked file with `name`, `path` (unique), `storageKey` (S3 object key), `contentType`, `size`, `etag`, `version` (integer), `ownerId`, `folderId`, `isTrashed`. Supports versioning and soft-delete (trash).
_Avoid_: Document, Asset

**File Version**:
A historical version of a Drive File with `version` number, `storageKey`, `contentType`, `size`, `etag`, `uploadedBy`. Old versions are pruned based on `maxVersions` config.
_Avoid_: Revision, Snapshot

**Label**:
A color-coded tag with `name`, `color`, `isGlobal`, `ownerId`. Applied to files and folders via `DriveItemLabel` (polymorphic on `itemId`/`itemType`).
_Avoid_: Tag, Category

**Share**:
A permission grant on a file or folder to a grantee (user or group) with `permission` (viewer/editor/owner), `granteeId`, `granteeType`, `sharedBy`, `expiresAt`. Permissions are inherited up the folder chain.
_Avoid_: Permission, Access Grant

**Public Link**:
A shareable URL with a unique `token`, `permission` (view/edit), `password` (bcrypt-hashed), `maxViews`, `expiresAt`, `isActive`, `viewCount`. Access is logged.
_Avoid_: Share Link, External URL

**Access Log**:
An append-only record of drive item access: `itemId`, `itemType`, `accessedBy`, `action`, `ip`, `userAgent`, `publicLinkId`.
_Avoid_: Audit Log, Access Record

**Trash**:
A soft-delete state for files and folders. Trashed items retain their data but are excluded from normal listings. A scheduled cron (`0 3 * * *`) purges items older than `trashRetentionDays` (default 30).
_Avoid_: Recycle Bin, Deleted Items

**Storage Bridge**:
A service that wraps the platform's `StorageUnit` to compute storage keys, upload/download objects, and manage signed URLs for drive files.
_Avoid_: File Adapter, Storage Handler

**Path Service**:
A service that manages hierarchical folder/file paths, computes paths for new items, resolves paths, generates breadcrumbs, detects cycles, and cascades path updates on move/rename.
_Avoid_: Path Resolver, Route Service

### HR Domain

**Employee**:
A person record with `employeeId`, `firstName`, `lastName`, `email`, `phone`, `dateOfBirth`, `dateOfJoining`, `dateOfLeaving`, `department`, `designation`, `grade`, `employmentType`, `branch`, `reportsTo`, `status`. Supports health insurance, skill maps, and employee groups.
_Avoid_: Staff, Worker, Personnel

**Attendance**:
A daily attendance record with `date`, `employeeId`, `status`, `checkInTime`, `checkOutTime`, `workingHours`, `lateEntry`/`earlyExit` minutes, `isHalfDay`, `shift`. Supports attendance requests (correction workflow).
_Avoid_: Timesheet, Presence Record

**Employee Check-in**:
A geolocation-tagged check-in/out event with `time`, `logType`, `latitude`, `longitude`, `deviceId`, `isOffShift`.
_Avoid_: Punch, Clock Event

**Leave**:
The leave management sub-domain covering leave types, periods, policies, allocations, applications, compensatory leave, encashment, block lists, adjustments, and ledger entries. Leave applications follow an approval workflow (pending → approved/rejected → cancelled).
_Avoid_: PTO, Time Off

**Lifecycle**:
The employee lifecycle sub-domain covering onboarding (tasks, completion tracking), promotions (with salary revision), transfers (between departments/branches/companies), and separation (exit interviews, full & final settlement).
_Avoid_: Employee Journey, HR Lifecycle

**Overtime**:
An overtime tracking sub-domain with configurable overtime types (rates, multipliers for holidays/weekends) and overtime slips following an approval workflow.
_Avoid_: Extra Hours, Overtime Log

**Shift**:
The shift management sub-domain covering shift types (start/end times, grace periods, auto-attendance), shift locations (geofencing), shift assignments, shift requests (approval workflow), and shift schedules (weekly day-of-week assignments).
_Avoid_: Roster, Schedule

**HR Access**:
Role-based access control within the HR module, with permissions, roles, and branch-wise access controls for HR users.
_Avoid_: HR Permissions, HR Auth

**Department**:
An organizational unit with `name`, `code`, `manager`, `parentDepartment` (hierarchical), `isActive`.
_Avoid_: Team, Unit

**Designation**:
A job title with `name`, `description`, `isActive`.
_Avoid_: Title, Position

**Employment Type**:
A classification of employment (e.g., full-time, part-time, contract) with `name`, `description`, `isActive`.
_Avoid_: Contract Type, Employment Status

### Management Plane Domain

**Tenancy Mode**:
A class-time choice — the developer selects one of three platform classes at application startup: `SingleTenantPlatform` (one database, no isolation, `run(fn)` — currently EXPERIMENTAL), `SharedTenantPlatform` (one shared database, Postgres RLS policies enforce isolation, `run(tenantId, fn)`), or `IsolatedTenantPlatform` (control-plane DB + per-tenant DBs, physical isolation, `run(tenantId, fn)`). Once a class is chosen, the mode cannot be changed. The same module code works in all three modes. The config type (`SingleTenantConfig`, `SharedTenantConfig`, `IsolatedTenantConfig`) does not include a `tenancy` field — the class IS the mode.
_Avoid_: Tenancy Strategy, Isolation Mode, Deployment Mode

**Tenant ID**:
A string identifier for the tenant context of a request. In `single` mode, always `"default"`. In `shared` and `isolated` modes, resolved from the authenticated session (e.g., better-auth's `session.activeOrganizationId`) and passed to `platform.run(tenantId, fn)`. Stored in `AsyncLocalStorage` context. Used by the stable DB wrapper to route queries, by `PubSubUnit` to route messages, and by `StorageUnit`/`KvStoreUnit` to prefix keys.
_Avoid_: Org ID, Workspace ID, Customer ID

**Tenant Resolver**:
A function pair provided by the app in `isolated` mode: `resolve(tenantId)` returns the per-tenant database name, `list()` returns all tenant IDs. Used by `DatabaseUnit` to lazily create per-tenant connection pools and by `prepareInfra()` to call `$prepareTenant()` for each tenant at startup. Note: `IsolatedTenantConfig` currently has the `resolver` field commented out — a dummy resolver (`list: async () => [""]`, `resolve: async (id) => id`) is used inline. This is a known WIP gap.
_Avoid_: Tenant Registry, Connection Provider

**Control Plane**:
The management/administration database connection. In `single` and `shared` modes, this IS the app database. In `isolated` mode, this is the shared control-plane database holding auth tables and platform-level tables. `DatabaseUnit` always holds a control-plane pool. `AuthUnit` always uses `controlPlaneDb`. Auth tables are exempt from `tenant_id` columns and RLS policies.
_Avoid_: Management DB, Admin DB

**Tenant Database**:
A per-tenant Postgres database in `isolated` mode. Holds that tenant's data-plane data (all module tables). No auth tables live here. `DatabaseUnit` lazily creates a pool per tenant database. Isolation is physical — a tenant cannot reach another tenant's database.
_Avoid_: Tenant Schema, Data Plane DB

**Stable DB Wrapper**:
A JavaScript `Proxy` returned by `DatabaseUnit.db` (a getter). Created once at init time and stored by workflows as `this.db`. When any property is accessed (e.g., `this.db.select()`), the wrapper reads the per-request drizzle instance from `AsyncLocalStorage` and delegates to it. In `single` mode, falls back to the control-plane drizzle instance if no context is set. Transparent to workflows — no workflow code changes.
_Avoid_: DB Proxy, Drizzle Router, Connection Resolver

**Prepare Tenant**:
An optional lifecycle method on the `Module` interface: `$prepareTenant(tenantId)`. Called at startup for each existing tenant (in `isolated` mode) during `prepareInfra()` and during tenant provisioning. Modules register per-tenant cron schedules and subscriptions here. The platform sets up `AsyncLocalStorage` context with the `tenantId` before calling each module's `$prepareTenant()`. Not called in `single` or `shared` modes.
_Avoid_: Per-Tenant Init, Tenant Setup

**Tenant**:
A SaaS customer account at the platform layer. Implemented as a better-auth **Organization** (via better-auth's Organization plugin) — the Tenant IS the better-auth `organization` row in the control-plane DB, with a companion `tenant` table for extra domain fields (status, plan, SP assignment, database connection params). Carries `name`, `slug`, `logo` (on the better-auth org row) plus account-level fields (signup date, lifecycle status, plan, SP assignment). Does NOT hold rich profile fields (accentColor, website, industry, taxId, etc.) — those live on the aspen-os Organization companion. The "List of Organizations" UI in the SOW is a projection over Tenants.
_Avoid_: Organization (when meaning the SaaS customer — collides with the aspen-os Organization module entity), Customer Account, Subscription, Workspace

**Tenant Status**:
The lifecycle state of a Tenant: `onboarding` (pre-go-live, SP doing physical-world work) → `active` (live) → `suspended` (voluntarily or involuntarily paused) → `churned` (offboarded). Coarse by design — `onboarding` is an opaque single stage; internal install/training/handoff sub-steps are NOT tracked by the platform. Distinct from any better-auth org status and from the aspen-os Organization module's `status` (active/suspended/archived) — that one is the rich-profile companion's operational state.
_Avoid_: Tenant State, Account State, Lifecycle Stage

**Organization (aspen-os module)**:
The rich-profile companion entity in the aspen-os `organization` module. 1:1 with a Tenant (shares the better-auth org ID). Lives in the per-tenant database. Holds all company-profile fields: `name`, `slug`, `logo`, `accentColor`, `website`, `industry`, `phone`, `email`, `address`, `taxId`, `registrationNumber`, `foundedDate`, `timezone`, `locale`, `metadata`, `status`. Branches, Connections, Addresses, BankAccounts hang off this entity. Renamed conceptually to "Organization Profile" in the Management Plane context to avoid collision with the better-auth Organization/Tenant. Note: `name`/`slug`/`logo` are duplicated between the better-auth org row (control-plane) and this table (per-tenant) — the provisioning workflow seeds both.
_Avoid_: Tenant (different concept), Company, better-auth Organization

**Service Provider**:
A first-class platform entity — an implementation/integration partner that does physical-world onboarding work for a Tenant (site setup, install, training). Each Tenant has at most one active Service Provider at a time (1:1 active assignment); an SP may serve many Tenants. The SP's staged work happens during the Tenant's `onboarding` stage. Lives in its own table in the control-plane DB; not a Tenant subtype, not a reuse of the aspen-os `organization` module's `Connection`.
_Avoid_: Integrator, Vendor, Partner, Connection, Reseller

**Platform Admin**:
A user with `user.role = 'platform_admin'` and zero `member` rows. Operates the management portal — CRUD over Tenants, Service Providers, platform users, and reports. Works ONLY against the control-plane DB; never touches tenant data-plane data directly. If a platform admin needs to inspect a tenant's data, they use better-auth's admin-impersonation (`signInAsUser`) to act as a tenant admin. Has cross-tenant visibility on control-plane entities.
_Avoid_: Super Admin, Root, Operator

**Service Provider User**:
A user with `user.role = 'sp_user'` and an `sp_id` FK on the `user` row pointing to their Service Provider. Zero tenant `member` rows. Field staff working for an SP — can view assigned Tenants, update onboarding status, upload install/training artifacts. Scope is the SP they belong to, not a tenant.
_Avoid_: Integrator User, Field Agent

**Audit Log**:
An append-only record of management-plane actions. Has `entityType` (tenant/serviceProvider/platformUser), `entityId`, `action` (one of 17 defined audit actions), `actorId`, `performedAt`, `previousState`, `newState`, `changes`, `metadata`. Lives in the `audit_log` table in the control-plane DB. Written by the `logAuditStep` workflow step shared across all management-plane workflows.
_Avoid_: Audit Trail, Change Record

**Platform User**:
A user managed by the Management Plane module — distinct from tenant end-users. Platform users include platform admins and service provider users. Created/updated/deleted via the `users` workflow, which delegates to `AuthUnit.user` for better-auth operations and also manages the `spId` FK on the `user` table for SP users.
_Avoid_: Admin User, Management User

**Report**:
A read-only view produced by the Management Plane over the control-plane DB. Four categories: (1) tenant usage metrics (users, modules, storage, API calls per tenant), (2) provisioning & lifecycle reports (tenants by lifecycle stage, assigned SP, time-in-onboarding, churn reasons), (3) audit & activity reports (who created/suspended/churned a tenant, SP assignments, role changes, platform admin actions), (4) SP performance reports (tenants per SP, avg onboarding duration, completion rates). All reports are control-plane queries; they never cross into per-tenant DBs.
_Avoid_: Dashboard, Analytics, Metric

**Provisioning**:
The workflow that creates a new Tenant end-to-end, run by the Management Plane module as a `WorkflowStep` named `provision-tenant`. Steps: (1) create the better-auth Organization (the Tenant) via `auth.api.createOrganization()`, (2) resolve DB config from provisioning input + defaults, (3) issue `CREATE DATABASE` against the Postgres server via an admin connection, (4) run `pushSchema()` against the new tenant DB with all module schemas, (5) seed the aspen-os Organization profile row (1:1 with the better-auth org ID, with name/slug/logo), (6) record connection params + status in the control-plane `tenant` table, (7) assign a Service Provider if provided (set FK), (8) publish `tenant:provisioned` event. Sets Tenant status to `onboarding`. Exposed via `f.managementPlane.tenants.onboard()`. Note: `ManagementPlaneConfig` is currently `undefined` — the provisioning step expects a richer config (`tenantDbNamingScheme`, `defaultTenantDbHost`, `postgresAdminConnection`, `moduleSchemas`) but the type hasn't been defined yet. This is a known WIP gap.
_Avoid_: Onboarding (that's the Tenant Status stage AFTER provisioning), Setup, Initialization

## Context Relationships

```
┌──────────────────┐    ┌─────────────────────────────────────────────┐
│    Recruiter     │───→│            Server Platform Classes            │
│    (app)         │    │  SingleTenantPlatform (EXPERIMENTAL, run(fn)) │
│                  │    │  SharedTenantPlatform (RLS, run(tenantId,fn)) │
│  uses            │    │  IsolatedTenantPlatform (DB/tenant, run(...)) │
│  SingleTenant    │    │  7 core units: db, auth, logs, pubsub,       │
│  Platform        │    │  rpc, storage, kvStore                       │
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
      │            StorageUnit  KvStoreUnit     RpcUnit
      │                  │          │              │
      │                  ▼          │              ▼
      │               S3 SDK       │           oRPC
      │                             │
      │                         Postgres
      │                        (UNLOGGED)
      │
      │  registers modules via SingleTenantPlatform.create(config, { organization })
      │
      ├──────────────┬─────────────────────┬──────────────────────┬──────────────────────┬─────────────────┐
      ▼              ▼                     ▼                      ▼                      ▼                 ▼
┌──────────┐ ┌──────────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
│Organizat.│ │   Compliance     │ │    Tasks     │ │    Drive     │ │     HR       │ │ Management Plane │
│  Module  │ │    Module        │ │   Module     │ │   Module     │ │   Module     │ │     Module       │
│          │ │                  │ │              │ │              │ │ (scaffold)   │ │                  │
│5 workflows│ │ 5 workflows     │ │ 11 workflows│ │ 6 workflows  │ │ 8 workflows  │ │ 4 workflows      │
│7 tables  │ │ 5 services       │ │ 4 services   │ │ 5 services   │ │ 0 services   │ │ 3 tables         │
│11 events │ │ 4 tables         │ │ 17 tables    │ │ 8 tables     │ │ 44 tables    │ │ 16 events        │
│          │ │ 23 events        │ │ 10 events    │ │ 14 events    │ │ 0 events     │ │ deps: organization│
│units:    │ │                  │ │              │ │              │ │              │ │                  │
│db, pubsub│ │ units:           │ │ units:       │ │ units:       │ │ units:       │ │ units:           │
│          │ │ db, kvStore,     │ │ db, pubsub  │ │ db, storage, │ │ db, pubsub  │ │ db, auth, pubsub │
│          │ │ pubsub           │ │              │ │ pubsub       │ │              │ │                  │
│          │ │                  │ │              │ │              │ │              │ │                  │
│          │ │ prepareInfra():  │ │              │ │ prepareInfra│ │ prepareInfra │ │ prepareInfra():  │
│          │ │ schema push,     │ │              │ │ trash purge  │ │ schema push  │ │ schema push,     │
│          │ │ crons, handlers  │ │              │ │ cron (3 AM)  │ │              │ │ audit step       │
└──────────┘ └──────────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────────┘

Stubs (package.json only — no source): accounting, crm, fleet, inventory, reports, pharmacy
```

## Known Gaps

1. **`RoleUnassignedEvent` missing `roleName`** — unlike `RoleAssignedEvent` which has `{ roleName, userId }`, the unassigned event only has `{ userId }`.
2. **Session expiry hardcoded at 7 days** — `AuthConfig.session.expiresIn` is accepted but not read by the session workflow. The 7-day value is hardcoded in `session.ts`.
3. **PubSub `boss.start()` not awaited** — the constructor calls `this.boss.start()` without `await`, which could cause race conditions if `publish`/`subscribe` are called before the connection is established.
4. **Client LogUnit `$prepareInfra()` and `$cleanup()` throw** — the client LogUnit is a stub that throws on lifecycle methods.
5. **`client/context.ts` is empty** — the client framework has no `run()` method or `AsyncLocalStorage`.
6. **`increment()`/`decrement()` on KvStoreUnit are not atomic** — read-modify-write, not database-level atomic ops.
7. **No DB-level foreign key constraints in compliance, tasks, or drive modules** — all cross-table references are logical (soft FKs by naming convention), not enforced by the database.
8. **HR module has no services** — all business logic lives in workflow classes. Cross-cutting concerns (e.g., notification, audit) are not yet extracted into services. Module class is non-conformant (no `$name`, no `static create()`, workflows not wired).
9. **Compliance services `audit-writer` and `status-derivation` exist as files but are not instantiated** in the module class — only `event-bridge`, `obligation-generator`, and `reminder-engine` are wired.
10. **Tasks services `dependency-graph` and `filter-engine` exist as files but are not instantiated** in the module class — only `notification-bridge` and `report-service` are wired.
11. **`SingleTenantPlatform` is EXPERIMENTAL** — constructor emits `console.warn("Single Tenant Architecture is currently EXPERIMENTAL")`.
12. **`IsolatedTenantConfig` resolver is commented out** — a dummy resolver (`list: async () => [""]`, `resolve: async (id) => id`) is used inline instead of accepting a real `TenantResolver`.
13. **`ManagementPlaneConfig` is `undefined`** — the provisioning workflow expects a richer config (`tenantDbNamingScheme`, `defaultTenantDbHost`, `postgresAdminConnection`, `moduleSchemas`) but the type hasn't been defined yet.
14. **`hello` type export in server index** — `packages/framework/src/server/index.ts` exports `type hello = "world"` — a leftover that should be removed.

## Anti-Patterns

- Don't register modules after `create()` — pass them to `Platform.create()` as the second arg
- Don't use native UUID columns — always text with `gen_random_uuid()::text` or app-generated UUIDs
- Don't use `timestamp without time zone` — always `withTimezone: true`
- Don't create barrel files unless explicitly told
- Don't import bare `@aspen-os/platform` — use `/server` or `/client` subpath explicitly
