# HR Module — Announcements (Scope of Work)

> Scope of Work for the **Announcements** capability of the `@aspen-os/hr` module. Implements internal communications so HR can announce/notify **all or a subset of HR users** (employees and HR users) in the organization.

> **Status — as of August 2026:** **Complete.** All four phases executed, gated green, and recorded below.

## Overview

The Announcements capability gives the HR module a first-class channel for broadcasting internal communications — policy updates, office closures, event invites, onboarding reminders, and acknowledgable notices. Announcements are authored by HR users, targeted at the whole organization or a specific audience (branch, department, designation, employee group, HR role, or named employees/users), and delivered into the **in-app inbox owned by `@aspen-os/comms`**, with optional acknowledgement tracking.

The capability is implemented **inside the existing `@aspen-os/hr` module** — no new package. It follows the module's established patterns: one table file per sub-domain group under `db-schemas/` (not one per entity), per-action workflow files under `workflows/announcement/` composed into the `workflows/index.ts` router (the REST-style folder layout — `workflows/<group>/<entity>/<verb>.ts` — not the older flat `announcement.*.ts` layout), valibot `Create*Schema`/`Update*Schema`/`*FiltersSchema` in `schemas/`, ACL entries in `auth.ts`, event groups in `pubsub.ts`, and scheduled-job constants in `utils/constants.ts`. The `Hr` class exposes a new `announcement` workflow group (`p.hr.announcement.create()`) alongside the existing 8 groups (`access`, `attendance`, `employee`, `leave`, `lifecycle`, `overtime`, `setup`, `shift`).

