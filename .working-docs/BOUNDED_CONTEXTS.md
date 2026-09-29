# Bounded Contexts & Context Map

**Overview** of system bounded contexts. Each context split into own file (one per package) under `bounded-contexts/`. Context map, cross-cutting integration patterns, + context-map table live here.

## Per-Context Files

| Package                   | File                                                                   |
| ------------------------- | ---------------------------------------------------------------------- |
| `@aspen-os/platform`      | [`bounded-contexts/platform.md`](bounded-contexts/platform.md)         |
| `@aspen-os/constants`     | [`bounded-contexts/constants.md`](bounded-contexts/constants.md)       |
| `@aspen-os/masters`       | [`bounded-contexts/masters.md`](bounded-contexts/masters.md)           |
| `@aspen-os/notes`         | [`bounded-contexts/notes.md`](bounded-contexts/notes.md)               |
| `@aspen-os/compliance`    | [`bounded-contexts/compliance.md`](bounded-contexts/compliance.md)     |
| `@aspen-os/tasks`         | [`bounded-contexts/tasks.md`](bounded-contexts/tasks.md)               |
| `@aspen-os/calendar`      | [`bounded-contexts/calendar.md`](bounded-contexts/calendar.md)         |
| `@aspen-os/comms`         | [`bounded-contexts/comms.md`](bounded-contexts/comms.md)               |
| `@aspen-os/dms`           | [`bounded-contexts/dms.md`](bounded-contexts/dms.md)                   |
| `@aspen-os/hr-core`       | [`bounded-contexts/hr.md`](bounded-contexts/hr.md)                     |
| `@aspen-os/hr-attendance` | [`bounded-contexts/hr.md`](bounded-contexts/hr.md)                     |
| `@aspen-os/hr-leave`      | [`bounded-contexts/hr.md`](bounded-contexts/hr.md)                     |
| `@aspen-os/announcement`  | [`bounded-contexts/announcement.md`](bounded-contexts/announcement.md) |
| `@aspen-os/management`    | [`bounded-contexts/management.md`](bounded-contexts/management.md)     |
| `@aspen-os/workspace`     | [`bounded-contexts/workspace.md`](bounded-contexts/workspace.md)       |
| `@aspen-os/healthcare`    | [`bounded-contexts/healthcare.md`](bounded-contexts/healthcare.md)     |
| `@aspen-os/diagnostics`   | [`bounded-contexts/diagnostics.md`](bounded-contexts/diagnostics.md)   |
| `@aspen-os/emr`           | [`bounded-contexts/emr.md`](bounded-contexts/emr.md)                   |
| `@aspen-os/inpatient`     | [`bounded-contexts/inpatient.md`](bounded-contexts/inpatient.md)       |
| `@aspen-os/pharmacy`      | [`bounded-contexts/pharmacy.md`](bounded-contexts/pharmacy.md)         |
| `@aspen-os/accounting`    | [`bounded-contexts/accounting.md`](bounded-contexts/accounting.md)     |
| `@aspen-os/products`      | [`bounded-contexts/products.md`](bounded-contexts/products.md)         |
| `@aspen-os/inventory`     | [`bounded-contexts/inventory.md`](bounded-contexts/inventory.md)       |
| Stubs                     | [`bounded-contexts/stubs.md`](bounded-contexts/stubs.md)               |

Domain detail per context in [`domain-model/`](domain-model/) (also split per package).

## Context Map Overview

