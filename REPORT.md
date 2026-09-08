# Aspen OS — Module Division & Architectural Seam Review

**Date:** 2026-09-08
**Scope:** `packages/*` (12 implemented modules + 3 HR sub-packages + 4 stubs), platform `Module`/`Unit` seam, `.working-docs/` bounded contexts + domain model.
**Goal:** modular, maintainable system that composes as a group, individually, or with custom modules.

## Verdict

**No — not yet clearly divided.** The mechanical seam is good (zero cross-module source imports; all coupling via events; every `module.ts` declares `$dependencies = []`), but the conceptual division is not:

1. At least **10 duplicated bounded contexts** exist (Contact, org/branch spine, notification/announcement/watch, reminder/schedule, saved-view, label, file/attachment, note/draft/comment, address/bank, share).
2. **Event wiring is partly dead** — compliance and comms subscribe to topics no producer emits (`hr:employee_onboarded`, `organization:branch_created`, `management:tenant_provisioned`). `$consumes` is introspection-only, never validated, so these silently no-op.
3. **Hidden coupling via string registries** (`masters:contact`, `tasks:task`, `calendar:event`, `tenant:xxx`) replaces the removed direct imports. No single owner validates them.
4. **Granularity is unbalanced** — `organization` (1 table, 1 group) vs `hr-core` (31 tables, 186 workflows) vs `dms` (16 groups) vs `workspace` (8 unrelated concerns in one package).
5. **Custom-module path is documented but unproven** — `.agents/skills/write-module/SKILL.md` + platform `custom-module.mdx` exist, stubs (`crm/fleet/inventory/reports`) are empty, no example host composes a subset.

Result: modules run solo today only because every dependency is optional-and-unchecked, not because boundaries are crisp. Any stricter composition (e.g. install `compliance` without `hr`, or reuse `dms` files from `tasks`) will surface the overlaps above.

---

## 1. Current state (verified)

| Module                              | `$name` / `$dependencies`                                           | Units (`$initialize`)                  | Tables                   | Groups            | Notes                                                           |
| ----------------------------------- | ------------------------------------------------------------------- | -------------------------------------- | ------------------------ | ----------------- | --------------------------------------------------------------- |
| `organization`                      | `organization` / `[]` (`packages/organization/src/module.ts:21-22`) | none                                   | 1 (`branch`)             | 1 (`branches`)    | smallest module                                                 |
| `masters`                           | `masters` / `[]` (`packages/masters/src/module.ts:17-18`)           | `db`, `kvStore`                        | 8 (`master_*`)           | 8                 | polymorphic owner of everything                                 |
| `notes`                             | `notes` / `[]` (`packages/notes/src/module.ts:15-16`)               | none                                   | 1 (`note`)               | 1                 | stateless                                                       |
| `compliance`                        | `compliance` / `[]` (`packages/compliance/src/module.ts:30-31`)     | `db`, `kvStore`, `pubsub`              | 3                        | 5                 | `EventBridge` + `ReminderEngine`                                |
| `tasks`                             | `tasks` / `[]` (`packages/tasks/src/module.ts:25-26`)               | none                                   | 15                       | 9                 | stateless; `due_date` is reminder source                        |
| `calendar`                          | `calendar` / `[]` (`packages/calendar/src/module.ts:37-38`)         | `db`, `pubsub`                         | 4 (`calendar_*`)         | 4                 | owns canonical `calendar_reminder`; task bridge                 |
| `comms`                             | `comms` / `[]` (`packages/comms/src/module.ts:36-37`)               | `auth`, `db`, `kvStore`, `pubsub`      | 7 (1 control + 6 tenant) | 7                 | inbox + outbox sweeper + 8 bridge subs                          |
| `dms`                               | `dms` / `[]` (`packages/dms/src/module.ts:59-60`)                   | `db`, `pubsub`, `storage`              | 12 (`dms_*`)             | 16                | largest group count                                             |
| `workspace`                         | `workspace` / `[]` (`packages/workspace/src/module.ts:39-40`)       | `db`, `pubsub`                         | 8 (`workspace_*`)        | 8                 | drafts + dashboards + pins + watches + schedules                |
| `management`                        | `management` / `[]` (`packages/management/src/module.ts:45-46`)     | `db` retained (takes `db,auth,pubsub`) | 3 (all control-plane)    | 3                 | only `get tenants()` getter; rest `readonly`                    |
| `hr-core`                           | `hrCore` / `[]` (`packages/hr-core/src/module.ts:19-20`)            | `db`, `pubsub`                         | 31                       | 6 (186 workflows) | employee + lifecycle + position + setup + access + announcement |
| `hr-attendance`                     | `hrAttendance` / `[]`                                               | `db`, `pubsub`                         | 11 (all tenant)          | 3 (63 workflows)  | independent cron                                                |
| `hr-leave`                          | `hrLeave` / `[]`                                                    | `db`, `pubsub`                         | 12 (all tenant)          | 1 (60 workflows)  | largest single group                                            |
| stubs `crm/fleet/inventory/reports` | n/a                                                                 | n/a                                    | 0                        | 0                 | `src/index.ts` 0 bytes; `package.json` name-only                |