Announcements are **tenant-scoped operational data** — `hr_announcement` and `hr_announcement_recipient` live in tenant schemas (per ADR-0008 and the module's existing 36-table tenant split). Audience resolution references control-plane tables (`department`, `designation`, `hr_role`, `hr_permission`, `hr_user`) and tenant tables (`employee`, `employee_group`, `employee_group_member`) by soft FK only — no DB-level foreign key constraints (repo convention).

**Delivery is `@aspen-os/comms`'s job, not this capability's.** comms is the single notification/inbox and out-of-band delivery surface (bounded-contexts/comms.md). Its event bridge already subscribes to `announcement:published` (`packages/comms/src/services/event-bridge.ts:108`), materializing one `comms_notification` per recipient (`sourceModule: "hr"`, `sourceEntity.type: "announcement"`, `type: "announcement"`). This SOW produces the announcement and the recipient snapshot; the inbox, read receipts, and out-of-band delivery all belong to comms. The earlier draft's "future Notification unit" seam is obsolete — it is the live comms module, and its consumer contract for `announcement:published` is the integration seam this SOW must satisfy.

**Lineage**: derived from the HR SOW list in `.working-docs/todo/.md` (announcements); cross-referenced by `sow/hr-organization-structure.md` §8 (positions become a first-class audience type once that capability lands). The term **Announcement** is new to the HR ubiquitous language — it will be defined in `domain-model/hr.md` and `bounded-contexts/hr.md` (not a collision; "Notification" stays a comms term).

---

## Confirmed Decisions

| #   | Decision                          | Outcome                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Inbox ownership                   | ✅ Done — `p.comms.notifications` (`comms_notification`) is the inbox. hr builds **no** second inbox — `getInbox`/`markRead`/`markUnread`/`dismiss` are not part of this capability.                                                                                                                                                                                                               |
| 2   | Recipient table role              | ✅ Done — `hr_announcement_recipient` is a **delivery snapshot**: audit of who was notified, delivery totals, and ack correlation. It does not carry read state.                                                                                                                                                                                                                                   |
| 3   | Read / acknowledgement state      | ✅ Done — Lives on `comms_notification` (`status` unread/read/dismissed, `readAt`). hr emits no `announcement:read` event — comms already publishes `comms:notification_read`.                                                                                                                                                                                                                     |
| 4   | `announcement:published` contract | ✅ Done — Payload pinned to comms' `AnnouncementPublishedEventSchema`: `{ announcement: { id, title }, recipientUserIds: string[] }`. `recipientUserIds` are **auth user IDs** (`hr_user.userId`, resolved via the Auth unit) — **not** `hr_user.id`.                                                                                                                                              |
| 5   | Employee-only recipients          | ✅ Done — Employees with no linked HR user (no auth user) get a snapshot row but no comms notification; `recipientUserIds` contains only recipients with an auth user.                                                                                                                                                                                                                             |
| 6   | Permission actions                | ✅ Done — `publish` and `archive` are added to `PERMISSION_ACTION` and `permissionActionEnum("hr_permission_action")`; `HR_PERMISSION_MODULE` gains `ANNOUNCEMENT: "announcement"`.                                                                                                                                                                                                                |
| 7   | Priority vs comms severity        | ✅ Done — Announcement `priority` (`normal`/`important`/`urgent`) matches `NOTIFICATION_SEVERITY` in `@aspen-os/constants` and is authorable + filterable. Severity propagation stays hr-authoring-only: the `announcement:published` payload is pinned to comms' schema (no priority field), so comms would need to read `hr_announcement` to propagate — deferred (Open Decision 2 alternative). |
| 8   | Pinning                           | ✅ Done — `isPinned` orders **hr-side announcement lists** first (then `createdAt` desc); pin/unpin workflows record `pinnedBy`. The comms inbox has no pinned concept (severity → `createdAt` ordering).                                                                                                                                                                                          |

---

## 1. Announcement

The core record describing a single broadcast.

| Field                       | Type                   | Description                                                             |
| --------------------------- | ---------------------- | ----------------------------------------------------------------------- |
| **ID**                      | text (auto)            | System-generated unique identifier (UUID v7).                           |
| **Title**                   | text                   | Short headline (e.g., `Diwali Office Closure`).                         |
| **Body**                    | text                   | Full message content (supports line breaks / plain markdown).           |
| **Author**                  | text                   | HR user ID who created the announcement.                                |
| **Channel**                 | enum                   | `general` (all), `hr` (HR users only), or `custom` (explicit audience). |
| **Audience**                | jsonb                  | Audience definition — see §2. `null` when `channel = "general"`.        |
| **Status**                  | enum                   | `draft`, `scheduled`, `published`, `archived`.                          |
| **Priority**                | enum                   | `normal`, `important`, `urgent` (mirrors `NOTIFICATION_SEVERITY`).      |
| **Require Acknowledgement** | boolean                | If `true`, acknowledgement is tracked (via comms read receipts).        |
| **Scheduled For**           | timestamptz (nullable) | Publish time for `scheduled` announcements.                             |
| **Published At**            | timestamptz (nullable) | When the announcement was actually published.                           |
| **Archived At**             | timestamptz (nullable) | When the announcement was archived.                                     |
| **Is Pinned**               | boolean                | Pinned announcements surface first in HR-side announcement lists.       |
| **Pinned By**               | text (nullable)        | HR user who pinned/unpinned.                                            |
| **Created At**              | timestamptz            | Record creation timestamp.                                              |
| **Updated At**              | timestamptz            | Last modification timestamp.                                            |

**Operations**:

- `create(input)` — create in `draft` status; `input` may include `channel`, `audience`, and `scheduleAt` to publish directly or schedule.
- `update(id, patch)` — edit title/body/audience/schedule. Only `draft`/`scheduled` announcements are editable; `published` is immutable except pin/archive.
- `delete(id)` — hard-delete a `draft`/`scheduled` announcement (never a `published` one).
- `publish(id)` — transition `draft`/`scheduled` → `published`. Resolves the audience, materializes recipient snapshot rows (§3), sets `publishedAt`, publishes `announcement:published` (§11) with the comms contract.
- `schedule(id, scheduledAt)` — transition `draft` → `scheduled`. A scheduled job (see §4) publishes due announcements.
- `cancelSchedule(id)` — `scheduled` → `draft`; clears `scheduledFor`.
- `archive(id)` — `published` → `archived`; hides from HR-side lists.
- `restore(id)` — `archived` → `published`.
- `pin(id)` / `unpin(id)` — toggle `isPinned`.
- `getById(id)` — fetch with resolved audience summary and delivery stats.
- `list(filters?)` — filter by status, channel, author, priority, date range, pinned-only.

**Constraints**:

- Only `draft` and `scheduled` announcements can be edited or deleted.
- `published` announcements are immutable — corrections go through a new announcement or a re-publish.
- Publish is idempotent — re-publishing a `published` announcement is a no-op and does not re-emit `announcement:published`.
- Scheduling requires `scheduledFor` in the future.
- `requireAcknowledgement = true` implies the announcement is not editable after publishing.
- Archive/restore do **not** retract already-delivered comms notifications — comms notifications are immutable by design (out of scope to recall).

---

## 2. Audience Targeting

Announcements reach the whole organization or a resolvable subset. The **audience** is a JSON structure on the announcement record:

```jsonc
{
  "type": "all" | "hr_users" | "employees" | "branches" | "departments" |
          "designations" | "groups" | "roles" | "individuals",
  "ids": ["..."]   // branch/department/designation/group/role/employee/hrUser IDs; omitted for "all"
}
```

| Audience Type  | Resolves To                                                                              | Reference                 |
| -------------- | ---------------------------------------------------------------------------------------- | ------------------------- |
| `all`          | Every active employee (and their linked HR user, if any).                                | `employee`                |
| `hr_users`     | Every active HR user (`hr_user`).                                                        | `hr_user`                 |
| `employees`    | Named employees.                                                                         | `employee.id`             |
| `branches`     | Employees whose `branch` matches.                                                        | `employee.branch`         |
| `departments`  | Employees whose `department` matches — **including descendants** in the department tree. | `department`              |
| `designations` | Employees whose `designation` matches.                                                   | `designation`             |
| `groups`       | Members of the named employee groups.                                                    | `employee_group_member`   |
| `roles`        | HR users holding the named HR roles (any branch scope).                                  | `hr_role`, `hr_user_role` |
| `individuals`  | Named HR users directly.                                                                 | `hr_user.id`              |

**Recipient resolution** (`resolveRecipients(audience)`): a single deterministic query/fetch that returns a distinct set of `(hrUserId?, employeeId?, userId?)` recipients — `userId` is the linked **auth user ID** (`hr_user.userId`) for recipients that have an HR user, and is what feeds `recipientUserIds` in the `announcement:published` event. Used at publish time to materialize the recipient snapshot and to build the event payload.

**Constraints**:

- `ids` are required for every type except `all`; unknown IDs fail validation at create time for `employees`, `groups`, `roles`, `individuals` (strong refs) and are ignored at publish time for `branches`, `departments`, `designations` (weak refs — audience drifts as employees move).
- Combined audiences (e.g., two departments) are supported by passing multiple IDs of one type. Cross-type unions are modeled as separate announcements.
- `departments` resolution includes the department subtree (children of children), matching the existing `department.parentDepartment` tree semantics (`wouldCreateCircular`/`validateParentDepartment` in `workflows/utils.ts`).
- Audience is resolved **at publish time and snapshotted to recipients** — later employee/group changes do not retroactively alter who already received an announcement.
- `recipientUserIds` (auth users) is a subset of the snapshot — employees without an HR user are recorded in the snapshot only.

---

## 3. Delivery Snapshot, Inbox & Read Receipts

Per-user delivery is recorded at publish time; the inbox and read receipts live in comms.

| Field               | Type                     | Description                                                                            |
| ------------------- | ------------------------ | -------------------------------------------------------------------------------------- |
| **ID**              | text (auto)              | System-generated unique identifier (UUID v7).                                          |
| **Announcement ID** | text (FK, soft)          | Owning announcement.                                                                   |
| **Employee ID**     | text (soft FK, nullable) | Target employee; one of `employeeId`/`hrUserId` is set.                                |
| **HR User ID**      | text (soft FK, nullable) | Target HR user; one of `employeeId`/`hrUserId` is set.                                 |
| **User ID**         | text (nullable)          | Auth user ID (`hr_user.userId`) for recipients with an HR user; comms correlation key. |
| **Created At**      | timestamptz              | Delivery record creation timestamp.                                                    |

**Operations**:

- `listRecipients(announcementId, filters?)` — paginated delivery snapshot (HR-facing).
- `getStats(announcementId)` — `{ totalRecipients, deliveredUserCount, employeeOnlyCount }` from the snapshot; read/acknowledgement counts come from comms notifications (`sourceModule: "hr"`, `sourceEntity.type: "announcement"`) — see Open Decisions.

**Inbox & read receipts (owned by comms)**: recipients see the announcement through `p.comms.notifications.getInbox` / `markRead` / `markUnread` / `dismiss` / `unreadCount`; the notification rows carry `title`, `severity`, `sourceModule: "hr"`, `sourceEntity: { id: announcementId, type: "announcement" }`. Acknowledgement of a `requireAcknowledgement` announcement is exactly a read comms notification. hr does **not** build inbox, read, or unread surfaces.

---

## 4. Scheduled Publishing

Delivering `scheduled` announcements is a **PubSub cron job** on the existing control-plane boss, following the module's `DAILY_ATTENDANCE_SYNC` / `DAILY_LEAVE_ACCRUAL` pattern (`utils/constants.ts`, `$prepareRuntime()`/`$cleanup()` in `module.ts`):

- New scheduled job key `ANNOUNCEMENT_SCHEDULER` → `SCHEDULED_JOBS.ANNOUNCEMENT_SCHEDULER = "hr:announcement-scheduler"`, `CRON_SCHEDULES.ANNOUNCEMENT_SCHEDULER = "* * * * *"` (the module's first minute-cadence cron; the two existing crons are daily — and comms' `message-sweeper` also runs `* * * * *`).
- Registered in `$prepareRuntime()` via `pubsub.schedule(...)` and unregistered in `$cleanup()`.
- Job query: select `scheduled` announcements where `scheduledFor <= now()`, publish each through the same path as manual publish, and emit `announcement:published` with the identical contract.

---

## 5. Search & Filters

- `listAnnouncements` filters: `status`, `channel`, `author`, `priority`, `isPinned`, `fromDate`, `toDate`, `q` (title/body substring).
- Inbox filters live on `p.comms.notifications.getInbox` (`unreadOnly`, `type`, `severity`, date range) — not in hr.
- Pagination and ordering follow existing HR `list*` workflow conventions.

---

## 6. Data Model Summary

| Schema | Table                       | Purpose                                                           |
| ------ | --------------------------- | ----------------------------------------------------------------- |
| tenant | `hr_announcement`           | Announcement record (audience, status, scheduling, pinning).      |
| tenant | `hr_announcement_recipient` | Delivery snapshot — audit + delivery totals; read state is comms. |

The `audience` lives as `jsonb` on the announcement — no separate target table. Both tables are added to `tenant_schemas` in `db-schemas/index.ts`, keeping announcements in the tenant DB alongside the employees they reference (ADR-0008).

---

## 7. Dependencies & Prerequisites

| Dependency                                                                | Reason                                                                                                                                                          |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Employee master**                                                       | Audience resolution (`all`, `employees`, `branches`, `departments`, `designations`, `groups`) targets the `employee` table.                                     |
| **HR users & access**                                                     | Authors and `hr_users`/`roles` audiences come from the `access` group tables (`hr_user`, `hr_role`, `hr_user_role`); `hr_user.userId` feeds `recipientUserIds`. |
| **Employee groups**                                                       | `groups` audience joins `employee_group_member`.                                                                                                                |
| **Department tree**                                                       | `departments` audience walks `department.parent_department` descendants.                                                                                        |
| **PubSub Unit**                                                           | `announcement-scheduler` cron job (same boss as the existing HR crons).                                                                                         |
| **`@aspen-os/comms`** (live)                                              | The inbox + read receipts + out-of-band delivery surface; its event bridge already consumes `announcement:published`.                                           |
| **Organization Structure** (`sow/hr-organization-structure.md`, separate) | Optional: positions become a first-class audience type once the `position` entity exists (currently not implemented).                                           |

---

## 8. Cross-Module Integrations

| Integration           | Flow                                                                                                                                                                                                     |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HR `access`**       | Authors write via the `announcement` ACL resource; author display name resolved from `hr_user`/`employee`; `hr_user.userId` maps recipients to auth users.                                               |
| **HR `employee`**     | Recipients, `employees`/`branches`/`departments`/`designations`/`groups` audiences.                                                                                                                      |
| **HR `setup`**        | `department`, `designation` weak refs in audience definitions; department-subtree walk.                                                                                                                  |
| **`@aspen-os/comms`** | **Primary consumer.** `announcement:published` → event bridge → one `comms_notification` per auth-user recipient (`sourceModule "hr"`, `sourceEntity.type "announcement"`); inbox + read tracking there. |
| **PubSub**            | `announcement:*` events (§11) for UI refresh.                                                                                                                                                            |
| **Platform Auth**     | `getContext().actorId` author identity; per-request ACL enforcement via `defineAcl`; auth-user lookup for recipient resolution.                                                                          |

---

## 9. RBAC Model

### ACL Additions (`packages/hr/src/auth.ts`)

Add one resource to the existing `defineAcl` call:

```ts
announcement: ["archive", "create", "delete", "publish", "read", "update"],
```

### Roles

| Role                    | Access                                                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **HR Admin**            | Full lifecycle — create, edit, schedule, publish, archive, delete, pin, view stats.                                   |
| **HR Manager / HR Ops** | Create, edit, schedule, publish, archive; view stats and recipients; cannot delete.                                   |
| **Employee / HR user**  | No `announcement` ACL — they read in the comms inbox (gated by comms' `notification` resource) and mark read/dismiss. |

Seeds register `module = "announcement"` permissions (`create`, `read`, `update`, `delete`, `publish`, `archive`) via the existing `hr_permission`/`hr_role_permission` tables. This requires (a) `HR_PERMISSION_MODULE.ANNOUNCEMENT = "announcement"` in `utils/constants.ts`, and (b) `publish`/`archive` added to `PERMISSION_ACTION` and `permissionActionEnum("hr_permission_action")` — the enum today only allows `approve`/`create`/`delete`/`manage`/`reject`/`update`/`view`.

---

## 10. Out of Scope

- **In-app inbox & read receipts** — owned by `@aspen-os/comms`; hr produces `announcement:published` only and never reads/writes inbox state itself.
- **Out-of-band delivery** (email, push, SMS) — delivered by comms from `announcement:published`; no channel logic in hr.
- **Comments / reactions** on announcements.
- **Approval workflow** for announcements (a "draft → review → publish" gate can be layered later on top of `status`).
- **Expiry / auto-archive** after a retention window.
- **Read-receipt enforcement** (blocking work until acknowledged) — receipts are informational only.
- **Recipient opt-out / notification preferences** — comms preferences already cover per-channel opt-outs.
- **Cross-tenant broadcasting** — announcements never cross tenant boundaries.
- **Recalling/retracting delivered notifications** on archive — comms notifications are immutable once materialized.

---

## 11. Implementation Notes

### Module Structure (additions to `packages/hr`)

```
packages/hr/src/
├── db-schemas/
│   ├── announcement.ts        # hr_announcement + hr_announcement_recipient
│   └── index.ts               # + both tables in tenant_schemas; enums (status, channel, priority) in enums.ts
├── schemas/
│   ├── announcement.ts        # CreateAnnouncementSchema, UpdateAnnouncementSchema, AnnouncementFiltersSchema,
│   │                          #   audience enums/valibot schemas (InferOutput types)
│   └── index.ts               # + re-export announcement schemas/types
├── workflows/
│   ├── announcement/create.ts
│   ├── announcement/update.ts
│   ├── announcement/delete.ts
│   ├── announcement/publish.ts
│   ├── announcement/schedule.ts
│   ├── announcement/cancel-schedule.ts
│   ├── announcement/archive.ts
│   ├── announcement/restore.ts
│   ├── announcement/pin.ts
│   ├── announcement/unpin.ts
│   ├── announcement/by-id/get.ts
│   ├── announcement/recipients/list.ts
│   ├── announcement/stats/get.ts
│   ├── announcements/list.ts
│   └── index.ts                  # workflow router
├── utils/
│   ├── announcement-utils.ts  # resolveRecipients() — audience → (hrUserId?, employeeId?, userId?)
│   └── constants.ts           # + SCHEDULED_JOBS.ANNOUNCEMENT_SCHEDULER, CRON_SCHEDULES.ANNOUNCEMENT_SCHEDULER,
│                              #   HR_PERMISSION_MODULE.ANNOUNCEMENT, PERMISSION_ACTION + publish/archive
├── auth.ts                    # + announcement ACL resource
├── pubsub.ts                  # + ANNOUNCEMENT_EVENTS + AnnouncementEventMap (merged into HrEventMap) + events map
├── types.ts                   # + re-export announcement schemas/types
└── module.ts                  # + readonly announcement = { ... } workflow group; $prepareRuntime()/$cleanup()
                               #   schedule/unschedule ANNOUNCEMENT_SCHEDULER
```

Workflow names follow the house pattern (`Workflow.name("hr.announcement.create")`, matching `hr.leave.create-leave-application`). Domain-doc updates land in the final phase: `domain-model/hr.md` (9th sub-domain "Announcement", new invariant numbering), `bounded-contexts/hr.md` (new group, events, ACL resource, cron, comms cross-context row), and `packages/hr/docs/*.mdx` via the `write-docs` skill.

### Domain Events

| Event                    | Payload                                                       | Trigger                                                                                                                          |
| ------------------------ | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `announcement:created`   | `{ announcement: { id, title, channel, status } }`            | Announcement created.                                                                                                            |
| `announcement:updated`   | `{ announcement: { id }, changes }`                           | Draft/scheduled announcement edited.                                                                                             |
| `announcement:scheduled` | `{ announcementId, scheduledFor }`                            | Announcement scheduled.                                                                                                          |
| `announcement:published` | `{ announcement: { id, title }, recipientUserIds: string[] }` | Published (manual or cron). **Shape pinned to comms' `AnnouncementPublishedEventSchema`**; `recipientUserIds` are auth user IDs. |
| `announcement:archived`  | `{ announcementId }`                                          | Announcement archived/restored.                                                                                                  |
| `announcement:pinned`    | `{ announcementId, pinnedBy, isPinned }`                      | Announcement pinned/unpinned.                                                                                                    |

No `announcement:read` event — read state is comms' (`comms:notification_read` already exists there).

> **PubSub pitfall**: `announcement:published` is consumed by comms' event bridge when comms is installed; if the host runs hr without comms, the topic is producer-only and publishing **silently drops** (pg-boss). Wiring tests must assert the topic is subscribed when comms is present.

### Phase Sequencing

**Phase 1 — Authoring & publishing** ✅ **Complete** (gate green: package + root `check:lint`/`check:types`): tables + enums, announcement CRUD + delete, status model (draft/published/archive), general + custom audiences, manual publish with recipient snapshot materialization, `announcement:published` emitting the comms contract; verified the payload validates against comms' `AnnouncementPublishedEventSchema` (end-to-end inbox run deferred — no host app in repo).

**Phase 2 — Scheduling & delivery stats** ✅ **Complete** (gate green: package + root `check:lint`/`check:types`): `hr:announcement-scheduler` (`* * * * *`) scheduled/unscheduled in `$prepareRuntime()`/`$cleanup()` following the existing HR cron pattern, `schedule`/`cancel-schedule`, `listRecipients`, `getStats` (delivery totals from the snapshot; read/acknowledgement counts read from `comms_notification` rows via `@aspen-os/comms` — Open Decision 1 default), and `create(scheduleAt)` support. The publish-due handler is a host obligation (same as the existing daily crons).

**Phase 3 — Targeting depth & polish** ✅ **Complete** (gate green: package + root `check:lint`/`check:types`): `hr_users`/`roles`/`groups` audiences + strong-ref validation, department-subtree resolution (`expandDepartmentIds` walks `parentDepartment` descendants), pin/unpin workflows + pinned-first list ordering, priority filter, and search/filters (`q`, `isPinned`, `fromDate`, `toDate`, `priority`).

**Phase 4 — Documentation** ✅ **Complete** (gate green: docs `check:types` — fumadocs-mdx + tsc): `domain-model/hr.md` (10th sub-domain "Announcement", new invariants 7–9, event/table/command counts updated), `bounded-contexts/hr.md` (announcement group, `AnnouncementEventMap`, 12th ACL resource, `hr:announcement-scheduler` cron row, comms cross-context row, language), and `packages/hr/docs/*.mdx` (`overview`, `workflows` — `AnnouncementWorkflow` section, `enums`, `index`) via the `write-docs` skill.

### Estimated Effort (Relative)

| Area                        | Complexity | Notes                                                                                                                 |
| --------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------- |
| Announcement CRUD           | Low        | Standard lifecycle with status transitions.                                                                           |
| Audience model + resolver   | Medium     | Nine target types; subtree walk for departments; strong vs weak refs; auth-user mapping for `recipientUserIds`.       |
| Recipient snapshot          | Low        | Snapshot insert at publish time; event payload derivation.                                                            |
| Delivery stats + comms read | Medium     | Delivery totals in hr; acknowledgement counts from comms notifications (directed cross-module read — Open Decisions). |
| Scheduled publishing        | Low        | Minute cron following the existing HR job pattern.                                                                    |
| comms integration           | Low        | Consumer already wired in the event bridge; pin payload + verify.                                                     |
| RBAC                        | Low        | One ACL resource + `HR_PERMISSION_MODULE`/`permissionActionEnum` extensions + seeds.                                  |

### Testing Focus Areas

- **Audience resolution**: each of the nine target types; department-subtree inclusion; unknown/weak IDs; distinctness of combined IDs; `userId` populated only where an HR user exists.
- **Status transitions**: draft→published→archived, schedule→cancel, immutability of published, idempotent publish (no duplicate event).
- **Scheduler**: cron publishes due announcements exactly once; `scheduledFor` in the future stays `scheduled`.
- **Event contract**: `announcement:published` payload validates against comms' `AnnouncementPublishedEventSchema`; `recipientUserIds` are auth user IDs; snapshot count = `deliveredUserCount` + `employeeOnlyCount`.
- **comms integration**: one `comms_notification` per auth-user recipient with `sourceModule: "hr"`, `sourceEntity.type: "announcement"`; `markRead` reflects in acknowledgement stats.
- **PubSub**: topic consumed when comms present (no silent drop).
- **RBAC**: permission seeds respect the extended `hr_permission_action` enum.

---

## Open Decisions

1. **Acknowledgement stats source** — _Recommended:_ hr's `getStats` computes delivery totals from its own snapshot and reads read/acknowledgement counts from `comms_notification` rows (`sourceModule: "hr"`, `sourceEntity.type: "announcement"`) — a narrow, directed cross-module read for stats only. _Alternative:_ comms exposes a count-by-status aggregate and hr delegates entirely; or the host app composes stats from both surfaces.
2. **Priority → severity propagation** — _Recommended:_ extend comms' `handleAnnouncementPublished` (event-bridge) to read announcement `priority` and set notification `severity`; today it notifies with default severity, so priority currently does not affect inbox ordering. _Alternative:_ leave `priority` as an hr-authoring-only field.
3. **Pinning** — _Recommended:_ `isPinned` orders hr-side announcement lists only; the comms inbox ordering stays severity → `createdAt`. _Alternative:_ add a pinned flag to `comms_notification` (deferred unless an inbox need appears).
4. **`channel = "general"` recipients without an HR user** — _Recommended:_ accept and document — they exist in the delivery snapshot but can never reach the comms inbox (no auth user). _Alternative:_ require HR users for all employees before announcement delivery (a data-quality gate, out of scope).

---

## Deployment Notes

- `hr_announcement` and `hr_announcement_recipient` are **new tenant tables** — `pushSchema` (ADR-0004) creates them; no columns are dropped or renamed, so no host `DROP`/mapping burden.
- `announcement:published` needs a subscriber: comms' event bridge subscribes when comms is installed (comms is a live package, not optional design). A host that runs hr without comms will **silently drop** publishes — install comms or accept the drop.
- The `announcement-scheduler` cron is registered/`unregistered` by `$prepareRuntime()`/`$cleanup()` like the existing HR crons — no host action.
- Domain-doc churn is additive (new sub-domain, new events, new ACL resource); `bounded-contexts/comms.md` needs no change (its `announcement:published` row is already listed as "hr, planned").
