# `@aspen-os/calendar`

Domain module for Aspen OS framework owning two time-domain surfaces for a **single organization-wide calendar**: **events** (time-boxed entries w/ structured recurrence, attendees, timezone, polymorphic source link) and **reminders** (platform single polymorphic reminder surface — `calendar_reminder` rows w/ `targetType` `event`/`task`/`note`/`file`/`custom`).

Every event and reminder carries an **audience**: `organization`, `group` (an hr-core employee group), or `user`. There is no per-user calendar CRUD — the organization shares one calendar and scoping is expressed on each item.

> Task reminders live here as `targetType = task` rows. Module's **task bridge** subscribes `task.due_date_changed` / `task.deleted` / `task.status_changed` (published by `@aspen-os/tasks`), materializes/cancels task due-date reminders — event-driven, no cross-module calls.

## Module

```ts
import { Calendar } from "@aspen-os/calendar";

const calendar = Calendar.create({
  reminderScanCron: "* * * * *",
});
```

- `$name = "calendar"`, `$dependencies = []` — stateful (`$initialize({ db, pubsub })`; `$prepareRuntime()` registers `calendar.reminder-scan` cron + task bridge; `$cleanup()` unregisters)
- 3 workflow groups: `events`, `attendees`, `reminders`
- 3 tenant tables (`calendar_` prefix) + 7 pgEnums; 11 domain events; 3 ACL resources
- Audience resolution reads hr-core-owned tables (`employee_group_member`, `hr_user`) by raw SQL, best-effort — the module still runs without hr-core.

## Surface

```
p.calendar.events     { cancel, create, delete, get, getOccurrences, list,
                        listOccurrences, update }
p.calendar.attendees  { add, get, list, remove, update }
p.calendar.reminders  { create, delete, get, getPending, list, processPending, update }
```

## Reminders

- `processPending` resolves each reminder's audience to concrete user ids at dispatch time, publishes one `calendar.reminder_due` per recipient (full payload with `userId`), marks `isSent`/`sentAt`, and schedules the next occurrence for recurring reminders. Module registers own cron — no host cron needed.
- Hosts must `subscribe()` to `calendar.reminder_due` (pg-boss silently drops unsubscribed topics; health check flags them).

## Documentation

Full reference docs in `packages/calendar/docs/`, domain record in `.working-docs/domain-model/calendar.md` / `.working-docs/bounded-contexts/calendar.md`. Design record: `.working-docs/sow/calendar.md`.