Cross-import check: `grep 'from "@aspen-os/' packages/*/src` hits only `@aspen-os/platform` + `@aspen-os/constants`. No module imports another module's source. `grep '\$dependencies' packages/*/src/module.ts` → all `[]` (13/13). Coupling is events-only ($consumes) + shared string registries.

HR note: there is **no `packages/hr/`**. Docs (`.working-docs/domain-model/hr.md:3`, `Package: @aspen-os/hr`, "54 tables, singular module") are stale. Actual: 3 npm packages (`@aspen-os/hr-core`, `@aspen-os/hr-attendance`, `@aspen-os/hr-leave`), 31+11+12=54 tables, 186+63+60=309 workflow entries, disjoint ACL resources and event prefixes. The split is already correct — do not re-split HR (see §3.6).

---

## 2. Findings

### F1. Contact is owned twice, referenced a third time (HIGH)

- Canonical: `master_contact` with `(entity_type, entity_id)` polymorphic owner (`packages/masters/src/db-schemas/contact.ts:6,31`).
- Duplicate handle: DMS `dmsShare.grantee_type="contact"` stores masters contact IDs + `contact-share-bridge.ts` subscribes `masters:contact_removed` (`packages/dms/src/db-schemas/share.ts:11,22`, `packages/dms/src/services/contact-share-bridge.ts:14-17,32,49-53`).
- Shadow copy: `hr-core employee{phone,email,emergency_contact_*}` (`packages/hr-core/src/db-schemas/employee.ts:33-36,52-53,62-63`).
- Calendar `calendarAttendee{email,name,attendeeId/attendeeType}` (`packages/calendar/src/db-schemas/attendee.ts:6`) is a fourth identity shape.
- Effect: removing a contact revokes DMS shares via an event, but HR/calendar copies go stale. No single "party directory" contract.

### F2. Two org/user spines + two branch graphs (HIGH)

- `organization.branch{parent_branch,type}` (`packages/organization/src/db-schemas/branch.ts:15-33`, events `branch:created/updated` in `packages/organization/src/pubsub.ts:3-6`).
- `management.tenant + serviceProvider(+User) + users.*` (`packages/management/src/db-schemas/`, `packages/management/src/module.ts:78-112`) — a second org spine on the control plane.
- `masters.masterEntity{name,type,code,tax_id,organization_id}` (`packages/masters/src/db-schemas/entity.ts:6`) — a third "company" entity.
- `hr-core department + hrPosition(+Assignment) + hrUser/Role/Permission/UserBranchAccess` — a fourth hierarchy with its own `branchId` strings never FK'd to `organization.branch` (`packages/hr-core/src/workflows/access-policy.ts:7-93`).
- Effect: "which branch/department/entity does this row belong to" has four answers. Compliance subscribes `organization:branch_created` (`packages/compliance/src/services/event-bridge.ts:90`) which is never emitted (real topic is `branch:created`) — dead edge.

