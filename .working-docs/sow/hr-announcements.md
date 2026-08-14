# HR Module — Announcements (Scope of Work)

> Scope of Work for the **Announcements** capability of the `@aspen-os/hr` module. Implements internal communications so HR can announce/notify **all or a subset of HR users** (employees and HR users) in the organization.

## Overview

The Announcements capability gives the HR module a first-class channel for broadcasting internal communications — policy updates, office closures, event invites, onboarding reminders, and acknowledgable notices. Announcements are authored by HR users, targeted at the whole organization or a specific audience (branch, department, designation, employee group, HR role, or named employees/users), and delivered through an in-app inbox with optional acknowledgement tracking.

The capability is implemented **inside the existing `@aspen-os/hr` module** — no new package. It follows the module's established patterns: one table file per entity under `db-schemas/`, one workflow file per action under `workflows/announcement.*.ts` behind a `barrel-announcement.ts`, valibot `Create*Schema`/`Update*Schema`/`*FiltersSchema` in `schemas/`, ACL entries in `auth.ts`, and event groups in `pubsub.ts`. The `Hr` class exposes a new `announcement` workflow group (e.g. `p.hr.announcement.create()`).

Announcements are **tenant-scoped operational data** — all announcement tables live in tenant schemas (per ADR-0008 and the existing 36-table tenant split). Audience resolution references control-plane tables (`department`, `designation`, `hr_role`) and tenant tables (`employee`, `employee_group`, `hr_user`) by soft FK only — no DB-level foreign key constraints (repo convention).

---

## 1. Announcement

The core record describing a single broadcast.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier (UUID v7). |
| **Title** | text | Short headline (e.g., `Diwali Office Closure`). |
| **Body** | text | Full message content (supports line breaks / plain markdown). |
| **Author** | text | HR user ID who created the announcement. |
| **Channel** | enum | `general` (all), `hr` (HR users only), or `custom` (explicit audience). |
| **Audience** | jsonb | Audience definition — see §2. `null` when `channel = "general"`. |
| **Status** | enum | `draft`, `scheduled`, `published`, `archived`. |
| **Priority** | enum | `normal`, `important`, `urgent`. |
| **Require Acknowledgement** | boolean | If `true`, recipients must acknowledge (read receipt); stats tracked. |
| **Scheduled For** | timestamptz (nullable) | Publish time for `scheduled` announcements. |
| **Published At** | timestamptz (nullable) | When the announcement was actually published. |
| **Archived At** | timestamptz (nullable) | When the announcement was archived. |
| **Is Pinned** | boolean | Pinned announcements surface at the top of the inbox. |
| **Pinned By** | text (nullable) | HR user who pinned/unpinned. |
| **Created At** | timestamptz | Record creation timestamp. |
| **Updated At** | timestamptz | Last modification timestamp. |

**Operations**:
- `create(input)` — create in `draft` status; `input` may include `channel`, `audience`, and `scheduleAt` to publish directly or schedule.
- `update(id, patch)` — edit title/body/audience/schedule. Only `draft`/`scheduled` announcements are editable; `published` is immutable except pin/archive.
- `publish(id)` — transition `draft`/`scheduled` → `published`. Resolves the audience, materializes recipient rows (§4), sets `publishedAt`, publishes `announcement:published`.
- `schedule(id, scheduledAt)` — transition `draft` → `scheduled`. A scheduled job (see §6) publishes due announcements.
- `cancelSchedule(id)` — `scheduled` → `draft`; clears `scheduledFor`.
- `archive(id)` — `published` → `archived`; hides from inbox.
- `restore(id)` — `archived` → `published`.
- `pin(id)` / `unpin(id)` — toggle `isPinned`.
- `getById(id)` — fetch with resolved audience summary and stats.
- `list(filters?)` — filter by status, channel, author, priority, date range, pinned-only.

**Constraints**:
- Only `draft` and `scheduled` announcements can be edited or deleted.
- `published` announcements are immutable — corrections go through a new announcement or a re-publish.
- Publish is idempotent — re-publishing a `published` announcement is a no-op.
- Scheduling requires `scheduledFor` in the future.
- `requireAcknowledgement = true` implies the announcement is not editable after publishing.

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

