# Aspen OS — Domain-Driven Architectural Review

**Date:** 2026-09-09 | **Scope:** `packages/*` + `.working-docs/` + `CONTEXT.md` + `CODING_CONVENTIONS.md`
**Method:** static inventory of `src/module.ts` (`$name`/`$dependencies`/`$consumes`), `src/pubsub.ts`, `src/auth.ts`, `src/db-schemas/`, `src/workflows/`, `src/services/`, cross-package `from "@aspen-os/*"` grep, plus `.working-docs/BOUNDED_CONTEXTS.md` / `DOMAIN_MODEL.md` cross-check.

## 1. Executive verdict

Aspen OS has a **strong platform kernel and a mostly event-decoupled domain layer**, but its bounded contexts are **unevenly factored**: 2 exemplary autonomous aggregates (Notes, Calendar), 3 cohesive composite clusters (Masters, DMS, Comms), 1 hollow context (Organization), 1 fragmented context (HR split across 3 packages with 0 declared wiring), 4 stubs referenced by live code, and a **partial shared kernel** (`@aspen-os/constants` covers ~5/13 contexts).

Top risks, in priority order:

1. **Hollow `organization` package** — `src/module.ts:11-38` declares no workflows, no tables (`control_plane_schemas={}`, `tenant_schemas={}`), empty `pubsub.ts:1-3` (`events={}`), empty `auth.ts` (`defineAcl({})`). The real branch table lives in Masters (`org_branch`), the real tenant/organization lifecycle lives in Management. Docs (`BOUNDED_CONTEXTS.md:291`, context-map diagram) still claim “1 workflow group, 1 table, 2 events” — stale.
2. **Direct cross-aggregate table reads (2 live violations).** DMS reads Masters’ `master_label` via Drizzle import (`dms/src/services/search-service.ts:14,283-287`) **and** raw SQL (`dms/src/workflow-steps/condition-service.ts:89-98`); Calendar reads Tasks’ `task_status` via raw SQL (`calendar/src/services/task-bridge.ts:122-131`). Both bypass the declared event-driven seam.
3. **Uniform lifecycle missing on 3 axes:** events (`created` vs `removed` vs `uploaded` vs `renamed` vs `trashed`), audit (`tasks`, `hr-core`, `hr-attendance`, `hr-leave` never call `ctx.audit.write`), deletion (hard delete vs `trashed` vs `archived` vs no-delete). HR publishes ~0/58 defined events.
4. **Conceptual duplication in 5 families** (reminder, notification, file/document, view, contact) — consolidation is ~70% done (Calendar reminder, Workspace filter-view, Masters contact are the right canonicals) but stale docs + leftover stubs + parallel HR inbox keep the old surfaces alive.
5. **Stringly-typed hidden coupling everywhere:** `(entityType,entityId)`, `(scopeType,scopeId)`, `(targetType,targetId)`, `(sourceType,sourceEntityId)`, `PIN_ITEM_TYPE`, `FILTER_VIEW_DOMAIN` registries carry cross-context FKs with no compiler enforcement.
6. **Utility/kernel fragmentation:** `stripUndefined` ×7, `AUDIT_*` constants ×12, `*/access personal/global` ×3, all hand-copied instead of living in Platform/Constants.

System is maintainable **if** the recommendations in §9 are executed; without them, hidden coupling + divergent lifecycles will compound with every new module.

## 2. Package topology (as-built, not as-documented)