### F3. Notification surface is split four ways (HIGH)

- `comms notification` (inbox row = delivery intent, `packages/comms/src/db-schemas/notification.ts:11`) + `comms_message` outbox swept by `comms:message-sweeper` (`packages/comms/src/services/delivery-worker.ts:17,31-64`).
- `hr-core hr_announcement(+Recipient)` + `announcement:published` (`packages/hr-core/src/db-schemas/announcement.ts:26,53`, `packages/hr-core/src/pubsub.ts:265-272`); comms fans it out (`packages/comms/src/services/event-bridge.ts:156-158,288-323`).
- `task_watcher{task_id,user_id}` (`packages/tasks/src/db-schemas/watcher.ts:4-11`) vs `workspace_watch{user_id,item_type,item_id}` (`packages/workspace/src/db-schemas/watch.ts:6`).
- Effect: four subscription/fan-out tables, three vocabularies (`notification` vs `announcement` vs `watch`). A custom module cannot "notify a user" without picking a lane.

### F4. Reminder/schedule surface is split three ways (HIGH)

- Canonical task/event reminders: `calendar_reminder{target_type,target_id}` + `calendar:reminder-scan (* * * * *)` dispatcher (`packages/calendar/src/services/reminder-dispatcher.ts:15-29`, targets `event/file/note/task/custom` in `packages/calendar/src/utils/constants.ts:25-31`).
- Compliance `reminder_days/escalation_days` columns + `ReminderEngine` (4 crons: `compliance:daily-expiry-scan`, `daily-status-transition`, `daily-escalation`, `weekly-summary` in `packages/compliance/src/services/reminder-engine.ts:37-90,44-97`) publishing `compliance:document_expiring/due/...`.
- `workspace_schedule{cron}` per-dashboard pg-boss crons `workspace:schedule:<id>` (`packages/workspace/src/services/schedule-service.ts:15-50,89-94`) + tasks `due_date` as implicit reminder source via calendar task bridge (`packages/calendar/src/services/task-bridge.ts:158-166`).
- Effect: three cron/sweep loops, three threshold vocabularies. CONTEXT.md already warns not to confuse them — a sign the seam is wrong, not the reader.

### F5. Saved-view / filter-view is implemented twice, referenced in five places (MEDIUM)

- `master_filter_view` + `workflows/filter-view/*` (`packages/masters/src/db-schemas/`) with `domain` registry (`tasks:task`, `dms:file`, `notes:note`, `hr:employee`, `compliance:document`, `workspace:draft` — `packages/masters/docs/workflows.mdx:161`).
- DMS `file-view` valibot schema + `search-service` (`packages/dms/src/schemas/file-view.ts`, `packages/dms/src/services/search-service.ts`).
- Tasks `task_saved_view` + workspace `Filter View` + workspace `Dashboard/Widget{filter|viewId}` complete the set.
- Effect: same "saved filter" concept, two implementations, no shared resolver contract (workspace has a `registerViewResolver` registry; masters does not).

### F6. File/attachment is owned by DMS but shadowed twice (MEDIUM)

- Canonical: `dms_file(+Version)` + storage bridge (`packages/dms/src/db-schemas/file.ts:8`, `packages/dms/src/services/version-service.ts:66-77`, `packages/dms/src/workflows/file/upload.ts:51-84`).
- Shadows: tasks `attachment` (`packages/tasks/src/db-schemas/attachment.ts:4`), compliance `compliance_document` + `attachment/upload` storing a bare `storageKey` string (`packages/compliance/src/workflows/document/attachment/upload.ts:9-33`, event `packages/compliance/src/pubsub.ts:172`).
- Effect: retention/legal-hold/versioning apply only to DMS files. Compliance/task attachments bypass them.

### F7. Note vs Draft vs Comment: three tables, one shape (MEDIUM)

