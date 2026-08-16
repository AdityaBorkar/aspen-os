# Bounded Contexts & Context Map

This document is the **overview** of the system's bounded contexts. Each context has been split into its own file (one per package) under `bounded-contexts/`. The context map, cross-cutting integration patterns, and the context-map table live here.

## Per-Context Files

| Package                  | File                                                                   |
| ------------------------ | ---------------------------------------------------------------------- |
| `@aspen-os/platform`     | [`bounded-contexts/platform.md`](bounded-contexts/platform.md)         |
| `@aspen-os/constants`    | [`bounded-contexts/constants.md`](bounded-contexts/constants.md)       |
| `@aspen-os/organization` | [`bounded-contexts/organization.md`](bounded-contexts/organization.md) |
| `@aspen-os/masters`      | [`bounded-contexts/masters.md`](bounded-contexts/masters.md)           |
| `@aspen-os/notes`        | [`bounded-contexts/notes.md`](bounded-contexts/notes.md)               |
| `@aspen-os/compliance`   | [`bounded-contexts/compliance.md`](bounded-contexts/compliance.md)     |
| `@aspen-os/tasks`        | [`bounded-contexts/tasks.md`](bounded-contexts/tasks.md)               |
| `@aspen-os/dms`          | [`bounded-contexts/dms.md`](bounded-contexts/dms.md)                   |
| `@aspen-os/hr`           | [`bounded-contexts/hr.md`](bounded-contexts/hr.md)                     |
| `@aspen-os/management`   | [`bounded-contexts/management.md`](bounded-contexts/management.md)     |
| Stubs                    | [`bounded-contexts/stubs.md`](bounded-contexts/stubs.md)               |

Domain detail for each context lives in [`domain-model/`](domain-model/) (also split per package).

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
│  │ uses          │  │ 2 wf groups       │  │ 5 wf groups   │   │
│  │ SingleTenant  │  │ 2 tables          │  │ 3 services    │   │
│  │ Platform      │  │ 7 events          │  │ 3 tables      │   │
│  │ .create()     │  │ deps: masters     │  │ 23 events     │   │
│  └───────────────┘  │ units: none       │  │ units: db,     │   │
│                     └───────────────────┘  │ kvStore, pubsub│   │
│  ┌───────────────────┐                     └───────────────┘   │
│  │ Masters Module    │  ┌───────────────┐  ┌───────────────┐   │
│  │ 7 wf groups       │  │ Tasks         │  │ DMS Module    │   │
│  │ 7 tables          │  │ Module        │  │ 18 wf groups  │   │
│  │ 29 events         │  │ 11 wf groups  │  │ 14 tables     │   │
│  │ 7 ACL res.        │  │ 17 tables     │  │ 33 events     │   │
│  │ units: kvStore    │  │ 10 events     │  │ 11 ACL res.   │   │
│  │ (connections)     │  │ units: none   │  │ units:        │   │
│  └───────────────────┘  │               │  │ db, auth,     │   │
│                         └───────────────┘  │ pubsub+storage│   │
│  ┌───────────────┐                         └───────────────┘   │
│  │ Notes Module  │                                              │
│  │ 1 wf group    │                                              │
│  │ 1 table       │                                              │
│  │ 3 events      │                                              │
│  │ 1 ACL res.    │                                              │
│  │ units: none   │                                              │
│  └───────────────┘                                              │
│  ┌───────────────────────────┐                                   │
│  │ Management Plane          │                                   │
│  │ Module                    │                                   │
│  │ 3 workflow groups         │                                   │
│  │ 3 owned + 0 shadow tables │                                   │
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
│  3 units: auth, logs (stub), rpc (stub)                          │
│  Uses: better-auth React client, no database dependency          │
└─────────────────────────────────────────────────────────────────┘
```

> Workflow counts above are **workflow groups** (readonly properties on the module instance), not files. The modules follow the one-file-per-action layout (`workflows/<entity>/<verb>.ts`), so per-action file counts are much higher (e.g. HR exposes ~250 methods across 8 groups).

## Integration Patterns

### Platform.create() (Static Factory)

All units are created and wired inside `Platform.create()`:

```typescript
import { SingleTenantPlatform } from "@aspen-os/platform/server";