| Package                       | Build   | `$name` / `$dependencies` / `$consumes`                                                | Tables (control+tenant)                                                                                | Events                                                             | WF groups                            | Units                    |
| ----------------------------- | ------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------ | ------------------------ |
| `platform`                    | build   | kernel (8 units: `db,auth,audit,logs,pubsub,storage,rpc,kvStore`)                      | 16 core (`audit_log,user,session,…,kv_store,logs,file_metadata,workflow_runs/steps`)                   | 8 auth                                                             | —                                    | —                        |
| `constants`                   | build   | shared-kernel enums (only `organization,masters,notes,compliance,comms,country-codes`) | —                                                                                                      | —                                                                  | —                                    | —                        |
| `organization`                | build   | `organization` / `[]` / —                                                              | **0+0 (empty)**                                                                                        | **0**                                                              | **0**                                | none                     |
| `masters`                     | build   | `masters` / `[]` / —                                                                   | 0+10 (`master_*,org_branch`)                                                                           | ~27 `masters:*`                                                    | 9                                    | `db,kvStore`             |
| `notes`                       | build   | `notes` / `[]` / —                                                                     | 0+1 (`note`)                                                                                           | 3 `notes:*`                                                        | 1                                    | none (stateless)         |
| `calendar`                    | build   | `calendar` / `[]` / `task:* (3), compliance:* (4)`                                     | 0+4 (`calendar_*`)                                                                                     | 14 `calendar:*`                                                    | 4                                    | `db,pubsub`              |
| `comms`                       | build   | `comms` / `[]` / 7 topics                                                              | 1+6 (`provider`+`channel,message,notification,preference,setting,template` — SQL names **unprefixed**) | 21 `comms:*`                                                       | 7                                    | `db,kvStore,pubsub,auth` |
| `dms`                         | build   | `dms` / `["masters"]` / `masters:contact_removed`                                      | 0+11 (`dms_*`)                                                                                         | 27 `dms:*`                                                         | 16                                   | `db,pubsub,storage`      |
| `workspace`                   | build   | `workspace` / `[]` / —                                                                 | 0+9 (`workspace_*` incl. `schedule`/`delivery_schedule` alias pair)                                    | ~31 `workspace:*`                                                  | 8                                    | `db,pubsub`              |
| `compliance`                  | raw-src | `compliance` / `[]` / 6 topics incl. stubs                                             | 0+3 (`document,obligation,verification_rule` — SQL names **unprefixed**)                               | 23 `compliance:*`                                                  | 5                                    | `db,kvStore,pubsub`      |
| `tasks`                       | raw-src | `tasks` / `["masters"]` / —                                                            | **5+9** (`task_project,member,status,transition,type` in **control-plane**, rest tenant)               | 11 `task:*` (note singular prefix)                                 | 9                                    | none (stateless)         |
| `hr-core`                     | raw-src | `hrCore` / `[]` / —                                                                    | 14+17 (≈33, largest)                                                                                   | 40 (`employee:,lifecycle:,position:,setup:,access:,announcement:`) | 6 (~150 actions)                     | `db,pubsub`              |
| `hr-attendance`               | raw-src | `hrAttendance` / `[]` / —                                                              | 0+11                                                                                                   | 12 (0 publishers)                                                  | 3                                    | `db,pubsub`              |
| `hr-leave`                    | raw-src | `hrLeave` / `[]` / —                                                                   | 0+12                                                                                                   | 6 (0 publishers)                                                   | 1 (~60 verbs)                        | `db,pubsub`              |
| `management`                  | build   | `management` / `[]` / —                                                                | 4+0 (`tenant,service_provider,service_provider_user,managed_organization`)                             | 19 (4 prefixes)                                                    | 4 (getters, no `workflows/index.ts`) | `db,auth,pubsub`         |
| `crm,fleet,inventory,reports` | stubs   | name-only `package.json`, empty `src/index.ts`                                         | —                                                                                                      | —                                                                  | —                                    | —                        |

Notes:

- **Only hard domain→domain `src` imports in the repo are `tasks→masters` and `dms→masters`** (`tasks/src/workflows/task-type/...`, `dms/src/services/search-service.ts`, `dms/src/workflow-steps/fetch-label.ts`, etc.). Every other cross-context flow is pub/sub — the right default.
- `management` imports `@aspen-os/platform/server/db-schemas` (`workflow-steps/fetch-tenant.ts:5`, `fetch-user.ts:5`) — deep-internal but legitimate (management is the control-plane owner).
- `.working-docs` counts are stale in at least 6 places (org 1 table/2 events, masters 8→10 tables, tasks 15→14, dms 12→11, workspace 8→9, HR single-file vs 3-package split, `fleet:vehicle_registered`/`accounting:*` referencing non-existent packages).

## 3. Modularity assessment

### 3.1 Autonomous aggregates (high cohesion, zero domain deps) — keep as-is

- **Notes** (`notes/src/module.ts:15-16`, stateless, 1 table, 1 WF group, 3 events, full audit on every mutation): textbook autonomous aggregate. Polymorphic `(scopeType,scopeId)` (`schemas/note.ts:31,73,95,129`) is its only coupling, and it is correctly downstream (notes never queries the scoped aggregate).
- **Calendar** (4 tables, 4 WF groups, `$dependencies=[]`, all mutations audited + published): the best runtime-wired module. Its two bridges (`services/task-bridge.ts`, `services/compliance-bridge.ts`) are the reference anti-corruption-layer pattern — except the one raw-SQL fallback (§5.1).
- **Workspace** (9 tables, 8 groups): cohesive personal-workspace cluster (draft/filter-view/dashboard/widget/schedule/pin/recent/setting). Only wart is the `schedule`/`delivery_schedule` alias pair on one table and dual `delivery_due`/`schedule_due` emission (`pubsub.ts:49-56`).

### 3.2 Composite module clusters (justified `$dependencies`) — narrow the seam

- **DMS + Masters** (`dms/src/module.ts:59-65`, `$dependencies=["masters"]`): justified (labels + contact-grantees live in Masters), but DMS then **reads Masters tables directly** instead of treating Masters as taxonomy-provider. Convert to cached read-model or explicit domain service (§9.2).
- **Tasks + Masters** (`tasks/src/module.ts:25-26`, `$dependencies=["masters"]`, stateless, no `$consumes`): weakest justification. The dep exists for label taxonomy (`master_label` soft FK) yet Tasks never touches `kvStore`/`db` from Masters at runtime — a `workspace:*`-style event/read-model or `$consumes` declaration would suffice. Either use the dep (inject a Labels client) or drop it to `[]` + document the soft FK.
- **Comms (7 groups), Compliance (5 groups), Management (4 groups)**: internally cohesive; Comms’ `channels/providers/notifications/preferences/templates/settings/messages` is the largest justified composite (single notification/inbox + outbox surface — do not split).