- `note{title,body,tags[],scope_type/scope_id,access}` (`packages/notes/src/db-schemas/note.ts:6-29`) with scope registry (`masters:contact`, `tasks:task`, `calendar:event`).
- `workspace_draft{title,body,notes,status,access,target_entity_type/id}` + approval lifecycle + `workspace_draft_comment` (`packages/workspace/src/db-schemas/draft.ts:8-29`).
- Tasks `comment` is a third comment table.
- Effect: "attach a human text to X" has three APIs. Notes is stateless (no `$initialize`); drafts carry workflow state. The distinction (quick-capture vs approval-lifecycle content) is real but undocumented at the call site.

### F8. Address / bank / label duplicates (MEDIUM)

- `master_address` (entity-linked, `packages/masters/src/db-schemas/address.ts:6-7,24`) vs `employee{current/permanent_address,bank_*}` vs address columns in comms `channel/provider` vs management `service-provider`.
- `master_payment_method{bank_name,account_*}` (`packages/masters/src/db-schemas/payment-method.ts:15-18`) vs employee bank columns. Card data is correctly masked-only in masters — do not regress this.
- `dms_label{name,color,global|owner}` (`packages/dms/src/db-schemas/label.ts:6`) vs `task_label_def` (project-scoped, `packages/tasks/src/db-schemas/label.ts:4`). Same `{name,color}` shape, separate tables.
- Intra-DMS: `dms_share` (grantee model) vs `dms_public_link` (token links) — two sharing mechanisms in one module.

### F9. Dead / mismatched event contracts (HIGH — breaks "works solo or grouped")

All `$consumes` are introspection-only, never validated. Verified dead edges:

- Compliance subscribes `hr:employee_onboarded / hr:employee_separated` (`packages/compliance/src/module.ts:39-40`, `packages/compliance/src/services/event-bridge.ts:75-80`) — hr-core emits `employee:created/updated/status_changed`, `lifecycle:onboarding_started/completed`, `lifecycle:separation_initiated/completed` (`packages/hr-core/src/pubsub.ts:6,39-47`). Never fires.
- Compliance subscribes `organization:branch_created` + `fleet:vehicle_registered` + `accounting:financial_year_started` (`packages/compliance/src/services/event-bridge.ts:85-102`) — real topic is `branch:created` (`packages/organization/src/pubsub.ts:4`); fleet/accounting are stubs. Never fires.
- Comms subscribes `management:tenant_provisioned/activated` (`packages/comms/src/module.ts:49-50`, `packages/comms/src/services/event-bridge.ts:159-164`) — management emits `tenant:provisioned/activated` (`packages/management/src/pubsub.ts:4-11`). Never fires (missing `management:` prefix).
- Health check (`BasePlatform.healthCheck`, `packages/platform/src/server/base-platform.ts`) flags _produced-without-subscriber_; nothing flags _subscribed-without-producer_. The failure mode is silent.
- One rule violation found: calendar task-bridge falls back to a direct cross-module table read `SELECT category FROM "task_status"` (`packages/calendar/src/services/task-bridge.ts:123-131`). This breaks the "events-only" invariant and breaks when `tasks` is not installed (guarded by try/catch, but still a schema coupling).

### F10. Infra patterns copied per module (MEDIUM)

- Cron `schedule + subscribe + unsubscribe/unschedule` boilerplate in compliance, calendar, comms, dms (×2), workspace, hr-leave, hr-attendance (`packages/compliance/src/services/reminder-engine.ts:44-97`, `packages/calendar/src/services/reminder-dispatcher.ts:14-47`, `packages/comms/src/services/delivery-worker.ts:31-64`, `packages/dms/src/services/expiry-scanner.ts:17-49`, `packages/workspace/src/services/schedule-service.ts:19-66`, `packages/hr-leave/src/module.ts:47-55`).
- `credentialRef` vault pattern ×2: masters `masters:connection:<uuid>:credential` (`packages/masters/src/services/connection-service.ts:5`, `packages/masters/src/workflows/connection/create.ts:19-21`) vs comms `comms:channel|provider:<uuid>:credential` (`packages/comms/src/workflows/channel/create.ts:17-18`, `packages/comms/src/services/credential-service.ts:11-92`).
- Inline `ctx.audit.write` in ~every workflow (notes, dms ~25 workflows, masters, compliance `reminder-engine.ts:165,339`, workspace `schedule-service.ts:95`) with bare-string entity types — no shared audit helper or entity-type registry.
- Storage: platform `StorageUnit` vs DMS `storage-bridge` vs bare `storageKey` strings in compliance — three ways to reference a binary.