| Audience Type | Resolves To | Reference |
|---|---|---|
| `all` | Every active employee (and their linked HR user, if any). | `employee` |
| `hr_users` | Every active HR user (`hr_user`). | `hr_user` |
| `employees` | Named employees. | `employee.id` |
| `branches` | Employees whose `branch` matches. | `employee.branch` |
| `departments` | Employees whose `department` matches — **including descendants** in the department tree. | `department` |
| `designations` | Employees whose `designation` matches. | `designation` |
| `groups` | Members of the named employee groups. | `employee_group_member` |
| `roles` | HR users holding the named HR roles (any branch scope). | `hr_role`, `hr_user_role` |
| `individuals` | Named HR users directly. | `hr_user.id` |

**Recipient resolution** (`resolveRecipients(audience)`): a single deterministic query/fetch that returns a distinct set of `(hrUserId?, employeeId?)` recipients. Used at publish time to materialize the recipient table and at inbox-read time to check membership dynamically.

**Constraints**:
- `ids` are required for every type except `all`; unknown IDs fail validation at create time for `employees`, `groups`, `roles`, `individuals` (strong refs) and are ignored at publish time for `branches`, `departments`, `designations` (weak refs — audience drifts as employees move).
- Combined audiences (e.g., two departments) are supported by passing multiple IDs of one type. Cross-type unions are modeled as separate announcements.
- `departments` resolution includes the department subtree (children of children), matching the department-tree semantics of the Organization Structure capability.
- Audience is resolved **at publish time and snapshot to recipients** — later employee/group changes do not retroactively alter who already received an announcement.

---

## 3. Inbox & Read Receipts

Per-user delivery and acknowledgement tracking.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier (UUID v7). |
| **Announcement ID** | text (FK, soft) | Owning announcement. |
| **Employee ID** | text (soft FK, nullable) | Target employee; one of `employeeId`/`hrUserId` is set. |
| **HR User ID** | text (soft FK, nullable) | Target HR user; one of `employeeId`/`hrUserId` is set. |
| **Read At** | timestamptz (nullable) | When the recipient marked it read / acknowledged. |
| **Read By** | text (nullable) | HR user ID that recorded the read. |
| **Created At** | timestamptz | Delivery record creation timestamp. |

**Operations**:
- `getInbox(hrUserId?, employeeId?, filters?)` — announcements targeted at the caller, ordered pinned → priority → `publishedAt` desc. Inbox membership can be resolved dynamically from the audience OR from materialized recipient rows (see note below).
- `markRead(announcementId, userId)` — upsert the read receipt; publishes `announcement:read`.
- `markUnread(announcementId, userId)` — clear the read receipt.
- `getStats(announcementId)` — `{ totalRecipients, readCount, unreadCount, acknowledgedPercentage }`.
- `listRecipients(announcementId, filters?)` — paginated recipients with read status (HR-facing).

**Note on materialized vs dynamic membership**: materializing recipients at publish time is preferred — it gives exact stats and an audit trail of who was notified. The inbox query joins the recipient table. Dynamic membership (re-resolving the audience) is only used for `channel = "general"` (implicit "everyone") or as a fallback when recipient rows are missing.

---

## 4. Scheduled Publishing

Delivering `scheduled` announcements is a **PubSub cron job** on the existing control-plane boss, matching the module's `DAILY_ATTENDANCE_SYNC` / `DAILY_LEAVE_ACCRUAL` pattern:

- New scheduled job key `ANNOUNCEMENT_SCHEDULER` → cron `hr:announcement-scheduler` running **every minute** (`* * * * *`).
- Registered in `$prepareRuntime()` via `pubsub.schedule(...)` and unregistered in `$cleanup()`.
- Job query: select `scheduled` announcements where `scheduledFor <= now()`, publish each, and emit `announcement:published`.

---

## 5. Search & Filters

- `listAnnouncements` filters: `status`, `channel`, `author`, `priority`, `isPinned`, `fromDate`, `toDate`, `q` (title/body substring).
- `getInbox` filters: `unreadOnly`, `acknowledgementPending`, `priority`, `channel`.
- Pagination and ordering follow existing HR `list*` workflow conventions.

