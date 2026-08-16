# `@aspen-os/calendar` Module — Calendars, Events & Reminders + Tasks Reminder Refactor (Scope of Work)

> Scope of Work to create a new `calendar` module owning the three time-domain surfaces — **calendars** (named, colored collections), **events** (time-boxed entries with recurrence, attendees, timezone, and a polymorphic source link), and **reminders** (the platform's single polymorphic reminder surface) — and to **refactor `@aspen-os/tasks` to stop owning task reminders**, driving task due-date/overdue reminders through `calendar_reminder` rows (`targetType = task`) via an event-driven task bridge.

> **Status — as of Aug 2026:** **Complete.** Phases 0–7 done. `@aspen-os/calendar` is implemented (calendars/events/attendees/reminders + dispatcher cron + task bridge), the tasks reminder surface was removed and its notification bridge wired, docs + domain records updated, and all gates green.

## Confirmed Decisions

| #   | Decision               | Outcome                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Module identity        | `@aspen-os/calendar`, module `$name = "calendar"` (proxy `p.calendar`), build-step package with a `build` config block, root `tsconfig.json` reference, `docs/source.config.ts` entry. `$dependencies = []`. **Stateful** (workspace schedule-service pattern): `$initialize({ db, pubsub })`; `$prepareRuntime()` registers the reminder dispatcher cron + the task bridge; `$cleanup()` unregisters. ✅ Done |
| 2   | Reminders are the home | `calendar_reminder` is **polymorphic** (`targetType`/`targetId`). The tasks `task_reminder` table and its reminder workflows/events are **removed**; task reminders become `targetType = task` rows owned by calendar. Compliance's document-expiry scans and workspace's dashboard-delivery crons are **not** touched. ✅ Done                                                                                |
| 3   | Task integration       | **Event-driven** (compliance EventBridge precedent). Tasks publishes `task:due_date_changed` / `task:deleted` / `task:status_changed`; a calendar-side `services/task-bridge.ts` materializes and cancels due-date reminders. No direct cross-module calls — both modules stay `$dependencies = []` (`$initialize` receives units, not modules). ✅ Done                                                       |
| 4   | Access model           | `calendar_access` enum `personal`/`global` (workspace vocabulary) on calendars. **Events, attendees, and reminders inherit their calendar's access** (no own access column). Reminders are additionally **recipient-scoped** via `userId`. ✅ Done                                                                                                                                                             |
| 5   | Recurrence             | Structured jsonb `{ frequency, interval, count?, until?, byDay? }` + a module-local expander (`services/recurrence.ts`); occurrences are **computed on read** (`getOccurrences`/`listOccurrences`), not materialized. No external iCalendar/RRULE dependency in v1. **No per-occurrence exceptions** in v1. ✅ Done                                                                                            |
| 6   | Reminder dispatcher    | One pg-boss cron topic `calendar:reminder-scan` (e.g. `* * * * *`), registered in `$prepareRuntime()`, running `reminders.processPending`. Replaces today's **host-driven** `p.tasks.reminders.processPending`. Publishes `calendar:reminder_due`, marks `isSent`/`sentAt`, schedules the next occurrence for recurring reminders. ✅ Done                                                                     |
| 7   | Event source links     | Events carry `sourceType`/`sourceEntityId` (documented `<module>:<entity>` registry, workspace `domain` convention) so tasks/compliance/notes/dms rows can surface as calendar entries without coupling. ✅ Done                                                                                                                                                                                               |
| 8   | Groups + ACL           | `p.calendar.{calendars, events, attendees, reminders}` — top-level groups, each its own ACL resource; reminder workflows live under `workflows/reminder/*`. ✅ Done                                                                                                                                                                                                                                            |
| 9   | Tables                 | 4 tenant tables: `calendar_calendar`, `calendar_event`, `calendar_attendee`, `calendar_reminder` (+ 8 pgEnums). `calendar_` prefix, `uuidv7` PKs, timestamptz, conventions per DOMAIN_MODEL.md. ✅ Done                                                                                                                                                                                                        |
| 10  | Module-local pgEnums   | `calendar_access`, `calendar_event_status`, `calendar_recurrence_frequency`, `calendar_reminder_target`, `calendar_reminder_type`, `calendar_reminder_channel`, `calendar_attendee_type`, `calendar_attendee_status`. No shared-enum promotion in v1. ✅ Done                                                                                                                                                  |
| 11  | Workspace integration  | Docs-level only: `calendar:event` (and `calendar:reminder`) become documented built-in view domains; calendar entities are linkable from workspace pins/recent. No code coupling. ✅ Done                                                                                                                                                                                                                      |
| 12  | Tasks event wiring     | Tasks' `services/notification-bridge.ts` is **dead code today** (no workflow calls it; only `reminder:fired` is ever published). The refactor wires task event publication into the task/comment/link/assign workflows (fixing the gap) and adds `task:due_date_changed`. ✅ Done                                                                                                                              |

---

## 1. Current State & Inventory

### 1.1 Reminders are fragmented across three modules

| Home                           | Mechanism                                                                                                   | Kind                                                 |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| tasks `task_reminder`          | table + 8 workflows (create/update/get/list/delete, due-date/create, overdue/create, pending/{get,process}) | user-facing, task-bound                              |
| compliance Reminder Engine     | cron scans over document `reminderDays`/`reminderChannel`                                                   | derived document-expiry reminders (**out of scope**) |
| workspace `workspace_schedule` | per-dashboard pg-boss crons delivering `workspace:schedule_due`                                             | dashboard delivery (**out of scope**)                |

Firing today is **host-driven**: `p.tasks.reminders.processPending` has no in-repo cron and the tasks module registers nothing in `$prepareRuntime()` — unless a host invokes it, task reminders never fire.

### 1.2 Tasks reminder surface (what the refactor removes)

- **Table** `task_reminder` (tenant schema): `interval`, `isRecurring`, `isSent`, `message`, `remindAt`, `taskId`, `type` (`reminder_type`: due_date/custom/overdue), `userId` + 4 indexes. **17 tables (6 control + 11 tenant) → 16 (6 + 10).**
- **Workflows** (`workflows/reminder/*`, 8 files): `create`/`update`/`get`/`list`/`delete`, `due-date/create` (inserts the 3-point bundle: due−1d, due−1h, at-due), `overdue/create`, `pending/get` + `pending/process` (publishes `reminder:fired`, sets `isSent`, inserts the next recurring occurrence).
- **Step** `workflow-steps/fetch-reminder.ts`; **schemas** `schemas/reminder.ts` (+ re-exports in `schemas/index.ts`/`types.ts`); **events** `REMINDER_EVENTS`/`ReminderFiredEvent`/`ReminderEventMap` in `pubsub.ts`; **bridge fn** `publishReminderFired` in `services/notification-bridge.ts`; **surface** the `reminders` group in `module.ts` (11 workflow groups → 10).
- Tasks `auth.ts` is an **empty** `defineAcl({})` — no reminder ACL to remove.
- Recurrence intervals in use: `daily` / `weekly` / `monthly` / `every_2_hours` (`computeNextOccurrence` in `pending/process.ts`).

### 1.3 Tasks event publication is dead code

`services/notification-bridge.ts` defines `publishTaskCreated/Updated/Deleted/StatusChanged/Assigned/Commented/Linked/Unlinked` but **no workflow calls any of them** (grep-verified). Only `reminder:fired` is published, from `pending/process.ts`. So `task:created` etc. are **never emitted today** — the refactor's bridge depends on actually wiring these (part of the work, not a regression).

### 1.4 Consumers & name collisions (grep-verified)

- `task_reminder` / `REMINDER_EVENTS` / `publishReminderFired` / `p.tasks.reminders` are referenced **only inside `packages/tasks`**. Clean for in-repo removal; host migration in §5.
- `calendar`, `event`, `reminder` names: tasks' `savedViewTypeEnum` uses `calendar` as a view-_type_ value (a render mode, unrelated); there are **no** `calendar_*` tables, `calendar:*` topics, `p.calendar` accessor, or `event` table anywhere. All calendar names are free.
- No in-repo subscriber to `task:*` topics — payload extension is low-risk.

---

## 2. Target Model

### 2.1 Tables (all `tenant_schemas`, `calendar_` prefix, `uuidv7` PKs, timestamptz `createdAt`/`updatedAt`)

**`calendar_calendar`**

| Column        | Type                    | Notes                                   |
| ------------- | ----------------------- | --------------------------------------- |
| `access`      | enum `calendar_access`  | `personal`/`global`, default `personal` |
| `color`       | text (nullable)         |                                         |
| `createdBy`   | text (notNull)          |                                         |
| `description` | text (nullable)         |                                         |
| `id`          | text PK `uuidv7`        |                                         |
| `isDefault`   | boolean default `false` | per `ownerId`                           |
| `name`        | text (notNull)          |                                         |
| `ownerId`     | text (notNull)          | soft FK → better-auth `user`            |
| `timezone`    | text (notNull)          | IANA tz, default `"UTC"`                |
| `updatedBy`   | text (nullable)         |                                         |

Indexes: `(ownerId)`, `(access)`.

**`calendar_event`**

| Column           | Type                         | Notes                                                                      |
| ---------------- | ---------------------------- | -------------------------------------------------------------------------- |
| `allDay`         | boolean default `false`      | all-day events store 00:00 in the calendar tz; `endsAt` exclusive next-day |
| `calendarId`     | text (notNull)               | soft FK → `calendar_calendar.id`; access inherited                         |
| `color`          | text (nullable)              | overrides calendar color                                                   |
| `createdBy`      | text (notNull)               |                                                                            |
| `description`    | text (nullable)              |                                                                            |
| `endsAt`         | timestamptz (nullable)       | required unless `allDay`                                                   |
| `id`             | text PK `uuidv7`             |                                                                            |
| `location`       | text (nullable)              |                                                                            |
| `recurrence`     | jsonb (nullable)             | `{ frequency, interval, count?, until?, byDay? }` (§2.3)                   |
| `sourceEntityId` | text (nullable)              |                                                                            |
| `sourceType`     | text (nullable)              | documented `<module>:<entity>` registry                                    |
| `startsAt`       | timestamptz (notNull)        |                                                                            |
| `status`         | enum `calendar_event_status` | `confirmed`/`tentative`/`cancelled`, default `confirmed`                   |
| `timezone`       | text (nullable)              | IANA; falls back to calendar tz                                            |
| `title`          | text (notNull)               |                                                                            |

Indexes: `(calendarId)`, `(startsAt)`, `(sourceType, sourceEntityId)`, `(status)`.

**`calendar_attendee`**

| Column         | Type                            | Notes                                                          |
| -------------- | ------------------------------- | -------------------------------------------------------------- |
| `attendeeId`   | text (nullable)                 | soft ref (user id or masters contact id)                       |
| `attendeeType` | enum `calendar_attendee_type`   | `user`/`contact`                                               |
| `email`        | text (notNull)                  |                                                                |
| `eventId`      | text (notNull)                  | soft FK → `calendar_event.id`                                  |
| `id`           | text PK `uuidv7`                |                                                                |
| `name`         | text (nullable)                 |                                                                |
| `optional`     | boolean default `false`         |                                                                |
| `status`       | enum `calendar_attendee_status` | `invited`/`accepted`/`declined`/`tentative`, default `invited` |

Indexes: `(eventId)`, `(email)`.

**`calendar_reminder`**

| Column          | Type                             | Notes                                                     |
| --------------- | -------------------------------- | --------------------------------------------------------- |
| `channel`       | enum `calendar_reminder_channel` | `pubsub` (the only real channel in v1)                    |
| `createdBy`     | text (notNull)                   |                                                           |
| `interval`      | text (nullable)                  | `daily`/`weekly`/`monthly`/`every_2_hours` (tasks parity) |
| `isRecurring`   | boolean default `false`          |                                                           |
| `isSent`        | boolean default `false`          |                                                           |
| `message`       | text (nullable)                  |                                                           |
| `offsetMinutes` | integer (nullable)               | for `type = offset`; anchor = target's start/due          |
| `remindAt`      | timestamptz (nullable)           | absolute; null only until an offset anchor resolves       |
| `sentAt`        | timestamptz (nullable)           |                                                           |
| `targetId`      | text (notNull)                   | soft ref; for `targetType = custom`, free-form or empty   |
| `targetType`    | enum `calendar_reminder_target`  | `event`/`task`/`note`/`file`/`custom`                     |
| `type`          | enum `calendar_reminder_type`    | `offset`/`custom`/`due_date`/`overdue`                    |
| `userId`        | text (notNull)                   | recipient (soft FK → user)                                |

Indexes: `(targetType, targetId)`, `(userId)`, `(isSent)`, `(remindAt)`.

**pgEnums** (`db-schemas/enums.ts`): `calendar_access`, `calendar_event_status`, `calendar_recurrence_frequency` (`daily`/`weekly`/`monthly`/`yearly`), `calendar_reminder_target`, `calendar_reminder_type`, `calendar_reminder_channel`, `calendar_attendee_type`, `calendar_attendee_status` (values per the tables above).

### 2.2 Module surface (`p.calendar.*`)

```
p.calendar.calendars  { create, delete, get, list, setDefault, update }
p.calendar.events     { cancel, create, delete, get, getOccurrences, list, listOccurrences, update }
p.calendar.attendees  { add, get, list, remove, update }
p.calendar.reminders  { create, delete, get, getPending, list, processPending, update }
```

- **Calendars** — CRUD + `setDefault` (clears `isDefault` on the owner's other calendars; the first calendar a user creates auto-defaults). All reads access-scoped (`access = 'global' OR ownerId = actorId` via `services/access-service.ts`); mutation = owner or tenant admin.
- **Events** — `create`/`update` enforce `startsAt < endsAt` (unless `allDay`); `recurrence` validated by schema (§2.3); `sourceType`/`sourceId` format-validated against the `<module>:<entity>` convention (not whitelisted). `cancel` soft-sets status `cancelled`. `update` **re-anchors** `type = offset` reminders on the event (`remindAt = startsAt − offsetMinutes`).
- **Occurrences** — `getOccurrences(id, { from, to, limit })` / `listOccurrences` expand recurrence via `services/recurrence.ts` (non-recurring → the single occurrence). No per-instance status divergence in v1 (no exceptions).
- **Attendees** — add/update/remove/list; `add` publishes `calendar:attendee_invited`; status transitions `invited → accepted/declined/tentative`.
- **Reminders** — polymorphic `create`: `custom`/`due_date`/`overdue` require `remindAt`; `offset` requires `offsetMinutes` and is resolved against the target's local anchor (event start — calendar-owned) or a caller-supplied `remindAt` (task anchors are the task bridge's job). `processPending` is the dispatcher body (§2.6/Phase 5).

### 2.3 Recurrence config (jsonb, valibot-validated)

`EventRecurrence = { frequency: "daily"|"weekly"|"monthly"|"yearly", interval: integer ≥ 1, count?: integer ≥ 1, until?: ISO date, byDay?: ("MO"|"TU"|"WE"|"TH"|"FR"|"SA"|"SU")[] }` — `count` and `until` are mutually exclusive; `byDay` is weekly-only. The expander generates occurrences within `[from, to]`, bounded by `count`/`until`; unbounded recurrences are capped by the query `limit`.

### 2.4 Events (`calendar:*`)

- **Calendars**: `calendar_created` / `calendar_updated` / `calendar_deleted`
- **Events**: `event_created` / `event_updated` / `event_cancelled` / `event_deleted`
- **Attendees**: `attendee_invited` / `attendee_updated` / `attendee_removed`
- **Reminders**: `reminder_created` / `reminder_updated` / `reminder_deleted` / `reminder_due`

Payloads typed via `EventMap`; topics published as plain strings (convention). `reminder_due` carries the **full reminder payload** (`{ reminder: { id, type, targetType, targetId, message, channel, userId, isRecurring }, remindAt }`) so hosts deliver without follow-up reads. `event_*` payloads carry `{ event: { id, title, startsAt, endsAt, calendarId }, sourceType?, sourceEntityId? }`.

### 2.5 ACL resources

```ts
defineAcl({
  calendar: ["create", "read", "update", "delete", "set_default"],
  event: ["cancel", "create", "read", "update", "delete"],
  attendee: ["create", "read", "update", "delete"],
  reminder: ["create", "process", "read", "update", "delete"],
});
```

Runtime visibility (`personal` vs `global`, recipient scoping) is **not** part of the ACL — enforced in workflow code via `services/access-service.ts` (dms/workspace split).

### 2.6 Tasks refactor target state

**Removed from tasks** (16 tables / 10 workflow groups / 10 events remain):

| Surface   | Files                                                                                                             |
| --------- | ----------------------------------------------------------------------------------------------------------------- |
| Table     | `db-schemas/reminder.ts`; `reminder` export in `db-schemas/index.ts`; `reminderTypeEnum` in `db-schemas/enums.ts` |
| Workflows | `workflows/reminder/` (8 files)                                                                                   |
| Step      | `workflow-steps/fetch-reminder.ts`                                                                                |
| Schemas   | `schemas/reminder.ts` + re-exports in `schemas/index.ts`/`types.ts`                                               |
| Events    | `REMINDER_EVENTS`, `ReminderFiredEvent`, `ReminderEventMap` in `pubsub.ts`                                        |
| Bridge fn | `publishReminderFired` in `services/notification-bridge.ts`                                                       |
| Surface   | `reminders` group in `module.ts`                                                                                  |

**Added / changed in tasks:**

1. `TaskCreatedEvent` payload gains `dueDate: string | null`.
2. New event `task:due_date_changed` — `{ taskId, dueDate: string | null, userIds: string[] }`, published by `createTask` (when `dueDate` set) and `updateTask` (when `dueDate` added/changed/cleared). `userIds` = assignees ∪ reporter (decision §4).
3. **Wire the dead bridge** — `createTask`/`updateTask`/`deleteTask`/`assignTask`/`unassignTask`/`createComment`/`createTaskLink`/`deleteTaskLink` and status-change paths call the existing notification-bridge publishers so `task:created`/`updated`/`deleted`/`status_changed`/`assigned`/`unassigned`/`commented`/`linked`/`unlinked` actually fire.
4. Tasks stays `$dependencies = []`, empty `$initialize()`, empty `auth.ts` ACL.

**Calendar task bridge (`services/task-bridge.ts`)** — registered in `$prepareRuntime()`, unregistered in `$cleanup()` (compliance EventBridge pattern):

| Subscribed topic        | Action                                                                                                                                                                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `task:due_date_changed` | Upsert the due-date reminder bundle per recipient: `remindAt = due−1d`, `due−1h`, `due` (all `type = due_date`, `targetType = task`, `targetId = taskId`); delete stale pending rows first. `dueDate = null` → delete pending task reminders. |
| `task:deleted`          | Delete all reminders with `targetType = task`, `targetId = taskId`.                                                                                                                                                                           |
| `task:status_changed`   | If `toStatus` resolves to a `completed`/`cancelled` category, delete pending task reminders (suppression on completion).                                                                                                                      |

Overdue behavior is folded into the at-due reminder (decision §4): the dispatcher fires it at due time regardless; hosts check task state on delivery.

---

## 3. Phases

### Phase 0 — ✅ Done Constants & Enums

1. `utils/constants.ts`: `CALENDAR_ACCESS`, `EVENT_STATUS`, `RECURRENCE_FREQUENCY`, `REMINDER_TARGET`, `REMINDER_TYPE`, `REMINDER_CHANNEL`, `ATTENDEE_TYPE`, `ATTENDEE_STATUS`, `REMINDER_INTERVAL`, plus `AUDIT_ACTION`/`AUDIT_ENTITY_TYPE` literals (`"calendar:calendar"`-style) for `ctx.audit.write(...)`.
2. `db-schemas/enums.ts`: the 8 pgEnums from §2.1 (values referencing the constant objects).
3. Re-run the §1.4 baseline greps — confirm `calendar_*`, `calendar:*`, `p.calendar` clean.
4. Gate: package `check:types` + `check:lint` (Phase 0 files land in the Phase 1 scaffold).

### Phase 1 — ✅ Done Scaffold `packages/calendar`

1. Load the `write-module` skill; scaffold `packages/calendar` on the workspace template (build step + `build` config block, stateful runtime).
2. Add to root `tsconfig.json` references and `docs/source.config.ts` (calendar docs source).
3. Implement the four tables, `db-schemas/index.ts` (all `tenant_schemas`, empty `control_plane_schemas`), `schemas/` (valibot `CreateCalendarSchema`/`UpdateCalendarSchema`, `CreateEventSchema`/`UpdateEventSchema` incl. `EventRecurrenceSchema`, `ReminderCreateSchema`/`UpdateReminderSchema`/`ReminderFiltersSchema`, `AttendeeCreateSchema`/`UpdateAttendeeSchema`), `auth.ts`, `pubsub.ts`, `types.ts`, `runtime.ts` (config singleton).
4. Gate: `bun install`; package `check:lint` + `check:types` + `build`.

### Phase 2 — ✅ Done Calendars

1. Workflows: `workflows/calendar/{create,update,get,list,delete,set-default}.ts`.
2. `services/access-service.ts` — `assertCanAccess(row, actorId)` (`global OR owner`) and `assertCanMutate(row, actorId)` (owner or tenant admin), used by all data groups.
3. `setDefault` clears prior default per owner; first created calendar auto-defaults.
4. Gate: package `check:lint` + `check:types`.

### Phase 3 — ✅ Done Events & recurrence

1. Workflows: `workflows/event/{create,update,get,list,delete,cancel}.ts`, `workflows/event/{get-occurrences,list-occurrences}.ts`.
2. `services/recurrence.ts` — `expandOccurrences(event, from, to, limit)` for daily/weekly/monthly/yearly with interval/count/until/byDay.
3. Validate `startsAt < endsAt` (all-day exempt); `sourceType`/`sourceId` format check; event `update` re-anchors `type = offset` reminders.
4. `.list()` filters: `calendarId`, `from`/`to` range, `status`, `sourceType`/`sourceEntityId`, `search` (title), access-scoped via the parent calendar.
5. Gate: package `check:lint` + `check:types`.

### Phase 4 — ✅ Done Attendees

1. Workflows: `workflows/attendee/{add,get,list,remove,update}.ts`.
2. `add` publishes `calendar:attendee_invited`; status transitions per §2.2.
3. Gate: package `check:lint` + `check:types`.

### Phase 5 — ✅ Done Reminders + dispatcher

1. Workflows: `workflows/reminder/{create,update,get,list,delete}.ts`, `workflows/reminder/{get-pending,process-pending}.ts`.
2. `create` rules per §2.2; `getPending` = `isSent = false AND remindAt <= now` (mirrors the current tasks `pending/get.ts`).
3. `services/reminder-dispatcher.ts` (workspace `schedule-service` pattern): `registerReminderDispatcher(deps)` registers the pg-boss cron `calendar:reminder-scan` (`* * * * *`) whose handler runs `processPendingReminders`; body = select pending, publish `calendar:reminder_due`, set `isSent`/`sentAt`, insert the next occurrence for `isRecurring` (reuse `computeNextOccurrence`, extended with yearly).
4. `module.ts`: `$initialize({ db, pubsub })` stores `#pubsub`/`#db`; `$prepareRuntime()` registers the dispatcher; `$cleanup()` unregisters.
5. Gate: package `check:lint` + `check:types`.

### Phase 6 — ✅ Done Tasks refactor (both sides)

1. **Tasks side**: remove the §2.6 surfaces. Add `dueDate` to `TaskCreatedEvent`; add `task:due_date_changed` to `pubsub.ts` + `TaskEventMap`; publish it from `createTask`/`updateTask`; wire the notification-bridge publishers into the task/comment/link/assign workflows.
2. **Calendar side**: `services/task-bridge.ts` — `registerTaskBridge(deps)` subscribes to `task:due_date_changed`/`task:deleted`/`task:status_changed`; `unregisterTaskBridge` in `$cleanup()`. Due-date bundle upsert per §2.6.
3. Gate: root `bun run check:lint` && `check:types`; `cd packages/tasks && check:lint && check:types`; `cd packages/calendar && check:lint && check:types && build`.

### Phase 7 — ✅ Done Documentation & Verification

1. Write `packages/calendar/docs/` (overview, workflows, access-control, events, db-schemas) via the `write-docs` skill.
2. `.working-docs/`: new `domain-model/calendar.md` + `bounded-contexts/calendar.md`; update `domain-model/tasks.md` + `bounded-contexts/tasks.md` (reminders → calendar, 17 → 16 tables, event table gains `task:due_date_changed`, drops `reminder:fired`); `BOUNDED_CONTEXTS.md` context-map table (Tasks row + new Calendar row); `CONTEXT.md` language entries (Calendar, Event, Occurrence, Reminder, Task Bridge — disambiguate from tasks' `calendar` view type and compliance's Reminder Engine); `AGENTS.md` (fully-implemented list, key dirs, current state).
3. Workspace docs: add `calendar:event` (and `calendar:reminder`) to the built-in view-domains registry in `packages/workspace/docs/`.
4. Docs build: `cd docs && bunx fumadocs-mdx` (if needed) then `check:types` + `build`.
5. **Sweep greps return clean**: inside `packages/tasks` — `task_reminder`, `reminder`, `REMINDER_EVENTS`, `reminderTypeEnum`, `fetchReminder`, `reminders` group, `publishReminderFired`; repo-wide — `calendar_*` tables, `calendar:*` topics, `p.calendar`, `reminder:fired`.
6. **Acceptance criteria**: calendar compiles/lints/builds; calendars CRUD + personal/global scoping; events create/list/get/update/cancel with recurrence expansion and offset-reminder re-anchoring; attendees invite/status; reminders create/list/process with the dispatcher publishing `calendar:reminder_due` on cron and marking sent + scheduling recurring next-occurrence; tasks no longer owns any reminder code; task due-date changes materialize calendar reminders via the bridge (with delete-on-task-delete and completion suppression).

## 4. Open Decisions (recommendation first)

- **Task integration home**: calendar-side `task-bridge.ts` subscribing to task events (**Recommended** — out-of-the-box, compliance precedent) vs host-app wiring (calendar stays pure; every host must rebuild it) vs tasks `$dependencies = ["calendar"]` direct calls (**not supported** — `$initialize` receives units, not modules).
- **Reminder dispatcher**: one periodic scan cron `calendar:reminder-scan` (**Recommended** — simple, batch, compliance precedent) vs per-reminder pg-boss cron topics (workspace schedule-service; precise delivery, more jobs).
- **Recipient set** for task due-date reminders: assignees ∪ reporter (**Recommended**) vs assignees only.
- **Recurrence**: structured jsonb + local expander (**Recommended**, no new deps) vs full iCalendar RRULE (external library) vs materialized occurrence instances.
- **Event exceptions/overrides**: v1 deferred (**Recommended** — edits edit the master) vs `calendar_event_exception` table.
- **`overdue` reminder type**: fold into the at-due reminder (**Recommended** — dispatcher fires it regardless; hosts check task state) vs the bridge creates `overdue` rows when a task passes due unresolved.
- **Access model**: `personal`/`global` enum (**Recommended**, workspace vocabulary) vs dms-style `isShared` boolean.
- **Reminder visibility**: recipient OR calendar access (**Recommended**) vs recipient-only.
- **All-day representation**: midnight in the calendar's IANA tz (**Recommended**) vs date-only text with host interpretation.
- **Default calendar**: auto-create + auto-default a personal calendar on first use (**Recommended**) vs require explicit create.

## 5. Deployment Notes (host app)

- `pushSchema` (ADR 0004) adds the four `calendar_*` tables and **never drops** `task_reminder`. The host must `DROP TABLE task_reminder` **after** migrating existing rows to `calendar_reminder` (`targetType = 'task'`, `targetId = task_id`, carry `type`/`remindAt`/`userId`/`isRecurring`/`interval`/`message`/`isSent`).
- Hosts must `subscribe()` to `calendar:reminder_due` (and `calendar:event_*`/`attendee_*` if they surface calendar notifications) — pg-boss **silently drops** unsubscribed topics and the health check flags them.
- `p.tasks.reminders.*` callers migrate to `p.calendar.reminders.*` (pass `targetType: "task"`). `reminder:fired` consumers switch to `calendar:reminder_due`.
- The reminder dispatcher cron is registered by the module in `$prepareRuntime()` — no host cron needed (replaces the previous host-driven `processPending`).

## 6. Effort Estimate (Relative)

| Area                                    | Complexity  | Notes                                                        |
| --------------------------------------- | ----------- | ------------------------------------------------------------ |
| Constants + enums + scaffold (4 tables) | Low         | Standard write-module scaffold                               |
| Calendars + access-service              | Low         | dms/workspace access pattern                                 |
| Events + recurrence expander            | **High**    | Recurrence math, validation, offset re-anchoring             |
| Attendees                               | Low–Medium  | Invite/status CRUD + events                                  |
| Reminders + dispatcher cron             | Medium–High | pg-boss cron + process loop (workspace/compliance precedent) |
| Tasks refactor (removal)                | Medium      | Delete surfaces + extend events + wire the dead bridge       |
| Task bridge                             | Medium      | Event subscription + due-date bundle upsert                  |
| Docs + verification                     | Medium      | New module docs + tasks docs updates + sweeps                |

## 7. Out of Scope

- **No compliance reminder-engine rework** — document expiry scans (`reminderDays`, `reminderChannel`) stay in compliance.
- **No workspace schedule rework** — `workspace_schedule` dashboard delivery stays as-is.
- **No iCalendar import/export, no full RRULE standard, no free/busy conflict engine, no timezone database** beyond IANA string storage.
- **No delivery channels** — the module publishes `calendar:reminder_due`; push/email/SMS delivery is a host/`comms` concern.
- **No event exceptions/overrides, no per-occurrence edits, no drag-drop/reschedule semantics** beyond `update`.
- **No attendance/RSVP workflows** beyond the attendee status enum.
- **No shared `ACCESS_SCOPE` promotion** — `calendar_access` stays module-local (workspace decision 8 precedent); revisit when a second consumer appears (the notes SOW defines its own in parallel).
