# Calendar Context

> Package: `@aspen-os/calendar`. Calendars, events, attendees, and the platform's single polymorphic reminder surface. Stateful — receives `{ db, pubsub }` via `$initialize(units)`, registers the reminder-dispatcher cron and the task bridge in `$prepareRuntime()`, unregisters in `$cleanup()`. **No module dependencies.**

## Relationship Type

Downstream of the Platform (Customer–Supplier). Runtime-wired. **No module deps** — `$dependencies = []`. The task bridge consumes `task:*` events via PubSub (compliance EventBridge pattern): it subscribes to `task:due_date_changed` / `task:deleted` / `task:status_changed` and materializes/cancels task reminders (`targetType = task`). No direct cross-module calls.

## Structure (`packages/calendar/`)

- `Calendar.create(config?)` — factory returning a Module instance; `$config: Required<CalendarModuleConfig>` (1 setting: `reminderScanCron` default `* * * * *`)
- `$name = "calendar"`, `$dependencies = []`
- 4 workflow groups exposed as `readonly` properties: `calendars`, `events`, `attendees`, `reminders`
- 5 services: `access-service` (personal/global scoping + reminder recipient scoping), `event-service` (window/source validation + access-scoped query), `recurrence` (`expandOccurrences` + `computeNextOccurrence`), `reminder-dispatcher` (cron register/unregister), `task-bridge` (task event subscriptions)
- 5 reusable `WorkflowStep`s: `fetch-calendar`, `fetch-event`, `fetch-event-calendar`, `fetch-attendee`, `fetch-reminder`
- 4 database tables (all `tenant_schemas`, `calendar_` prefix): `calendar_calendar`, `calendar_event`, `calendar_attendee`, `calendar_reminder`
- 8 pgEnums: `calendar_access`, `calendar_event_status`, `calendar_recurrence_frequency`, `calendar_reminder_target`, `calendar_reminder_type`, `calendar_reminder_channel`, `calendar_attendee_type`, `calendar_attendee_status`
- 13 domain events across 4 maps (`CALENDAR_EVENTS` 3, `EVENT_EVENTS` 4, `ATTENDEE_EVENTS` 3, `REMINDER_EVENTS` 4) → `CalendarModuleEventMap`
- 4 ACL resources: `calendar`, `event`, `attendee`, `reminder`
- `$prepareRuntime()` — `registerReminderDispatcher()` registers the fixed module cron `calendar:reminder-scan` (`* * * * *`) whose handler runs `processPendingReminders`; `registerTaskBridge()` subscribes to the three `task:*` topics; `$cleanup()` unregisters both
- Module-scope config in `runtime.ts` (`setCalendarConfig`/`getCalendarConfig`)
- Has a build step (build script + `build` field in package.json), root `tsconfig.json` reference, and a `docs/source.config.ts` entry

## Exposed on the platform instance

```
p.calendar.calendars  { create, delete, get, list, setDefault, update }
p.calendar.events     { cancel, create, delete, get, getOccurrences, list,
                        listOccurrences, update }
p.calendar.attendees  { add, get, list, remove, update }
p.calendar.reminders  { create, delete, get, getPending, list, processPending, update }
```

Workflows are one file per action under `workflows/<entity>/<verb>.ts` (e.g. `event/get-occurrences.ts`, `reminder/process-pending.ts`).

## Cross-context integration

- **Tasks** is a **source** of task reminders: the task bridge subscribes to `task:due_date_changed` (materialize the due-date bundle per recipient), `task:deleted` (delete all task reminders), and `task:status_changed` (suppress pending reminders on completion/cancellation).
- The **reminder dispatcher** replaces the previous host-driven `p.tasks.reminders.processPending` — the module registers its own cron, so no host cron is needed. Hosts must subscribe to `calendar:reminder_due` (and `calendar:event_*`/`attendee_*` if they surface calendar notifications).
- Workspace treats `calendar:event` (and `calendar:reminder`) as documented built-in view domains — docs-level only, no code coupling.

## Language

- Calendar, Event, Occurrence, Event Recurrence, Attendee, Reminder, Reminder Dispatcher, Task Bridge, CalendarModuleConfig
- **Avoid**: "Calendar" for tasks' `savedViewTypeEnum` value `calendar` (that's a render mode, unrelated); "Reminder Engine" (that's compliance's document-expiry scanner, out of scope); "Schedule" (that's workspace's dashboard-delivery cron, out of scope)
