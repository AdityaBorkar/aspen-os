# Calendar Context

> Package: `@aspen-os/calendar`. Calendars, events, attendees, + platform single polymorphic reminder surface. Stateful — gets `{ db, pubsub }` via `$initialize(units)`, registers reminder-dispatcher cron + task bridge in `$prepareRuntime()`, unregisters in `$cleanup()`. **No module deps.**

## Relationship Type

Downstream of Platform (Customer–Supplier). Runtime-wired. **No module deps** — `$dependencies = []`. Task bridge consumes `task:*` events via PubSub (compliance EventBridge pattern): subscribes `task:due_date_changed` / `task:deleted` / `task:status_changed`, materializes/cancels task reminders (`targetType = task`). No direct cross-module calls.

## Structure (`packages/calendar/`)

- `Calendar.create(config?)` — factory → Module instance; `$config: Required<CalendarModuleConfig>` (1 setting: `reminderScanCron` default `* * * * *`)
- `$name = "calendar"`, `$dependencies = []`
- 4 workflow groups as `readonly` props: `calendars`, `events`, `attendees`, `reminders`
- 5 services: `access-service` (personal/global scoping + reminder recipient scoping), `event-service` (window/source validation + access-scoped query), `recurrence` (`expandOccurrences` + `computeNextOccurrence`), `reminder-dispatcher` (cron register/unregister), `task-bridge` (task event subscriptions)
- 5 reusable `WorkflowStep`s: `fetch-calendar`, `fetch-event`, `fetch-event-calendar`, `fetch-attendee`, `fetch-reminder`
- 4 tables (all `tenant_schemas`, `calendar_` prefix): `calendar_calendar`, `calendar_event`, `calendar_attendee`, `calendar_reminder`
- 8 pgEnums: `calendar_access`, `calendar_event_status`, `calendar_recurrence_frequency`, `calendar_reminder_target`, `calendar_reminder_type`, `calendar_reminder_channel`, `calendar_attendee_type`, `calendar_attendee_status`
- 14 events across 4 maps (`CALENDAR_EVENTS` 3, `EVENT_EVENTS` 4, `ATTENDEE_EVENTS` 3, `REMINDER_EVENTS` 4) → `CalendarModuleEventMap`
- 4 ACL resources: `calendar`, `event`, `attendee`, `reminder`
- `$prepareRuntime()` — `registerReminderDispatcher()` registers fixed module cron `calendar:reminder-scan` (`* * * * *`), handler runs `processPendingReminders`; `registerTaskBridge()` subscribes 3 `task:*` topics; `$cleanup()` unregisters both
- Module-scope config in `runtime.ts` (`setCalendarConfig`/`getCalendarConfig`)
- Build step (build script + `build` field in package.json), root `tsconfig.json` reference, `docs/source.config.ts` entry

## Exposed on the platform instance

```
p.calendar.calendars  { create, delete, get, list, setDefault, update }
p.calendar.events     { cancel, create, delete, get, getOccurrences, list,
                        listOccurrences, update }
p.calendar.attendees  { add, get, list, remove, update }
p.calendar.reminders  { create, delete, get, getPending, list, processPending, update }
```

Workflows one file per action under `workflows/<entity>/<verb>.ts` (e.g. `event/get-occurrences.ts`, `reminder/process-pending.ts`).

## Cross-context integration

- **Tasks** = **source** of task reminders: task bridge subscribes `task:due_date_changed` (materialize due-date bundle per recipient), `task:deleted` (delete all task reminders), `task:status_changed` (suppress pending reminders on completion/cancellation).
- **Reminder dispatcher** replaces old host-driven `p.tasks.reminders.processPending` — module registers own cron, no host cron needed. Hosts subscribe `calendar:reminder_due` (+ `calendar:event_*`/`attendee_*` if they surface calendar notifications).
- Workspace treats `calendar:event` (and `calendar:reminder`) as documented built-in view domains — docs-level only, no code coupling.

## Language

- Calendar, Event, Occurrence, Event Recurrence, Attendee, Reminder, Reminder Dispatcher, Task Bridge, CalendarModuleConfig
- **Avoid**: "Calendar" for tasks' `savedViewTypeEnum` value `calendar` (render mode, unrelated); "Reminder Engine" (compliance's document-expiry scanner, out of scope); "Schedule" (workspace's dashboard-delivery cron, out of scope)