### 3.3 Fragmented cluster — HR (`hr-core`, `hr-attendance`, `hr-leave`)

Three packages, **zero declared `$dependencies`/`$consumes` between them**, yet conceptually one aggregate family sharing `employeeId` as a stringly-typed FK across ~56 tables. Consequences: `hr-attendance`/`hr-leave` define 18 events with **zero publishers**; `hr-core` defines 40 topics but publishes only `announcement:*`; none of the three writes `ctx.audit.write`. Three crons (`hr:daily-attendance-sync`, `hr:daily-leave-accrual`, `hr:announcement-scheduler`) are registered in isolation with no lifecycle aggregate to order them. **Recommendation:** keep 3 deployables but introduce one HR lifecycle domain service + shared `hr:employee_*` contract owned by `hr-core` (§9.4), or collapse back to one `hr` package as `.working-docs/bounded-contexts/hr.md` still assumes.

### 3.4 Custom contextual compositions — flexible, but `$consumes` is a no-op

`$consumes` (`calendar`, `comms`, `dms`, `compliance` module.ts) is introspection-only, never validated; pg-boss `send()` with no subscriber silently drops (`platform/docs/units/pubsub.mdx:42`), and `healthCheck()` only flags _produced-without-subscriber_, not _consumed-without-producer_. Compliance `$consumes` references `fleet:vehicle_registered`, `accounting:financial_year_started`, `hr:employee_onboarded/separated` — two producers are stubs, one (`accounting`) has no package at all. Composition flexibility is real (Calendar works with or without Tasks), but silent no-ops make missing producers undiscoverable. Extend the health check in both directions (§9.7).

## 4. Aggregate boundaries and structural seams

- **Clean seams to preserve:** Calendar task-bridge (`task:due_date_changed/deleted/status_changed` → `calendar_reminder(targetType=task)`), Calendar compliance-bridge, DMS `contact-share-bridge` (`masters:contact_removed` → delete `dms_share`), Comms `event-bridge` + `delivery-worker` (`comms:message-sweeper` `* * * * *`), Workspace `schedule-service` (per-dashboard `workspace:schedule:<id>` crons → `workspace:delivery_due`, host renders/delivers). All register in `$prepareRuntime()` / unregister in `$cleanup()` per `CODING_CONVENTIONS.md §PubSub`.
- **Seam inconsistency — getters vs `readonly`:** Masters mixes `readonly addresses/contacts/…` (`module.ts:51-58`) with `get branches()` alias + kvStore-bound `get connections()` (`:61-70`); Comms mixes `get channels/providers/notifications` (lazy, nullable-then-build, `module.ts:167-186`) with `readonly preferences/templates/settings/messages`. Calendar/Compliance/HR use pure `readonly` — standardize on `readonly` + factory injection, remove lazy getters (§9.8).
- **Global-singleton seam (DMS, Workspace):** `dms/src/runtime.ts:10-38` (`setDmsStorage/getDmsStorage/…`) + `services/storage-bridge.ts:35-79` routes all file I/O through a module global instead of `ctx`/injected `StorageUnit`; `workspace/src/runtime.ts:7-16` repeats the pattern. Untestable without global setup; contrasts with Calendar/Comms passing `db/pubsub/kvStore` via deps. Inject `StorageUnit` (or a `StoragePort`) through `$initialize`/workflow `ctx`.
- **Tenancy seam inconsistency:** Tasks puts 5 tables in `control_plane_schemas` (`db-schemas/index.ts:39-57`); every other domain package is tenant-only (Comms’ 1 control table `comms_provider` is legitimately host-scoped; Management’s 4 control tables are legitimately control-plane). Either Tasks projects/types are genuinely global (document why) or they belong in `tenant_schemas` — the current split forces every tenancy-mode reasoner to special-case Tasks.

## 5. Hidden coupling, leaking abstractions, duplication

### 5.1 Direct cross-aggregate reads (fix first)

| #   | Reader → Owner                        | Evidence                                                                                                                                                                | Fix                                                                                                                                                                                                        |
| --- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | DMS → Masters `master_label`          | `dms/src/services/search-service.ts:14,283-287` Drizzle import + select; `dms/src/workflow-steps/condition-service.ts:89-98` raw `JOIN master_label`                    | Masters-owned `LabelResolver` domain service (bulk `resolveIds(ids)`), called from DMS workflows; DMS keeps only `label_id` soft FK + cached `label_name` read-model updated from `masters:label_*` events |
| 2   | Calendar → Tasks `task_status`        | `calendar/src/services/task-bridge.ts:122-131` raw `SELECT category FROM "task_status"` (comment admits Tasks ownership)                                                | Backfill `isTerminal/toStatusCategory` on all `task:status_changed` publishers, delete fallback                                                                                                            |
| 3   | HR announcement → Calendar (enum gap) | `hr-core/src/module.ts:48-50` promises `calendar_reminder(targetType=announcement)` but `calendar/src/utils/constants.ts:25-32` `REMINDER_TARGET` has no `ANNOUNCEMENT` | Add `announcement` to `REMINDER_TARGET` + `TARGETS_REQUIRING_ID`, or route announcements through Comms (§6.2)                                                                                              |