```
                    ┌─────────────────────────────────┐
                    │      SHARED KERNEL               │
                    │  Unit & Module interfaces        │
                    │  (server/index.ts, client/)      │
                    └──────────────┬──────────────────┘
                                   │
           ┌───────────────────────┼───────────────────────┐
           │                       │                       │
           ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  CONFORMIST     │    │  CONFORMIST     │    │  CONFORMIST     │
│  Auth Unit      │    │  Logs Unit      │    │  PubSub Unit    │
│  conforms to    │    │  conforms to    │    │  conforms to    │
│  better-auth    │    │  pino patterns  │    │  pg-boss API    │
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
│  S3-compatible  │    │  oRPC router    │    │  Redis-like API │
│  interface      │    │  conventions    │    │  over Postgres  │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  S3 (external)  │    │  HTTP clients   │    │  Postgres       │
│  AWS SDK        │    │                 │    │  (kv_store)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  CORE: AUDIT UNIT                                                │
│  Native platform unit — audit_log table, DB-record replayability │
│  Not a conformist — no external dependency                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     DOMAIN MODULES                               │
│                                                                  │
│  ┌───────────────┐  ┌───────────────────┐  ┌───────────────┐   │
│  │ Recruiter App │  │ Organization      │  │ Compliance    │   │
│  │ (not in repo) │  │ Module            │  │ Module        │   │
│  │ uses          │  │ 1 wf group        │  │ 5 wf groups   │   │
│  │ Tenant │  │ 1 table           │  │ 3 services    │   │
│  │ Platform      │  │ 2 events          │  │ 3 tables      │   │
│  │ .create()     │  │ deps: none        │  │ 23 events     │   │
│  └───────────────┘  │ units: none       │  │ units: db,     │   │
│                     └───────────────────┘  │ kvStore, pubsub│   │
│  ┌───────────────────┐                     └───────────────┘   │
│  │ Masters Module    │  ┌───────────────┐  ┌───────────────┐   │
│  │ 9 wf groups       │  │ Tasks         │  │ DMS Module    │   │
│  │ 12 tables         │  │ Module        │  │ 16 wf groups  │   │
│  │ 32 events         │  │ 9 wf groups   │  │ 12 tables     │   │
│  │ 9 ACL res.        │  │ 14 tables     │  │ 27 events     │   │
│  │ units: kvStore    │  │ 11 events     │  │ 9 ACL res.    │   │
│  │ (connections)     │  │ units: none   │  │ units:        │   │
│  └───────────────────┘  │               │  │ db, pubsub,   │   │
│                         └───────────────┘  │ storage       │   │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │
│  │ Notes Module  │  │ Calendar      │  │ Workspace         │   │
│  │ 1 wf group    │  │ Module        │  │ Module            │   │
│  │ 1 table       │  │ 3 wf groups   │  │ 8 wf groups       │   │
│  │ 3 events      │  │ 3 tables      │  │ 8 tables          │   │
│  │ 1 ACL res.    │  │ 11 events     │  │ 30 events         │   │
│  │ units: none   │  │ 3 ACL res.    │  │ 9 ACL res.        │   │
│  └───────────────┘  │ units:        │  │ units:            │   │
│                     │ db, pubsub    │  │ db, pubsub        │   │
│                     └───────────────┘  └───────────────────┘   │
│  ┌───────────────────────────┐  ┌───────────────────────────┐   │
│  │ Management Plane          │  │ Comms Module              │   │
│  │ Module                    │  │ 8 workflow groups         │   │
│  │ 5 workflow groups         │  │ 2 control-plane + 6       │   │
│  │ 3 owned + 2 shadow tables │  │ tenant tables (8 total)   │   │
│  │ 21 events                 │  │ 21 events, 7 ACL res.     │   │
│  │ deps: none                │  │ deps: none                │   │
│  │ units: db, storage        │  │ units: db, kvStore,       │   │
│  └───────────────────────────┘  │ pubsub, auth              │   │
│                                 └───────────────────────────┘   │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │ Healthcare kernel: 11 groups, 137 tables (+13 pgEnums),   │   │
│  │ 26 events, 10 ACL, deps: masters + 4 satellite shims      │   │
│  └───────────────────────────────────────────────────────────┘   │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │ Accounting: 21 groups, 37 tables (+17 pgEnums), 42 events, │   │
│  │ 18 ACL, deps: masters, $consumes 4 (introspection-only)    │   │
│  │ Products: 16 groups, 19 tables (+8 pgEnums), 29 events,    │   │
│  │ 13 ACL, deps: none, stateless                             │   │
│  │ Inventory: 12 groups, 15 tables (+10 pgEnums), 21 events,  │   │
│  │ 11 ACL, deps: masters+products, 1 cron (reorder-scan)      │   │
│  └───────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     STUB MODULES                                 │
│  crm, fleet, reports                                             │
│  (package.json only — no source; accounting/products/inventory   │
│   graduated to full modules)                                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT FRAMEWORK                             │
│  Exported as ./client subpath                                    │
│  3 units: auth, logs (stub), rpc (stub)                          │
│  Uses: better-auth React client, no database dependency          │
└─────────────────────────────────────────────────────────────────┘
```