---

## 6. Data Model Summary

| Schema | Table | Purpose |
|---|---|---|
| tenant | `hr_announcement` | Announcement record (audience, status, scheduling, pinning). |
| tenant | `hr_announcement_recipient` | Materialized per-user delivery + read receipt. |

The `audience` lives as `jsonb` on the announcement — no separate target table. The tenant placement keeps announcements inside the tenant DB alongside the employees they reference (ADR-0008).

---

## 7. Dependencies & Prerequisites

| Dependency | Reason |
|---|---|
| **Employee master** | Audience resolution (`all`, `employees`, `branches`, `departments`, `designations`, `groups`) targets the `employee` table. |
| **HR users & access** | Authors and `hr_users`/`roles` audiences come from the `access` group tables (`hr_user`, `hr_role`, `hr_user_role`). |
| **Employee groups** | `groups` audience joins `employee_group_member`. |
| **Department tree** | `departments` audience walks `department.parent_department` descendants. |
| **PubSub Unit** | `announcement-scheduler` cron job (same boss as the existing HR crons). |
| **Organization Structure** (see separate SoW) | Optional: positions become a first-class audience type once the `position` entity exists. |

---

## 8. Cross-Module Integrations

| Integration | Flow |
|---|---|
| **HR `access`** | Authors write via `announcement` ACL resource; author display name resolved from `hr_user`/`employee`. |
| **HR `employee`** | Recipients, `employees`/`branches`/`departments`/`designations`/`groups` audiences. |
| **HR `setup`** | `department`, `designation` weak refs in audience definitions. |
| **PubSub** | `announcement:*` events (§11) for UI refresh and optional downstream delivery (email/push via a future Notification unit). |
| **Platform Auth** | `getContext().actorId` author identity; per-request ACL enforcement via `defineAcl`. |
| **Notification unit** (future, out of scope) | Downstream consumers subscribe to `announcement:published` and deliver out-of-band channels. |

---

## 9. RBAC Model

### ACL Additions (`packages/hr/src/auth.ts`)

Add one resource to the existing `defineAcl` call:

```ts
announcement: ["archive", "create", "delete", "publish", "read", "update"],
```

### Roles

| Role | Access |
|---|---|
| **HR Admin** | Full lifecycle — create, edit, schedule, publish, archive, delete, pin, view stats. |
| **HR Manager / HR Ops** | Create, edit, schedule, publish, archive; view stats and recipients; cannot delete. |
| **Employee / HR user** | Read inbox, mark read/unread, acknowledge. No authoring. |

These map onto the module's existing role-permission tables (`hr_role`, `hr_permission`, `hr_role_permission`); seeds should register `module = "announcement"` permissions (`create`, `read`, `update`, `delete`, `publish`, `archive`) for the admin/system roles.

---

## 10. Out of Scope

- **Out-of-band delivery** (email, push, SMS) — no Notification unit exists yet; `announcement:published` events are the integration seam.
- **Comments / reactions** on announcements.
- **Approval workflow** for announcements (a "draft → review → publish" gate can be layered later on top of `status`).
- **Expiry / auto-archive** after a retention window.
- **Read-receipt enforcement** (blocking work until acknowledged) — receipts are informational only.
- **Recipient opt-out / notification preferences**.
- **Cross-tenant broadcasting** — announcements never cross tenant boundaries.

---

## 11. Implementation Notes

### Module Structure (additions to `packages/hr`)