const p = SingleTenantPlatform.create(
  { auth, db, kvStore, logs, pubsub, rpc, storage }, // SingleTenantConfig
  [organization, tasks], // modules array
);
```

This:

1. Instantiates all 8 units in dependency order
2. Wires pubsub↔auth (`setAuth`)
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

Domain events are published via PubSub as plain string topics. Event counts by module (type-level `*EventMap` contracts, not a runtime type-safe bus):

- Auth: 8 events
- Organization: 7 events
- Masters: 29 events
- Notes: 3 events
- Compliance: 23 events
- Tasks: 10 events (incl. `task:due_date_changed`)
- Calendar: 13 events (3 calendar + 4 event + 3 attendee + 4 reminder, incl. `calendar:reminder_due`)
- DMS: 33 events (13 file + 6 folder + 3 class + 3 contact + 2 share + 3 public_link + 3 file_view)
- Management Plane: 16 events (8 tenant + 4 service_provider + 4 platform_user)
- HR: 43 events (8 event groups across employee, attendance, leave, lifecycle, overtime, setup, shift, access)

Per-context event tables live in `domain-model/<package>.md`.

### Cross-Context Event Subscriptions

The Compliance module's `EventBridge` service actively subscribes to events from other modules to auto-create compliance documents and obligations. This is the primary cross-context integration mechanism:

| Subscribed Topic                    | Source Module     | Action                                                                                    |
| ----------------------------------- | ----------------- | ----------------------------------------------------------------------------------------- |
| `hr:employee_onboarded`             | HR                | Creates background check + ID verification documents                                      |
| `hr:employee_separated`             | HR                | Creates exit documents + final settlement documents                                       |
| `fleet:vehicle_registered`          | Fleet (stub)      | Creates pollution certificate + semi-annual obligation                                    |
| `organization:branch_created`       | Organization      | Creates trade license + fire safety certificate + annual obligation                       |
| `accounting:financial_year_started` | Accounting (stub) | Creates monthly GST return obligation                                                     |
| `masters:contact_created`           | Masters           | Creates insurance policy document (if contact type is insurer and entity is organization) |
| `task:due_date_changed`             | Tasks             | Calendar task bridge — materializes/cancels the task due-date reminder bundle             |
| `task:deleted`                      | Tasks             | Calendar task bridge — deletes all task reminders for the task                            |
| `task:status_changed`               | Tasks             | Calendar task bridge — suppresses pending task reminders on completion/cancellation       |

### Schema Management

Modules declare their DB schemas via `$prepareInfra()` (returns `{ db: { control_plane_schemas, tenant_schemas } }`). The platform collects all module schemas and applies them centrally via `DatabaseUnit.prepareWithModules()`:

```
Platform.prepareInfra()
    → unit.$prepareInfra()                    // core infra (db pool, etc.; pubsub boss is lazy)
    → mod.$prepareInfra() for each module     // collect { db, auth, events } declarations
    → DatabaseUnit.prepareWithModules(schemas) // pushSchema(coreSchemas + moduleSchemas, db)
    → AuthUnit.applyModuleAcl(acl)            // store merged ACL metadata
    → mod.$prepareRuntime() for each module   // register pubsub schedules/handlers
    → [isolated only] $prepareTenant(tenantId) per tenant
    → [shared only] db.applyRlsPolicies()