### 5.2 Stringly-typed FKs (no compiler help)

- Notes `(scopeType,scopeId)` free-form `<module>:<entity>` (`notes/README.md:7`: `masters:contact`, `tasks:task`, `calendar:event`).
- Masters `(entityType,entityId)` (`master_entity_type`: `branch,connection,contact,entity,organization,org_branch` — `masters/src/db-schemas/enums.ts:16-23`) + label `(scopeType,scopeId)`.
- Calendar `(sourceType,sourceEntityId)` / `(targetType,targetId)` (`REMINDER_TARGET` incl. `task,compliance_document`).
- DMS `dms_share(grantee_type,grantee_id)` holding Masters contact IDs + `dms_entity_label(label_id→master_label)` logical FK (`dms/docs/db-schemas.mdx:124-133`).
- Workspace `FILTER_VIEW_DOMAIN` (`workspace/src/utils/constants.ts:106-112`) + `PIN_ITEM_TYPE` (`:53-60`: `class,dashboard,draft,file_view,triage,view`) with audit remapping in `workflows/pin/shared.ts:12-20`.
- `dms/src/utils/constants.ts:79-85` keeps `dms:contact`/`dms:file_view` “for reading pre-migration rows” — eternal backward-compat coupling.

All are pragmatic, but each needs a registry + exhaustiveness test + documented owner (§9.5). `PIN_ITEM_TYPE`/`FILTER_VIEW_DOMAIN` have neither today (enum validation only, no resolver registry despite docs claiming one).

### 5.3 Leaking abstractions

- **kvStore credential pattern** (Masters `connection-service.ts`, `workflows/connection/*`; Comms `services/credential-service.ts:9-95`, `module.ts:130-186`): workable, but credential-ref construction (`masters:connection:<uuid>:credential`), `CREDENTIAL_NO_EXPIRY`, and host-vs-tenant branching are re-implemented per module. Extract one `CredentialStore` application service on the platform (or in Constants) — §9.3.
- **Ambient `getContext()` in workflow-steps:** `dms/src/workflow-steps/{access-service,path-service,archive-service}`, `notes/src/workflow-steps/access-service.ts:22,27` (reaches into `unit.rest.user.get`), `calendar/src/module.ts:90-99`, `comms/src/module.ts:94-100`, `compliance/src/module.ts:75-78`. Prefer explicit `ctx` threading; reserve `getContext()` for true runtime entry points.
- **Silent `isUnit` guard:** `calendar/src/module.ts:30-32,75-88` leaves `#db/#pubsub=null` + early-returns on mismatch; Comms/Compliance throw. Throw everywhere.
- **`stripUndefined` ×7** (`notes,dms,workspace,masters,calendar,organization,management/src/utils/strip-undefined.ts:3`, identical `Record<string,JsonValue>` signature, used in ~20 `update.ts`): move to `@aspen-os/platform/server` (or Constants) and delete copies.
- **Constants fragmentation:** 12 local `src/utils/constants.ts` files each redefine `AUDIT_ACTION/AUDIT_ENTITY_TYPE` with divergent shapes; `CALENDAR_ACCESS/WORKSPACE_ACCESS/NOTES_ACCESS` triplicate `{personal,global}`; central `constants/src/index.ts:1-6` covers only 6 domains. Complete the shared kernel (§9.3).

## 6. Core workflows — duplicate orchestration distilled

### 6.1 Reminder / schedule (3-way → 1)

Canonical: **Calendar `calendar_reminder`** (`targetType event/task/note/file/custom/compliance_document`), dispatcher cron `calendar:reminder-scan` `* * * * *` → `calendar:reminder_due`. Tasks correctly owns no table (bridge materializes 3 rows per recipient from `task:due_date_changed`); Compliance’s `services/reminder-engine.ts` is already a deprecated stub emitting `compliance:document_expiring/due` for the calendar bridge. Residual confusion: Workspace `schedule` vs `delivery_schedule` dual emission + `SCHEDULE_EVENTS` “schedule vs reminder” comment (`workspace/src/pubsub.ts:53`). **Distill to:** `ReminderService` (Calendar: single dispatcher + task/compliance/announcement bridges) and `DeliveryScheduleService` (Workspace: per-dashboard cron → `workspace:delivery_due`, host renders). Delete the compliance stub and the workspace alias emission.

### 6.2 Notification / inbox (2-way → 1 + 1 fan-out)