### F11. Granularity + ownership imbalances (MEDIUM)

- `masters` is a god-object: 8 groups spanning contacts, addresses, bank accounts, payment methods, entities, connections, UoMs, filter views, settings. Its polymorphic `(entity_type, entity_id)` scope (`organization|branch|connection|contact|entity`) makes it the implicit owner of every cross-entity join.
- `workspace` is a grab-bag: drafts (content), dashboards/widgets/schedules (analytics), pins/recent/watches (personalization), filter views (query). Personalization and analytics have different scaling/retention needs.
- `organization` (1 table) vs `management` (control-plane tenants): the Tenant (better-auth organization row + `management.tenant`) vs Organization-profile (`organization` module, per-tenant DB, shares better-auth org ID) vs `master_entity` split is documented in CONTEXT.md but undiscoverable from code — names collide (`organization` = module, table concept, and better-auth plugin).
- `constants` (`packages/constants/src/index.ts`) re-exports only `organization, masters, notes, compliance, comms, country-codes` — `tasks/calendar/dms/hr/workspace` keep local `utils/constants.ts`. No single enum source.
- Build skew: `platform/organization/masters/notes/calendar/comms/management/dms/workspace/constants` build to `.output/`; `compliance/tasks/hr*` export raw `.ts` (per `CODING_CONVENTIONS.md` §Repository overview). A custom module author must know which lane to pick; wrong choice breaks downstream typechecking (see "Build gotcha").

---

## 3. Recommendations

Priorities: **P0** = fix composability bugs; **P1** = collapse duplicates (one owner per concept); **P2** = seam hardening for custom modules.

### P0-1. Fix dead event contracts + validate `$consumes` (fixes solo/grouped composition)

- Rename to match producers (or version producers): `hr:employee_onboarded` → `lifecycle:onboarding_completed` (+ `employee:created`); `organization:branch_created` → `branch:created`; `management:tenant_provisioned` → `tenant:provisioned` (or namespaced producers to `management:tenant_provisioned` — pick one, update `management/src/pubsub.ts:4-11` and `comms/src/services/event-bridge.ts:159-164` together).
- Add a startup validator: for every `mod.$consumes`, warn/fail when no installed module's `ModuleInfra.events` declares the topic. Wire into `$prepareInfra()` next to the existing `$dependencies` check (`packages/platform/src/server/base-platform.ts:116-118`) and surface in `healthCheck()` as `unconsumedSubscriptions` (mirror of existing `unsubscribedTopics`).
- Add one contract test per bridge (compliance `event-bridge.ts`, comms `event-bridge.ts`, calendar `task-bridge.ts`, dms `contact-share-bridge.ts`): publish the real producer event via `Platform.create([producer, consumer])` and assert the consumer effect. This is the cheapest regression net for the group/individual/custom promise.
- Remove the direct table read in `packages/calendar/src/services/task-bridge.ts:123-131`: require `toStatusCategory`/`isTerminal` in the `task:status_changed` payload (tasks already sends it per `packages/tasks/docs/events.mdx:45`); drop the `task_status` fallback. Enforce with the existing anti-slop oxlint plugin (new rule: no cross-module table-name literals outside own `db-schemas/`).

### P0-2. Publish an owned entity-reference registry (replaces grep-coupling)

