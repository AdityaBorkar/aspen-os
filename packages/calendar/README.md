# `@aspen-os/calendar`

A domain module for the Aspen OS framework owning the three time-domain surfaces: **calendars** (named, colored collections with `personal`/`global` access), **events** (time-boxed entries with structured recurrence, attendees, timezone, and a polymorphic source link), and **reminders** (the platform's single polymorphic reminder surface — `calendar_reminder` rows with `targetType` `event`/`task`/`note`/`file`/`custom`).

> Task reminders live here as `targetType = task` rows. The module's **task bridge** subscribes to `task:due_date_changed` / `task:deleted` / `task:status_changed` (published by `@aspen-os/tasks`) and materializes/cancels task due-date reminders — event-driven, no cross-module calls.

## Module

```ts
import { Calendar } from "@aspen-os/calendar";

const calendar = Calendar.create({
  reminderScanCron: "* * * * *",
});
```

- `$name = "calendar"`, `$dependencies = []` — stateful (`$initialize({ db, pubsub })`; `$prepareRuntime()` registers the `calendar:reminder-scan` cron + task bridge; `$cleanup()` unregisters)
- 4 workflow groups: `calendars`, `events`, `attendees`, `reminders`
- 4 tenant tables (`calendar_` prefix) + 8 pgEnums; 13 domain events; 4 ACL resources

## Surface

```
p.calendar.calendars  { create, delete, get, list, setDefault, update }
p.calendar.events     { cancel, create, delete, get, getOccurrences, list,
                        listOccurrences, update }
p.calendar.attendees  { add, get, list, remove, update }
p.calendar.reminders  { create, delete, get, getPending, list, processPending, update }
```

## Reminders

- `processPending` publishes `calendar:reminder_due` (full payload), marks `isSent`/`sentAt`, and schedules the next occurrence for recurring reminders. The module registers its own cron — no host cron needed.
- Hosts must `subscribe()` to `calendar:reminder_due` (pg-boss silently drops unsubscribed topics; the health check flags them).

## Documentation

Full reference docs live in `packages/calendar/docs/` and the domain record in `.working-docs/domain-model/calendar.md` / `.working-docs/bounded-contexts/calendar.md`. See `.working-docs/sow/calendar.md` for the design record.