- Comms `comms_notification` (inbox row **is** the delivery; `unread/read/dismissed`) + `comms_message` outbox (`queued→sending→sent→delivered/failed`, `comms:message-sweeper`) is the single out-of-band surface — correct.
- HR `hr_announcement` (`draft/scheduled/published/archived`, own recipients table, `announcement:published`) is a **parallel broadcast inbox** that bypasses Comms delivery and reuses `NOTIFICATION_SEVERITY`. **Distill to:** `AnnouncementService` (HR: authoring/scheduling/targeting) → publishes `announcement:published` → Comms `event-bridge` fans out to per-recipient inbox rows (already partially wired: `comms/src/module.ts:43-51` consumes `announcement:published`). HR keeps no delivery state.

### 6.3 File / document / draft / note (4-way — keep, but sharpen boundaries)

| Concept                        | Owner                 | Lifecycle                                                                         | Rule                                                                                                            |
| ------------------------------ | --------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Binary file + records attrs    | DMS `dms_file`        | `triaged→active→expired/trashed→purged` (`classify()` only exit from triage)      | Sole binary store; Compliance/Workspace never store bytes                                                       |
| Regulatory tracking            | Compliance `document` | `draft→submitted→under_review→verified/rejected→expired/overdue→renewed/archived` | Links outward via `{sourceModule,sourceEntityType,sourceEntityId}`; file bytes (if any) live in DMS             |
| Unpublished content + approval | Workspace `draft`     | `draft→submitted→approved→published` (+trash/restore)                             | `drafts.publish({targetDomain:"dms:file"})` is the only cross-over; forbid other modules minting “draft” states |
| Annotation                     | Notes `note`          | no lifecycle (CRUD only)                                                          | Sole annotation surface; delete `master_note` remnants and forbid new per-module note tables                    |

### 6.4 Saved / filter / file views (3 refs → 1 implementation)

Only Workspace `workspace_filter_view` is implemented. Tasks docs (`docs/db-schemas.mdx:230`, `docs/overview.mdx:126`, `README.md:3`) and DMS schemas (`dms/src/schemas/file-view.ts:73-76`) both claim persistence “moved to Masters (`master_filter_view`, `p.masters.filterViews`)” — **no such table/group exists**. Tasks additionally ships `services/filter-engine.ts` ad-hoc builder. **Distill to:** `FilterViewService` (Workspace: `domain=<module>:<entity>`, `FILTER_VIEW_DOMAIN` registry, host-registered resolvers — actually implement the resolver registry the docs promise).

### 6.5 Contact / address / identity (1 canonical + soft refs)

Canonical: **Masters** (`master_contact/master_address/master_entity`, `CONTACT_TYPE`, `(entityType,entityId)` scoping). DMS holds only grantee pointers; Calendar `ATTENDEE_TYPE`, Comms `RECIPIENT_TYPE`, Notes `masters:contact` scope are soft refs — correct. Exception: **HR `employee` is a separate identity** with no link to Masters contact — document whether employee↔contact is intentionally disjoint (likely yes: employment vs business relationship) and say so once in `hr.md`.

### 6.6 Activity / audit (1 store + N projections)

Store: platform `audit_log` (`AuditUnit`, `seq`, `idempotency_key`, `crud_action`, `previous/new_state`, `workflow_run_id`). Projections: DMS `workflows/activity/*` (correct — reads `ctx.audit.query`), Compliance `workflows/audit/*` (correct — no local table), Management inline `ctx.audit.write` (correct). Outlier: **Tasks `task_activity_log`** (own append-only table; Tasks writes 0 `audit_log` rows). Migrate Tasks activity to an `audit_log` projection like DMS, or document why task activity is exempt.

## 7. Anti-patterns and boundary violations register