> Workflow counts above = **workflow groups** (readonly properties on module instance), not files. Modules follow one-file-per-action layout (`workflows/<entity>/<verb>.ts`), so per-action file counts much higher (e.g. HR three packages ~10 groups + announcement 1 group).

## Integration Patterns

### Platform.create() (Static Factory)

All units created + wired inside `Platform.create()`:

```typescript
import { TenantPlatform } from "@aspen-os/platform/server";

const p = TenantPlatform.create(
  { auth, db, kvStore, logs, pubsub, rpc, storage }, // TenantConfig
  [organization, tasks], // modules array
);
```

This:

1. Instantiates all 8 units in dependency order
2. Wires pubsub↔auth (`setAuth`)
3. Validates module `$dependencies`
4. Calls `mod.$initialize(units)` on each module
5. Returns proxy-wrapped platform instance allowing `p.masters` syntax

### AsyncLocalStorage Context

`run()` provides request-scoped context. Uniform signature on both server classes — `run(tenantId, fn)` (`"$global"` = control plane):

```typescript
await p.run(tenantId, async () => {
  const { audit, auth, db, pubsub, tenantId } = getContext();
});
```

### Event-Driven (Active)

Domain events published via PubSub as plain string topics. Event counts by module (type-level `*EventMap` contracts, not runtime type-safe bus):

- Auth: 8 events
- Organization: 2 events
- Masters: 32 events
- Notes: 3 events
- Compliance: 23 events
- Tasks: 11 events (incl. `task.due_date_changed`)
- Calendar: 11 events (4 event + 3 attendee + 4 reminder, incl. `calendar.reminder_due`)
- Workspace: 30 events (13 draft + 6 dashboard + 4 widget + 4 filter_view + 2 pin + 1 schedule)
- DMS: 27 events (13 file + 6 folder + 3 class + 2 share + 3 public_link + 3 file_view)
- Comms: 21 events (6 channel + 2 provider + 3 notification + 4 message + 1 preference + 4 template + 1 setting)
- Management Plane: 21 events (8 tenant + 4 service_provider + 5 platform_user + 1 organization + 3 tenant_member)
- Healthcare kernel: 26 events (patient 3, practitioner 2, facility 2, service 3, appointment 2, encounter 3, billing 3, records 4, operations 2, branch 2)
- Diagnostics: 3 events; EMR: 10 events (2 each × 5 specialties); Inpatient: 5 events (nursing 3 + resident 2); Pharmacy: 3 events
- HR: 41 events (hr-core 22 across employee 4, transition 6, setup 4, access 8; hr-attendance 12 across attendance 5, overtime 3, shift 4; hr-leave 7 across leave)
- Announcement: 6 events (single `AnnouncementEventMap`)
- Accounting: 42 events (fiscal 2, quotation 3, sales-order 4, delivery 2, sales-invoice 4 + credit-note 1, material-request 1, RFQ 1, supplier-quotation 2, purchase-order 4, receipt 2, purchase-invoice 4 + debit-note 1, payment 3, bank 1, asset 4, journal 3)
- Products: 29 events (item 5, group 4, brand 2, variant 4, reorder-rule 4, barcode 2, price-list 4, item-price 4)
- Inventory: 21 events (warehouse 3, stock 1, stock-entry 2, reconciliation 1, reorder 1, reservation 3, pick-list 3, putaway 1, serial 2, batch 4)

Per-context event tables in `domain-model/<package>.md`.

### Cross-Context Event Subscriptions

Compliance module's `EventBridge` service actively subscribes to other modules' events to auto-create compliance documents + obligations. Primary cross-context integration mechanism:

| Subscribed Topic                                | Source Module | Action                                                                                                                    |
| ----------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `hr.employee_onboarded`                         | HR            | Creates background check + ID verification documents                                                                      |
| `hr.employee_separated`                         | HR            | Creates exit documents + final settlement documents                                                                       |
| `fleet.vehicle_registered`                      | Fleet (stub)  | Creates pollution certificate + semi-annual obligation                                                                    |
| `masters.org_branch_created`                    | Masters       | Creates trade license + fire safety certificate + annual obligation                                                       |
| `accounting.financial_year_started`             | Accounting    | Creates monthly GST return obligation                                                                                     |
| `inventory.stock_changed`                       | Inventory     | Accounting introspection-only `$consumes` (no subscription); GL posting trigger in docs                                   |
| `healthcare.operations_created`                 | Healthcare    | Creates relevant compliance documents + obligations                                                                       |
| `masters.contact_created`                       | Masters       | Creates insurance policy document (if contact type is insurer and entity is organization-scoped; global contacts ignored) |
| `task.due_date_changed`                         | Tasks         | Calendar task bridge — materializes/cancels the task due-date reminder bundle                                             |
| `task.deleted`                                  | Tasks         | Calendar task bridge — deletes all task reminders for the task                                                            |
| `task.status_changed`                           | Tasks         | Calendar task bridge — suppresses pending task reminders on completion/cancellation                                       |
| `inpatient.nursing_created`                     | Inpatient     | Tasks healthcare bridge — creates tasks idempotently                                                                      |
| `healthcare.encounter_updated`                  | Healthcare    | Tasks healthcare bridge — creates tasks idempotently                                                                      |
| `healthcare.records_created`                    | Healthcare    | Comms healthcare bridge — out-of-band notification                                                                        |
| `inpatient.resident_updated`                    | Inpatient     | Comms healthcare bridge — out-of-band notification                                                                        |
| `compliance.document_expiring` / `document_due` | Compliance    | Comms event bridge — in-app + out-of-band notification to the document's assigned user                                    |
| `calendar.reminder_due`                         | Calendar      | Comms event bridge — notify the reminder's `userId`                                                                       |
| `dms.file_expired`                              | DMS           | Comms event bridge — notify the file `ownerId`                                                                            |
| `announcement.published`                        | Announcement  | Comms event bridge — per-recipient inbox fan-out                                                                          |
| `tenant.provisioned` / `tenant.activated`       | Management    | Comms event bridge — warm host default channels per tenant                                                                |
| `auth.email_otp_requested`                      | Platform auth | Comms event bridge — inline OTP email via the host default email provider                                                 |

### Schema Management

Modules declare DB schemas via `$prepareInfra()` (returns `{ db: { control_plane_schemas, tenant_schemas } }`). Platform collects all module schemas, applies centrally via `DatabaseUnit.prepareWithModules()`:

```
Platform.prepareInfra()
    → unit.$prepareInfra()                    // core infra (db pool, etc.; pubsub boss is lazy)
    → mod.$prepareInfra() for each module     // collect { db, auth, events } declarations
    → DatabaseUnit.prepareWithModules(schemas) // pushSchema(coreSchemas + moduleSchemas, db)
    → AuthUnit.applyModuleAcl(acl)            // store merged ACL metadata
    → mod.$prepareRuntime() for each module   // register pubsub schedules/handlers
    → $prepareTenant(tenantId) per tenant
```

Schemas collected by `DatabaseUnit.prepareWithModules()`: core schemas (`auditSchema`, `authSchema`, `logSchema`, `storageSchema`, `kvStoreSchema`, `workflowSchema`) merged with module `db.control_plane_schemas` + `db.tenant_schemas` from `$prepareInfra()`. Domain module table counts per context in `domain-model/<package>.md`.

`$prepareInfra()` on **Unit** per-unit + optional. Most units do infra setup here; PubSubUnit's is no-op — single control-plane pg-boss started lazily on first use at runtime, not deploy time.

### Scheduled Jobs

Six modules register scheduled cron jobs via PubSub (compliance defines `compliance.obligation-generate` topic + `0 6 * * *` constant but never schedules — call `generatePendingDocuments` externally):