- Create `packages/contracts/` (or extend `packages/constants/`): `ENTITY_REF = { "masters:contact", "tasks:task", "calendar:event", "dms:file", ... }` as a const map with owner module + zod/valibot schema per ref, consumed by notes `scopeType`, calendar `targetType`, compliance `sourceModule`, comms `sourceModule`, workspace `item_type`, masters `filter_view.domain`.
- Rule: string registries (`scopeType`, `targetType`, `sourceModule`, `item_type`, `domain`, `grantee_type`) may only reference keys of this registry (lint-enforced). Adding a custom entity = adding one registry entry + one resolver, not editing five modules.
- This unblocks custom modules: a custom `crm:deal` becomes addressable by notes/calendar/comms/workspace without code changes in those modules.

### P1-1. One owner per concept (target map)

| Concept                   | Keep owner                                                                 | Change                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Contact / party directory | `masters.master_contact`                                                   | DMS drops its contact notion: `dmsShare.grantee_contact_id` becomes a soft ref resolved via registry; delete `contact-share-bridge` special-casing into a generic `onPartyRemoved` handler. HR employee keeps employment fields only; contact fields (phone/email/address) become refs to masters. Calendar attendee keeps `email` (invite path) but links `contactId` when known.                                                         |
| Org spine                 | `organization.branch` (tenant plane) + `management.tenant` (control plane) | Rename for clarity: `management` → `tenancy` (or `admin`); document Tenant (control-plane SaaS account) vs Organization-profile (per-tenant rich profile) vs `master_entity` (business counterparty: customer/vendor/…) in one page. `master_entity.organization_id` and HR `branchId` become registry refs to `organization:branch`, not free strings.                                                                                    |
| Notify a user             | `comms`                                                                    | HR `announcement` becomes a producer-only shape (`announcement:published` payload) with **no inbox table** — comms fans out to `notification` rows. Tasks `watcher` and workspace `watch` both become rows in a single `comms.subscription` (or keep tables but implement via one `watch-service` in comms). Custom modules call `p.comms.notifications.notify()`, never write inbox tables directly.                                      |
| Remind (time-based nudge) | `calendar.calendar_reminder`                                               | Compliance deletes its reminder engine as a notifier: it publishes `compliance:document_expiring` facts; calendar materializes the reminder rows (same pattern as the existing task bridge). Workspace schedules (dashboard delivery) stay separate but rename to `workspace:delivery_schedule` to end the `schedule` vs `reminder` confusion. One dispatcher, one `reminder_due` event, one cron (`* * * * *`).                           |
| Saved views / dashboards  | `workspace`                                                                | Move `master_filter_view` workflows into workspace as domain `masters:*`; masters keeps only the `domain` data, not the view CRUD. DMS `file-view` schema becomes a workspace resolver (`registerViewResolver("dms:file", …)` — the pattern workspace already has in `runtime.ts`). `reports` stub becomes a thin query layer over workspace widgets (no new storage).                                                                     |
| Files / binaries          | `dms` (+ platform `StorageUnit`)                                           | Tasks `attachment` and compliance document attachments become `dms_file` refs (`fileId`) or a shared `attachment = {fileId \| storageKey}` value object with retention policy pointer. Legal hold / retention / versioning then apply uniformly.                                                                                                                                                                                           |
| Notes / drafts / comments | split by lifecycle                                                         | `notes.note` = quick-capture, no workflow state (keep). `workspace.draft` = approval-lifecycle content (keep) but rename to `workspace.document` or `workspace.draft` with explicit `approval` sub-resource; unify comments into one `comment{target_type,target_id}` shape (or keep per-module tables but share one valibot schema + access rule in `contracts/`). Document the rule: "no approval → notes; approval → workspace drafts". |
| Address / bank            | `masters`                                                                  | HR, comms channel/provider, management SP collapse their inline address/bank columns to `(entity_type, entity_id)` refs into masters. Keep masters card-masking invariant (no PAN/CVV/token refs) as the shared rule.                                                                                                                                                                                                                      |
| Labels / tags             | `masters` or new `taxonomy`                                                | Either scope `dms_label` globally via registry (`label{scope_type,scope_id}`) and delete `task_label_def`, or extract a tiny `taxonomy` module both use. Do not keep two `{name,color}` tables.                                                                                                                                                                                                                                            |
| Sharing                   | `dms`                                                                      | Merge `dms_share` + `dms_public_link` into one `grant{grantee                                                                                                                                                                                                                                                                                                                                                                              | token}`model (links are grants with`grantee_type=token`). One revoke path. |
| Secrets                   | platform                                                                   | Extract the duplicated `credentialRef` into a platform `Vault` helper (or `kvStore` namespaced API: `vault.set(scope,id,secret): credentialRef`): masters connections and comms channels/providers both use it; one rotation/audit path.                                                                                                                                                                                                   |