| #   | Severity | Pattern                                                                 | Evidence                                                                                                                                                                                                     | Fix (§9)                                                       |
| --- | -------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| A1  | High     | Hollow bounded context                                                  | `organization/src/{module,pubsub,auth,db-schemas}` empty; stale `BOUNDED_CONTEXTS.md:291`                                                                                                                    | Decommission or refill (9.1)                                   |
| A2  | High     | Cross-aggregate table read                                              | `dms/.../search-service.ts:14,283-287`, `dms/.../condition-service.ts:89-98`, `calendar/.../task-bridge.ts:122-131`                                                                                          | Anti-corruption `LabelResolver` + event payload backfill (9.2) |
| A3  | High     | Silent event drop (`$consumes` unvalidated; pg-boss no-subscriber drop) | `calendar/module.ts:46-54`, `comms/module.ts:43-51`, `compliance/module.ts:37-44`; `platform/docs/units/pubsub.mdx:42`                                                                                       | Bidirectional health check (9.7)                               |
| A4  | High     | Phantom producers (stubs referenced by live bridges)                    | `fleet:vehicle_registered`, `accounting:financial_year_started` in `compliance/.../event-bridge.ts:127`; `stubs.md` admits `accounting,pharmacy` have no packages                                            | Stub-or-drop decision (9.1)                                    |
| A5  | Med      | Missing audit trail (4 packages)                                        | `grep audit.write tasks/hr-*/src/workflows` = 0; `tasks/docs/overview.mdx:37` falsely claims `ctx.audit.write`                                                                                               | Enforce audit on mutation (9.6)                                |
| A6  | Med      | Unpublished events (24 dead topics)                                     | `hr-attendance` 12, `hr-leave` 6, `hr-core` ~34 non-announcement, all defined, 0 publishers                                                                                                                  | Publish or delete (9.6)                                        |
| A7  | Med      | Inconsistent delete semantics                                           | Notes/Tasks hard delete; DMS/Workspace trash+purge; Compliance archive-only; Masters `remove`+`delete`; `orgBranch` no delete                                                                                | Deletion policy per aggregate class (9.6)                      |
| A8  | Med      | Global-singleton runtime                                                | `dms/src/runtime.ts`, `workspace/src/runtime.ts`, `dms/.../storage-bridge.ts:35-79`                                                                                                                          | Inject `StorageUnit`/config (9.8)                              |
| A9  | Med      | Getter/readonly seam drift                                              | `masters/module.ts:51-70`, `comms/module.ts:167-191` vs `calendar/module.ts:126-129`                                                                                                                         | Standardize `readonly` (9.8)                                   |
| A10 | Low      | Copied utils/constants                                                  | `strip-undefined.ts` ×7; `AUDIT_*` ×12; `*_ACCESS` ×3                                                                                                                                                        | Shared kernel completion (9.3)                                 |
| A11 | Low      | Dual emission / alias tables                                            | `workspace:delivery_due` + deprecated `schedule_due`; `workspace_schedule`/`delivery_schedule` same table; `branches`/`orgBranches`, `deliverySchedules`/`schedules` aliases; `dms:contact` compat constants | Sunset plan with removal version (9.6)                         |
| A12 | Low      | Tenancy split outlier                                                   | Tasks 5 control-plane tables vs all-tenant peers                                                                                                                                                             | Justify or move (9.8)                                          |
| A13 | Low      | Empty ACLs                                                              | `organization/src/auth.ts`, `tasks/src/auth.ts` = `defineAcl({})`                                                                                                                                            | Define or document public (9.8)                                |
| A14 | Low      | Stale `.working-docs` (6+ spots)                                        | org tables/events, masters 8→10, tasks saved-view→masters, dms filter-view→masters, HR 1-file vs 3-package, diagram deps                                                                                     | Docs-as-contract refresh (9.9)                                 |

No `Result<T,E>`/`PaginatedResult` violations, no Zod domain validation, no `#/*` cross-package misuse, no `drive`/`notifications`/`task_reminder`/`master_note` resurrection — the negative-rule floor from `CODING_CONVENTIONS.md §Negative rules` is holding.

## 8. Ubiquitous-language harmonization

| Term                                    | Conflict                                                                                                    | Canonical (keep)                                                                                                        | Rename/deprecate                                                                                              |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Contact                                 | Masters relationship vs DMS grantee vs calendar/comms kinds                                                 | Masters `Contact` (business relationship)                                                                               | Others become `ContactRef/AttendeeContact/RecipientContact` in prose; keep enum values (wire-compat)          |
| Connection                              | Masters **integration credential** (`masters/README.md:9` explicit) vs generic sense                        | Masters `Connection` (integration)                                                                                      | Add glossary note; never use “connection” for business relationships (those are Contacts)                     |
| Reminder / Schedule                     | Calendar dispatcher vs compliance policy columns vs workspace cron                                          | Calendar `Reminder`; Workspace `DeliverySchedule`                                                                       | Compliance `reminder_days/channel` → `expiry_policy_*`; delete `SCHEDULE_EVENTS` alias                        |
| Notification / Announcement             | Comms inbox vs HR broadcast                                                                                 | Comms `Notification`; HR `Announcement` (authoring only)                                                                | HR `announcement:published` = intent; Comms owns delivery state                                               |
| Dashboard                               | Workspace composable vs compliance computed summary                                                         | Workspace `Dashboard`; Compliance `Summary`                                                                             | Rename `compliance/.../dashboard.*` → `summary.*` (keep `getSummary` verb)                                    |
| Draft                                   | Workspace entity vs `verification_status=draft` vs leave/F&F `draft`                                        | Workspace `Draft` (entity)                                                                                              | Others become `draft status value` in prose; forbid new `*_draft` entities outside Workspace                  |
| Activity                                | Tasks table vs DMS/compliance projections vs platform store                                                 | Platform `AuditLog`; per-module `ActivityFeed` (projection)                                                             | Migrate Tasks `activity_log` → projection or document exemption                                               |
| Organization / Tenant / Branch / Entity | Management `tenant`+`organization` vs Masters `entity/orgBranch` vs `organization` package vs HR `branchId` | Management `Tenant` (SaaS customer) + `ManagedOrganization`; Masters `Entity` (business party) + `OrgBranch` (location) | Decommission `organization` package name or repurpose as profile-view; document employee↔contact disjointness |
| Role                                    | Management `ROLES` vs tasks members vs HR access vs comms channels                                          | Keep all four, scoped: `PlatformRole, ProjectRole, HrRole, ChannelRole`                                                 | Qualify in every doc header                                                                                   |
| Share / PublicLink / Attendee invite    | DMS grants vs DMS token links vs calendar invites                                                           | DMS `Share` (grant) + `PublicLink` (token); Calendar `Attendee`                                                         | Never “share” a calendar event or “invite” a DMS grantee                                                      |