| Module    | Topic                      | Cron         | Action                                                                                |
| --------- | -------------------------- | ------------ | ------------------------------------------------------------------------------------- |
| DMS       | `dms.expiry-scan`          | `5 0 * * *`  | Promote past-due files to expired                                                     |
| DMS       | `dms.auto-purge`           | `30 3 * * *` | Purge trashed/expired files + folders past retention                                  |
| HR        | `hr.daily-attendance-sync` | `0 1 * * *`  | Sync daily attendance records                                                         |
| HR        | `hr.daily-leave-accrual`   | `0 0 * * *`  | Accrue leave balances                                                                 |
| Calendar  | `calendar.reminder-scan`   | `* * * * *`  | Process pending reminders (publish `calendar.reminder_due`, mark sent, schedule next) |
| Comms     | `comms.message-sweeper`    | `* * * * *`  | Scan `queued` messages; per-message tenant context, adapter dispatch, retries         |
| Inventory | `inventory.reorder-scan`   | `30 2 * * *` | Scan `products_reorder_rule` (non-disabled), publish `reorder_triggered` per breach   |

### Health Check

There is no `Platform.healthCheck()`. Liveness = RPC `health.check` procedure (trivial `base.handler(async () => ({ status: "ok" }))`) plus `PubSubUnit.getUnsubscribedProducedTopics()` — topics published to w/ no registered subscriber (pg-boss silently drops these, so they flag producer/consumer wiring bug):

```typescript
{
  status: "ok" | "unhealthy",
  checks: {
    db:      { status, latencyMs?, error? },
    pubsub:  { status, latencyMs?, error? },
  },
  unsubscribedTopics?: string[],  // produced but no registered consumer
  at: string,                      // ISO timestamp
}
```

- **DB probe**: `controlPlaneDb.execute(sql`SELECT 1`)` (always real control plane, not context-routed wrapper).
- **PubSub probe**: `getQueueSize("__platform_health_check")` — lazily starts boss, live SQL round-trip; safe on unregistered topics.
- **Unsubscribed topics**: `pubsub.getUnsubscribedProducedTopics()` lists topics published to w/ no registered subscriber; pg-boss silently drops these, so presence flags producer/consumer wiring bug. `publish()` warns but does not throw on no-id result.

## Context Map Table