### P1-2. Slim the god-objects

- `masters`: after moving filter-views → workspace and entity-refs → registry, masters is contacts + addresses + bank/payment + entities + connections + UoMs. Consider splitting `connections` (integration credentials, kvStore-bound) into its own module — it has a different security/review profile from address-book data.
- `workspace`: split into `workspace-personal` (drafts, pins, recent, settings, watches) and `workspace-analytics` (dashboards, widgets, schedules, views) if either exceeds ~10 tables/workflows groups. At minimum, document the two halves and do not add further concerns to this package.
- `dms`: 16 workflow groups is the highest count — group into `files`, `organization` (folders/labels), `governance` (classes/holds/retention/trash), `sharing` (shares/links) facades without splitting the package.
- `hr-core`: keep the 3-package split (it is correct). Only fix the stale doc (`hr.md:3` `@aspen-os/hr` → three packages) and consider extracting `access` (RBAC: `hrUser/Role/Permission`) only if a non-HR consumer ever needs it. Do not split `lifecycle` out — `services/reconciliation.ts:132-146` (lifecycle→position) would become cross-package coupling.

### P1-3. Clarify the control-plane / tenant-plane split

- `management` (`$name="management"`, `packages/management/src/module.ts:45`) owns control-plane `tenant/serviceProvider` but is named like a domain module. Rename to `tenancy` (`$name="tenancy"`, package `@aspen-os/tenancy`) with a compat alias, and state: control-plane modules (`tenancy`, `comms_provider`) vs tenant-plane modules (everything else). Custom SaaS-admin modules then have a clear lane.
- Resolve the `organization` name collision (better-auth `organization` plugin vs `organization` module vs `master_entity`): rename the module concept to "Organization Profile" in docs and code comments (CONTEXT.md already leans this way), and keep `branch` as its sole aggregate.

### P2-1. Make单个/组合/自定义 (solo/grouped/custom) a tested property