## 9. Recommendations (ordered, concrete)

### 9.1 Refactor / consolidate / decommission modules

1. **Decommission or refill `organization` (decision, 1 PR).** Options: (a) delete package + redirect `organization:branch_created` consumers to `masters:org_branch_created` (preferred — code already moved); (b) refill as thin Organization-profile view over Management+Masters. Either way, fix `BOUNDED_CONTEXTS.md:291` + context-map diagram + `organization/README` in the same PR. Do not leave a build-step package with 0 tables/0 events.
2. **Decide stubs explicitly.** Compliance EventBridge expects `fleet:vehicle_registered` + `accounting:financial_year_started` (`compliance/src/module.ts:37-44`); `stubs.md` also names `pharmacy`. For each: either (a) keep stub + add contract test asserting “no producer yet, bridge no-ops” (documents the seam), or (b) remove the subscription + `$consumes` entry until the producer exists. No third option — phantom subscriptions are the costliest silent coupling.
3. **HR: introduce one lifecycle aggregate contract without merging packages.** `hr-core` owns `hr:employee_{created,updated,status_changed}` (publish them — today 0 publishers); `hr-attendance`/`hr-leave` declare `$consumes=["hr:employee_*"]` and validate `employeeId` against an `EmployeeRef` value object from `hr-core` (or Constants). Publish the 18 attendance/leave events or delete them. Add `ctx.audit.write` on HR mutations (currently 0).

### 9.2 Isolate duplicate orchestration into first-principle domain services

4. **`LabelResolver` (Masters-owned).** Bulk `resolveIds/exists` + `label_applied/removed` event feed; DMS/Tasks drop direct `master_label` reads (`search-service.ts:283-287`, `condition-service.ts:89-98`). DMS keeps `label_id` soft FK + denormalized `label_name` maintained by the resolver.
5. **`ReminderService` (Calendar) + `DeliveryScheduleService` (Workspace).** Calendar owns all time-based nudges (event/task/compliance/announcement bridges converge on `calendar_reminder`); Workspace owns dashboard cron delivery (`workspace:delivery_due` only). Delete `compliance/.../reminder-engine.ts` stub and `workspace:schedule_due` dual emission.
6. **`NotifyOn` application-layer helper (Comms).** Single `notify({to, channelTypes, template, sourceModule, sourceEntity})` used by HR announcements, compliance expiries, calendar reminders, DMS expiries — replaces today’s per-bridge fan-out copies and the 21-topic ad-hoc surface with `notification.created/read/dismissed` + `message.queued/sent/delivered/failed` as the only observable lifecycle.
7. **`CredentialStore` (Platform or Constants).** Unify Masters `connection-service.ts` + Comms `credential-service.ts:9-95` (ref construction, rotation, host-vs-tenant resolution, `CREDENTIAL_NO_EXPIRY`).

### 9.3 Complete the shared kernel

8. Move `stripUndefined` → `@aspen-os/platform/server` (or Constants), delete 7 copies.
9. Complete `@aspen-os/constants`: add `calendar, workspace, dms, tasks, hr, management` enum modules; collapse 12 local `AUDIT_ACTION/AUDIT_ENTITY_TYPE` + 3 `*_ACCESS` objects onto it. Conventions already mandate Valibot/uuidv7/snake_case — the kernel should also own `EmployeeRef`, `ContactRef`, `Access(personal/global)`, and the `<module>:<entity>` scope-value registry.

### 9.4 Enforce uniform domain-event lifecycle

10. Adopt: `created → updated → deleted` as the only persistence verbs; state transitions use domain verbs (`submitted/verified/archived/trashed/restored/purged/published/...`); `removed/uploaded/renamed` grandfathered only where wire-compat demands it, each with a `DEPRECATED — use X` comment + removal version. Concretely: Masters `REMOVED`→`DELETED` (or document soft-remove exemption), DMS `UPLOADED`→`CREATED` (keep `uploaded` as alias 1 minor), DMS `RENAMED`→`UPDATED`, Calendar attendee `REMOVED`→`DELETED`, Workspace pin `REMOVED`→`DELETED`, Comms `SETTING_EVENTS` key/value singular-plural fix.
11. Every defined topic gets a publisher or is deleted (kills ~24 dead HR topics + sparse Comms `TEMPLATE/PREFERENCE/SETTING` events). Every produced topic keeps a subscriber (existing health check) **and** every consumed topic keeps a producer (new check, §9.7).

### 9.5 Harden polymorphic seams (keep flexibility, add safety)

12. One `ScopeRegistry` (Constants): enumerated `<module>:<entity>` values with owner + exhaustiveness test; replace free-form `scopeType/sourceType/targetType/grantee_type` strings. Covers `notes masters:contact/tasks:task/calendar:event`, `FILTER_VIEW_DOMAIN` 6 values, `PIN_ITEM_TYPE` 6 values, `REMINDER_TARGET` (+`announcement`), DMS `ENTITY_TYPE{FILE,FOLDER}`.
13. Implement the Workspace filter-view **resolver registry** the docs promise (host-registered per-domain resolvers; modules never query each other’s tables), or delete the claim. Same for `PIN_ITEM_TYPE` audit remapping.