```
packages/hr/src/
├── db-schemas/
│   ├── announcement.ts        # hr_announcement + hr_announcement_recipient
├── schemas/
│   └── announcement.ts        # CreateAnnouncementSchema, UpdateAnnouncementSchema,
│                              #   AnnouncementFiltersSchema, InboxFiltersSchema,
│                              #   audience enums/valibot schemas (InferOutput types)
├── workflows/
│   ├── announcement.create.ts
│   ├── announcement.update.ts
│   ├── announcement.publish.ts
│   ├── announcement.schedule.ts
│   ├── announcement.cancel-schedule.ts
│   ├── announcement.archive.ts
│   ├── announcement.restore.ts
│   ├── announcement.pin.ts
│   ├── announcement.unpin.ts
│   ├── announcement.get-by-id.ts
│   ├── announcement.list.ts
│   ├── announcement.get-inbox.ts
│   ├── announcement.mark-read.ts
│   ├── announcement.mark-unread.ts
│   ├── announcement.get-stats.ts
│   ├── announcement.list-recipients.ts
│   ├── announcement.resolve-recipients.ts   # audience → recipient resolution step
│   └── barrel-announcement.ts
├── utils/
│   ├── audience-resolver.ts   # resolveRecipients() — audience → (hrUserId?, employeeId?)
│   └── constants.ts           # + ANNOUNCEMENT_SCHEDULER / CRON_SCHEDULES.ANNOUNCEMENT_SCHEDULER
├── auth.ts                    # + announcement ACL resource
├── pubsub.ts                  # + AnnouncementEventMap + ANNOUNCEMENT_EVENTS
├── types.ts                   # + re-export announcement schemas/types
└── module.ts                  # + readonly announcement = { ... } workflow group
```

`Hr.$prepareRuntime()` / `$cleanup()` additionally schedule/unschedule the `ANNOUNCEMENT_SCHEDULER` cron.

### Domain Events

| Event | Payload | Trigger |
|---|---|---|
| `announcement:created` | `{ announcement: { id, title, channel, status } }` | Announcement created. |
| `announcement:updated` | `{ announcement: { id }, changes }` | Draft/scheduled announcement edited. |
| `announcement:scheduled` | `{ announcementId, scheduledFor }` | Announcement scheduled. |
| `announcement:published` | `{ announcement: { id, title, channel }, recipientUserIds: string[], recipientEmployeeIds: string[] }` | Announcement published (manual or cron). Downstream notification seam. |
| `announcement:archived` | `{ announcementId }` | Announcement archived/restored. |
| `announcement:read` | `{ announcementId, userId, readAt }` | Recipient marked read. |
| `announcement:pinned` | `{ announcementId, pinnedBy, isPinned }` | Announcement pinned/unpinned. |

> **PubSub pitfall**: `announcement:published` has only a producer unless a consumer subscribes. Per platform guidance, `publish()` must throw (not silently drop) when no queue row exists for the topic — flag this in the pubsub wiring tests.

### Phase Sequencing

**Phase 1 — Authoring & publishing**: announcement CRUD, status model (draft/published/archive), general + custom audiences, manual publish with recipient materialization.

**Phase 2 — Scheduling & inbox**: `announcement-scheduler` cron, scheduled/cancel-schedule, `getInbox`, read/unread receipts, stats.

**Phase 3 — Targeting depth & polish**: `hr_users`/`roles`/`groups` audiences, department-subtree resolution, pinning, priority flags, filters/search, recipient listing.

### Estimated Effort (Relative)

| Area | Complexity | Notes |
|---|---|---|
| Announcement CRUD | Low | Standard lifecycle with status transitions. |
| Audience model + resolver | Medium | Nine target types; subtree walk for departments; strong vs weak refs. |
| Recipient materialization | Low | Snapshot insert at publish time. |
| Read receipts + stats | Low | Upsert on recipient rows, aggregation query. |
| Scheduled publishing | Low | Minute cron following existing HR job pattern. |
| Inbox + filters | Medium | Membership join + pin/priority ordering. |
| RBAC | Low | One new ACL resource + permission seeds. |

### Testing Focus Areas

- **Audience resolution**: each of the nine target types; department-subtree inclusion; unknown/weak IDs; distinctness of combined IDs.
- **Status transitions**: draft→published→archived, schedule→cancel, immutability of published, idempotent publish.
- **Scheduler**: cron publishes due announcements exactly once; `scheduledFor` in the future stays `scheduled`.
- **Read receipts**: mark read/unread, stats accuracy, recipient pagination.
- **PubSub**: `announcement:published` payload correctness; producer-without-consumer throws (no silent drop).
- **Inbox**: pin/priority ordering, unread-only filter, recipient membership drift after publish.