```

Schemas collected by `DatabaseUnit.prepareWithModules()`: core schemas (`auditSchema`, `authSchema`, `logSchema`, `storageSchema`, `kvStoreSchema`, `workflowSchema`) merged with module `db.control_plane_schemas` and `db.tenant_schemas` from `$prepareInfra()`. Domain module table counts by context live in `domain-model/<package>.md`.

`$prepareInfra()` on a **Unit** is per-unit and optional. Most units perform their infra setup here; PubSubUnit's is a no-op because its single control-plane pg-boss is started lazily on first use at runtime, not at deploy time.

### Scheduled Jobs

Four modules register scheduled cron jobs via PubSub:

| Module     | Topic                                | Cron         | Action                                                                                |
| ---------- | ------------------------------------ | ------------ | ------------------------------------------------------------------------------------- |
| Compliance | `compliance:daily-expiry-scan`       | `0 8 * * *`  | Scan expiring documents                                                               |
| Compliance | `compliance:daily-status-transition` | `0 0 * * *`  | Transition expired/overdue statuses                                                   |
| Compliance | `compliance:daily-escalation`        | `0 9 * * *`  | Escalate past threshold                                                               |
| Compliance | `compliance:weekly-summary`          | `0 9 * * 1`  | Generate weekly summary                                                               |
| Compliance | `compliance:obligation-generate`     | `0 6 * * *`  | Generate documents from obligations                                                   |
| DMS        | `dms:expiry-scan`                    | `5 0 * * *`  | Promote past-due files to expired                                                     |
| DMS        | `dms:auto-purge`                     | `30 3 * * *` | Purge trashed/expired files + folders past retention                                  |
| HR         | `hr:daily-attendance-sync`           | `0 1 * * *`  | Sync daily attendance records                                                         |
| HR         | `hr:daily-leave-accrual`             | `0 0 * * *`  | Accrue leave balances                                                                 |
| Calendar   | `calendar:reminder-scan`             | `* * * * *`  | Process pending reminders (publish `calendar:reminder_due`, mark sent, schedule next) |

### Health Check

`BasePlatform.healthCheck()` returns a `HealthReport`:

```typescript
{
  status: "ok" | "unhealthy",
  checks: {
    db:      { status, latencyMs?, error? },
    pubsub:  { status, latencyMs?, error? },
  },
  unsubscribedTopics?: string[],  // produced but no registered consumer
  tenancyMode: TenancyMode,
  at: string,                      // ISO timestamp
}
```

- **DB probe**: `controlPlaneDb.execute(sql`SELECT 1`)` (always the real control plane, not the context-routed wrapper).
- **PubSub probe**: `getQueueSize("__platform_health_check")` — lazily starts the boss and does a live SQL round-trip; safe on unregistered topics.
- **Unsubscribed topics**: `pubsub.getUnsubscribedProducedTopics()` lists topics published to with no registered subscriber; pg-boss silently drops these, so their presence flips the report to `unhealthy` to surface the wiring bug early. Present only when non-empty.
- `checkDbHealth` / `checkPubSubHealth` are protected hooks derived classes may override.

## Context Map Table

| Context          | Type          | Upstream                                      | Downstream                   | Relationship                                                                              |
| ---------------- | ------------- | --------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------- |
| Shared Kernel    | Shared        | —                                             | All units/modules            | Unit & Module interfaces                                                                  |
| Database         | Shared Kernel | —                                             | All units                    | Foundation                                                                                |
| Platform         | Customer      | —                                             | Units, Modules               | Creates & wires via `create()` — three server classes + one client class                  |
| Auth             | Conformist    | better-auth                                   | Modules                      | Adapts API                                                                                |
| Logs             | Conformist    | pino, OTel                                    | —                            | Adapts API                                                                                |
| PubSub           | Conformist    | pg-boss                                       | —                            | Adapts API                                                                                |
| Storage          | Partner       | S3 (AWS SDK)                                  | DMS module                   | Defines interface                                                                         |
| RPC              | Conformist    | oRPC                                          | —                            | Adapts API                                                                                |
| KV Store         | Conformist    | Postgres                                      | Compliance, Masters modules  | Redis-like API (core)                                                                     |
| Audit            | Core          | —                                             | All modules                  | Native platform unit — `audit_log` table, DB-record replayability                         |
| Workflow         | Core          | —                                             | All modules                  | Durable step runner (`workflow_runs`/`workflow_steps`)                                    |
| Client Platform  | —             | —                                             | —                            | Browser-side (3 units)                                                                    |
| Recruiter        | Downstream    | Platform                                      | —                            | Uses `SingleTenantPlatform`, registers organization + tasks (not yet in repo)             |
| Organization     | Downstream    | Platform                                      | Compliance, Management Plane | 2 workflow groups, 2 tables, depends on Masters                                           |
| Masters          | Downstream    | Platform, KV Store                            | Compliance, Organization     | 7 workflow groups, 7 tables, 29 events, 7 ACL resources                                   |
| Notes            | Downstream    | Platform                                      | —                            | 1 workflow group, 1 table, 3 events, 1 ACL resource                                       |
| Compliance       | Downstream    | Platform, HR, Organization, Fleet, Accounting | —                            | 5 workflow groups, 3 tables, 3 services, subscribes to external events                    |
| Tasks            | Downstream    | Platform                                      | Calendar                     | 10 workflow groups, 16 tables (6 control + 10 tenant), empty ACL                          |
| Calendar         | Downstream    | Platform                                      | —                            | 4 workflow groups, 4 tables, 13 events, 4 ACL resources, 1 cron + task bridge             |
| DMS              | Downstream    | Platform, Storage                             | —                            | 18 workflow groups, 14 tables, 33 events, 11 ACL resources, 2 crons                       |
| Management Plane | Downstream    | Platform, Organization                        | —                            | 3 workflow groups, 3 owned tables, 0 shadow tables, 16 events, has build step             |
| HR               | Downstream    | Platform                                      | Compliance                   | ~250 workflow methods in 8 groups, 50 tables (14 control + 36 tenant), 43 events, 2 crons |
| Accounting       | Stub          | —                                             | —                            | Package.json only                                                                         |
| CRM              | Stub          | —                                             | —                            | Package.json only                                                                         |
| Fleet            | Stub          | —                                             | —                            | Package.json only                                                                         |
| Inventory        | Stub          | —                                             | —                            | Package.json only                                                                         |
| Reports          | Stub          | —                                             | —                            | Package.json only                                                                         |
| Pharmacy         | Stub          | —                                             | —                            | Package.json only                                                                         |