### 9.6 Uniform transactional lifecycle (audit + delete + status)

14. `ctx.audit.write` on every mutation (Tasks, HR ×3 — currently 0). Tasks `docs/overview.mdx:37` claim is false today; either implement or correct the doc.
15. Deletion policy by aggregate class: (a) trash+purge (DMS files, workspace drafts), (b) archive (compliance docs, DMS classes, tasks projects), (c) hard delete (notes, comments, preferences) — document each aggregate’s class in its `domain-model/*.md`; give `orgBranch` a delete story (today none).
16. Sunset dual emissions with versions: `schedule_due`, `branches` alias, `deliverySchedules` alias, `dms:contact` compat constants.

### 9.7 Make composition observable

17. Extend `BasePlatform.healthCheck()` with `unproducedConsumedTopics` (mirror of `unsubscribedTopics`), failing `schedule-service`/`event-bridge` wiring at boot instead of at 3 AM. Add a boot-time `$consumes` report (warn, not throw — preserves flexibility).
18. Backfill `task:status_changed` payloads (`isTerminal/toStatusCategory`) and delete the Calendar raw-SQL fallback.

### 9.8 Structural hygiene (small, mechanical)

19. `readonly` workflow groups everywhere; delete lazy `get channels/providers/connections/branches` (factory-inject `kvStore`/`db` at `$initialize`).
20. Inject `StorageUnit`/config into DMS workflows; delete `dms/src/runtime.ts` + `workspace/src/runtime.ts` globals (or scope them per-platform-instance, never module-global).
21. Justify or move Tasks’ 5 control-plane tables; define or explicitly waive ACL for `organization`/`tasks` (`defineAcl({})` today); throw (not early-return) on `isUnit` mismatch in Calendar.

### 9.9 Docs-as-contract refresh

22. Regenerate per-context counts (tables/events/groups/deps/units) from source; fix org/masters/tasks/dms/workspace/HR entries + context-map diagram; delete “saved views live in Masters” / “filter-view persistence moved to Masters” claims (both false — implementation is Workspace); record employee↔contact disjointness, Tasks control-table rationale, and the canonical-duplicate table (§6) in `DOMAIN_MODEL.md`.

## 10. Suggested sequencing

- **PR 1 (safety):** §9.7 health check + §9.5 scope registry + §9.4 event-alias deprecations — no behavior change, makes all later moves observable.
- **PR 2 (seams):** §9.2 `LabelResolver` + calendar payload backfill + DMS/Calendar raw-SQL deletion — removes both cross-table reads.
- **PR 3 (kernel):** §9.3 `stripUndefined`/constants/`CredentialStore` — mechanical, high fan-out, unblocks HR work.
- **PR 4 (domains):** §9.1 org decision + stub decision + §9.6 HR publish/audit + Tasks activity projection — the judgment calls, now with safety nets.
- **PR 5 (prose):** §8 renames + §9.9 docs refresh — lock the ubiquitous language after the code matches it.

## Appendix — key evidence paths

- Modules: `packages/{organization,masters,notes,calendar,comms,dms,workspace,compliance,tasks,hr-core,hr-attendance,hr-leave,management}/src/module.ts`; events `…/src/pubsub.ts`; ACL `…/src/auth.ts`; tables `…/src/db-schemas/index.ts`; workflows `…/src/workflows/index.ts`; services `…/src/services/`.
- Violations: `packages/dms/src/services/search-service.ts:14,283-287`; `packages/dms/src/workflow-steps/condition-service.ts:89-98`; `packages/calendar/src/services/task-bridge.ts:40,108-134`; `packages/management/src/workflow-steps/fetch-{tenant,user}.ts`.
- Duplication: `packages/calendar/src/db-schemas/reminder.ts` + `services/{task-bridge,compliance-bridge,reminder-dispatcher}.ts`; `compliance/src/services/reminder-engine.ts` (stub); `hr-core/src/workflows/announcement/*` vs `comms/src/workflows/notification/*`; `workspace/src/db-schemas/filter-view.ts` vs `tasks/docs/db-schemas.mdx:230` vs `dms/src/schemas/file-view.ts:73-76`; `tasks/src/db-schemas/activity-log.ts` vs `dms/src/workflows/activity/*`.
- Kernel drift: `*/src/utils/strip-undefined.ts` (×7); `*/src/utils/constants.ts` (×12); `packages/constants/src/index.ts:1-6`; `dms/src/runtime.ts:10-38`; `workspace/src/runtime.ts:7-16`.
- Contracts: `.working-docs/BOUNDED_CONTEXTS.md:174-251,274-305`; `.working-docs/bounded-contexts/*.md`; `CONTEXT.md` (ubiquitous language); `CODING_CONVENTIONS.md §Module shape/Events/Workflows/PubSub/Negative rules`.
