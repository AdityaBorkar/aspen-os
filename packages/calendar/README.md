# `@aspen-os/calendar`

Domain module for Aspen OS framework owning three time-domain surfaces: **calendars** (named, colored collections w/ `personal`/`global` access), **events** (time-boxed entries w/ structured recurrence, attendees, timezone, polymorphic source link), **reminders** (platform single polymorphic reminder surface — `calendar_reminder` rows w/ `targetType` `event`/`task`/`note`/`file`/`custom`).

> Task reminders live here as `targetType = task` rows. Module's **task bridge** subscribes `task:due_date_changed` / `task:deleted` / `task:status_changed` (published by `@aspen-os/tasks`), materializes/cancels task due-date reminders — event-driven, no cross-module calls.

## Module

```ts
import { Calendar } from "@aspen-os/calendar";

const calendar = Calendar.create({
  reminderScanCron: "* * * * *",
});
```

- `$name = "calendar"`, `$dependencies = []` — stateful (`$initialize({ db, pubsub })`; `$prepareRuntime()` registers `calendar:reminder-scan` cron + task bridge; `$cleanup()` unregisters)
- 4 workflow groups: `calendars`, `events`, `attendees`, `reminders`
- 4 tenant tables (`calendar_` prefix) + 8 pgEnums; 14 domain events; 4 ACL resources

## Surface

```
p.calendar.calendars  { create, delete, get, list, setDefault, update }
p.calendar.events     { cancel, create, delete, get, getOccurrences, list,
                        listOccurrences, update }
p.calendar.attendees  { add, get, list, remove, update }
p.calendar.reminders  { create, delete, get, getPending, list, processPending, update }
```

## Reminders

- `processPending` publishes `calendar:reminder_due` (full payload), marks `isSent`/`sentAt`, schedules next occurrence for recurring reminders. Module registers own cron — no host cron needed.
- Hosts must `subscribe()` to `calendar:reminder_due` (pg-boss silently drops unsubscribed topics; health check flags them).

## Documentation

Full reference docs in `packages/calendar/docs/`, domain record in `.working-docs/domain-model/calendar.md` / `.working-docs/bounded-contexts/calendar.md`. Design record: `.working-docs/sow/calendar.md`.