- **Module manifest:** extend `Module` (`packages/platform/src/server/types.ts:49-75`) with `provides: string[]` (entity refs), `consumes?: string[]` (already `$consumes` — promote from introspection-only to validated), `capabilities?: Record<string, boolean>` (generalize calendar's `tasksEnabled` flag: `calendar/src/module.ts:44-48`).
- **Subset CI matrix:** for each module, run `Platform.create([mod])` + `Platform.create([mod, ...its bridges])` in typecheck/lint. Today only the full set is implicitly tested; dead edges prove subsets are not.
- **Example host:** add `examples/compose/` (not another stub): `Platform.create([organization, tasks, calendar])`, `Platform.create([dms])`, `Platform.create([comms, hr-core])` smoke tests. This is the missing proof that "group, individual, or custom" works.
- **Custom-module checklist:** fix `write-module/SKILL.md` step 2 (root `tsconfig.json` references + `docs/source.config.ts`) to also require: registry entry, event topic registration (`domain:event` in `pubsub.ts`), ACL resource, `$consumes` declaration, and a solo-boot test. Fix `constants` split (P1) so authors know where enums live; unify the build lane (all modules build to `.output/` or all raw — end the two-lane `CODING_CONVENTIONS.md` gotcha).

### P2-2. Deduplicate infra (platform helpers, not per-module copies)

- `scheduleCron({topic, cron, handler})` helper on `PubSubUnit` (or a `Scheduler` util): one register/unregister path, one place for cron constants, idempotent `$prepareRuntime`/`$cleanup`. Replaces 7 copy-pasted trios.
- `notifyOn(topic, mapper)` bridge helper in comms: compliance/calendar/dms/hr bridges become declarative rows, not bespoke services.
- `auditWrite(ctx, entityType, entityId, action, before/after)` helper with a `contracts/` entity-type union — replaces bare-string `ctx.audit.write` calls and makes the activity-feed projection (DMS `Activity Feed`, compliance `Audit Entry`) uniform.
- `vault` wrapper over `kvStore` (see P1-1 table). `attachFile({file|storageKey})` value object over `StorageUnit` (see P1-1 table).

---

## 4. Suggested phasing

1. **Week 1 (P0):** fix 3 dead event edges; add `$consumes` validator + `healthCheck.unconsumedSubscriptions`; remove `task_status` direct read; add 4 bridge contract tests.
2. **Week 2 (P1-registry):** ship `contracts/` entity registry + lint rule; migrate notes/calendar/compliance/comms/workspace/dms string refs to it (no table changes yet).
3. **Weeks 3–4 (P1-owners):** notifications → comms; reminders → calendar (+ rename workspace schedules); filter-views → workspace; attachments → DMS refs; address/bank → masters refs. Each is a behind-flag migration with a data backfill (`*_id` soft-ref columns, no FK per repo convention).
4. **Week 5 (P2):** manifest + subset CI + `examples/compose/` + `tenancy` rename (compat alias) + platform scheduler/vault/audit helpers; fix `hr.md` + `constants` split + build-lane unification.

## 5. What NOT to do

- Do not split `hr-core` further (lifecycle↔position reconciliation is intra-package; the 3-package split already matches deploy boundaries).
- Do not merge `calendar` into `tasks` or `comms` into `workspace` — the dispatcher (calendar), inbox/outbox (comms), and work-tracking (tasks) lifecycles differ; unify via bridges, not merges.
- Do not add DB-level FKs to enforce the new refs — repo convention is soft FKs (see `CODING_CONVENTIONS.md` §Database); enforce via registry + contract tests instead.
- Do not create a `notifications` package or `comms:deliver` topic (explicitly retired per `AGENTS.md`); extend `comms`.
- Do not create a `drive` package or parallel file model (retired into `dms`); extend `dms`.

---

## Appendix — key evidence pointers

- All `$dependencies = []`: `packages/{calendar,comms,compliance,dms,masters,notes,organization,management,tasks,workspace}/src/module.ts`, `packages/hr-{core,attendance,leave}/src/module.ts`.
- Dead edges: compliance `module.ts:38-45` + `services/event-bridge.ts:71-102` vs `hr-core/src/pubsub.ts:6,39-47` vs `organization/src/pubsub.ts:3-6`; comms `module.ts:49-50` + `services/event-bridge.ts:159-164` vs `management/src/pubsub.ts:4-11`.
- Direct table read: `packages/calendar/src/services/task-bridge.ts:123-131`.
- Contact/share bridge: `packages/dms/src/services/contact-share-bridge.ts:14-17,49-53`.
- Reminder/dispatcher/sweeper loops: `calendar/src/services/reminder-dispatcher.ts`, `compliance/src/services/reminder-engine.ts`, `comms/src/services/delivery-worker.ts`, `dms/src/services/expiry-scanner.ts`, `workspace/src/services/schedule-service.ts`.
- Vault duplication: `masters/src/services/connection-service.ts:5` vs `comms/src/services/credential-service.ts:11-92`.
- Registry sprawl: `notes/README.md:7`, `masters/docs/workflows.mdx:161`, `calendar/src/utils/constants.ts:25-31`, `compliance/src/services/event-bridge.ts:196-413`, `comms/src/services/event-bridge.ts:193-323`, `workspace/src/utils/constants.ts:45-103`.
- Module contract + lifecycle: `packages/platform/src/server/types.ts:49-75`, `packages/platform/src/server/base-platform.ts:98-171,222`.
- Custom path: `.agents/skills/write-module/SKILL.md`, `packages/platform/docs/custom-module.mdx`, stubs `packages/{crm,fleet,inventory,reports}/src/index.ts` (0 bytes).