| Context          | Type          | Upstream                                    | Downstream                                | Relationship                                                                                                                          |
| ---------------- | ------------- | ------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Shared Kernel    | Shared        | —                                           | All units/modules                         | Unit & Module interfaces                                                                                                              |
| Database         | Shared Kernel | —                                           | All units                                 | Foundation                                                                                                                            |
| Platform         | Customer      | —                                           | Units, Modules                            | Creates & wires via `create()` — three server classes + one client class                                                              |
| Auth             | Conformist    | better-auth                                 | Modules                                   | Adapts API                                                                                                                            |
| Logs             | Conformist    | pino, OTel                                  | —                                         | Adapts API                                                                                                                            |
| PubSub           | Conformist    | pg-boss                                     | —                                         | Adapts API                                                                                                                            |
| Storage          | Partner       | S3 (AWS SDK)                                | DMS module                                | Defines interface                                                                                                                     |
| RPC              | Conformist    | oRPC                                        | —                                         | Adapts API                                                                                                                            |
| KV Store         | Conformist    | Postgres                                    | Compliance, Masters modules               | Redis-like API (core)                                                                                                                 |
| Audit            | Core          | —                                           | All modules                               | Native platform unit — `audit_log` table, DB-record replayability                                                                     |
| Workflow         | Core          | —                                           | All modules                               | Durable step runner (`workflow_runs`/`workflow_steps`)                                                                                |
| Client Platform  | —             | —                                           | —                                         | Browser-side (3 units)                                                                                                                |
| Recruiter        | Downstream    | Platform                                    | —                                         | Uses `TenantPlatform`, registers organization + tasks (not yet in repo)                                                               |
| Organization     | Removed       | —                                           | —                                         | No package on disk; org surface = `masters.orgBranches` + `management.organizations` read model                                       |
| Masters          | Downstream    | Platform, KV Store                          | Compliance                                | 9 workflow groups, 12 tables, 32 events, 9 ACL resources                                                                              |
| Notes            | Downstream    | Platform                                    | —                                         | 1 workflow group, 1 table, 3 events, 1 ACL resource                                                                                   |
| Compliance       | Downstream    | Platform, HR, Masters, Fleet (stub)         | —                                         | 5 workflow groups, 3 tables, 7 pgEnums, 23 events, 3 ACL, 0 crons (obligation-generate topic unscheduled)                             |
| Tasks            | Downstream    | Platform, Masters                           | Calendar                                  | 9 workflow groups, 14 tables (5 control + 9 tenant), 11 events, empty ACL; `$consumes` inpatient/healthcare                           |
| Calendar         | Downstream    | Platform                                    | —                                         | 3 workflow groups, 3 tables, 7 pgEnums, 11 events, 3 ACL resources, 1 cron + task/compliance/healthcare bridges                       |
| Comms            | Downstream    | Platform, KV Store                          | —                                         | 8 workflow groups, 8 tables (2 control + 6 tenant), 9 pgEnums, 21 events, 7 ACL resources, 1 cron + 9 bridge subs                     |
| Workspace        | Downstream    | Platform                                    | —                                         | 8 workflow groups, 8 tables, 30 events, 9 ACL resources, per-schedule crons                                                           |
| DMS              | Downstream    | Platform, Storage                           | —                                         | 16 workflow groups, 12 tables, 27 events, 9 ACL resources, 2 crons                                                                    |
| Management Plane | Downstream    | Platform                                    | —                                         | 5 workflow groups (tenants 20 / SPs 13 / orgs 8 / members 5 / users 7), 3 owned + 2 shadow tables, 21 events, 4 ACL, units db+storage |
| HR               | Downstream    | Platform                                    | Compliance, Announcement                  | 10 workflow groups, 42 tables (all tenant), 41 events, 12 ACL resources, 2 crons                                                      |
| Announcement     | Downstream    | Platform, HR (reads `employee` + `hr_user`) | Comms (via `announcement.published`)      | 1 workflow group (14 methods), 2 tenant tables, 6 events, 1 ACL resource, stateless, no cron                                          |
| Healthcare       | Downstream    | Platform, Masters                           | Diagnostics/EMR/Inpatient/Pharmacy        | 11 workflow groups, 137 tables (all tenant), 26 events, 10 ACL resources, stateless kernel                                            |
| Diagnostics      | Downstream    | Platform, Healthcare                        | —                                         | 1 workflow group (22 actions), 0 owned / 16 table refs, 3 events, 1 ACL, stateless shim                                               |
| EMR              | Downstream    | Platform, Healthcare                        | —                                         | 5 workflow groups (63 actions), 0 owned / 56 table refs, 10 events, 5 ACL, stateless shim                                             |
| Inpatient        | Downstream    | Platform, Healthcare                        | Tasks, Comms                              | 2 workflow groups (29 actions), 0 owned / 35 table refs, 5 events, 2 ACL, stateless shim                                              |
| Pharmacy         | Downstream    | Platform, Healthcare                        | —                                         | 1 workflow group (16 actions), 0 owned / 9 table refs, 3 events, 1 ACL, stateless shim                                                |
| Accounting       | Downstream    | Platform, Masters                           | Compliance (via `financial_year_started`) | 21 workflow groups, 37 tables (all tenant) + 17 pgEnums, 42 events, 18 ACL, stateless, `$consumes` 4 introspection-only               |
| Products         | Downstream    | Platform                                    | Inventory (via `$dependencies`)           | 16 workflow groups, 19 tables (all tenant) + 8 pgEnums, 29 events, 13 ACL, stateless, no `$consumes`                                  |
| Inventory        | Downstream    | Platform, Masters, Products                 | Accounting (via `stock_changed`)          | 12 workflow groups, 15 tables (all tenant) + 10 pgEnums, 21 events, 11 ACL, 1 cron (`reorder-scan`), `$consumes` empty                |
| CRM              | Stub          | —                                           | —                                         | Package.json only                                                                                                                     |
| Fleet            | Stub          | —                                           | —                                         | Package.json only                                                                                                                     |
| Reports          | Stub          | —                                           | —                                         | Package.json only                                                                                                                     |
