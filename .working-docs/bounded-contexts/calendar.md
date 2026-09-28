# Calendar Context

> Package: `@aspen-os/calendar`. Events, attendees, + platform single polymorphic reminder surface. Single shared calendar — scope per item via `(audience_type, audience_id)`. Stateful — gets `{ db, pubsub }` via `$initialize(units)`, registers reminder-dispatcher cron + task/compliance/healthcare bridges in `$prepareRuntime()`, unregisters in `$cleanup()`. **No module deps.**

## Relationship Type

Downstream of Platform (Customer–Supplier). Runtime-wired. **No module deps** — `$dependencies = []`. Task bridge consumes `task.*` events via PubSub (compliance EventBridge pattern): subscribes `task.due_date_changed` / `task.deleted` / `task.status_changed`, materializes/cancels task reminders (`targetType = task`). No direct cross-module calls.

## Structure (`packages/calendar/`)

- `Calendar.create(config?)` — factory → Module instance; `$config: Required<CalendarModuleConfig>` (`reminderScanCron` default `* * * * *`, plus `tasksEnabled`/`complianceEnabled`/`healthcareEnabled` bridge toggles)
- `$name = "calendar"`, `$dependencies = []`, `$consumes` 10 (3 task + 4 compliance + 3 healthcare)
- 3 workflow groups as `readonly` props: `events`, `attendees`, `reminders`
- 4 services: `reminder-dispatcher` (cron register/unregister), `task-bridge` (3 `task.*` subscriptions), `compliance-bridge` (4 `compliance.document_*` subscriptions), `healthcare-bridge` (3 `healthcare.*` subscriptions) + `access-service`/`event-service`/`recurrence` helpers
- 3 tables (all `tenant_schemas`, `calendar_` prefix): `calendar_event`, `calendar_attendee`, `calendar_reminder` — events + reminders carry `(audience_type, audience_id)`, default `organization`
- 7 pgEnums: `calendar_audience_type`, `calendar_event_status`, `calendar_reminder_target`, `calendar_reminder_type`, `calendar_reminder_channel` (pubsub only), `calendar_attendee_type`, `calendar_attendee_status`
- 11 events across 3 maps (`EVENT_EVENTS` 4, `ATTENDEE_EVENTS` 3, `REMINDER_EVENTS` 4) → `CalendarModuleEventMap`
- 3 ACL resources: `event`, `attendee`, `reminder`
- `$prepareRuntime()` — `registerReminderDispatcher()` registers fixed module cron `calendar.reminder-scan` (`* * * * *`), handler runs `processPendingReminders`; bridges subscribe conditionally; `$cleanup()` unregisters all four
- Module-scope config in `runtime.ts` (`setCalendarConfig`/`getCalendarConfig`)
- Build step (build script + `build` field in package.json), root `tsconfig.json` reference, `docs/source.config.ts` entry

## Exposed on the platform instance

```
p.calendar.events     { cancel, create, delete, get, getOccurrences, list,
                        listOccurrences, update }
p.calendar.attendees  { add, get, list, remove, update }
p.calendar.reminders  { create, delete, get, getPending, list, processPending, update }
```

Workflows one file per action under `workflows/<entity>/<verb>.ts` (e.g. `event/get-occurrences.ts`, `reminder/process-pending.ts`).

## Cross-context integration

- **Tasks** = **source** of task reminders: task bridge subscribes `task.due_date_changed` (materialize due-date bundle per recipient), `task.deleted` (delete all task reminders), `task.status_changed` (suppress pending reminders on completion/cancellation).
- **Reminder dispatcher** replaces old host-driven `p.tasks.reminders.processPending` — module registers own cron, no host cron needed. Hosts subscribe `calendar.reminder_due` (+ `calendar.event_*`/`attendee_*` if they surface calendar notifications).
- Workspace treats `calendar:event` (and `calendar:reminder`) as documented built-in view domains — docs-level only, no code coupling.

## Language

- Calendar, Audience (`organization`/`group`/`user` per-item scope), Event, Occurrence, Event Recurrence, Attendee, Reminder, Reminder Dispatcher, Task Bridge, Compliance Bridge, Healthcare Bridge, CalendarModuleConfig
- **Avoid**: "Calendar" for tasks' `savedViewTypeEnum` value `calendar` (render mode, unrelated); second reminder surface (calendar owns the single reminder surface — compliance expiry nudges are calendar reminders); "Schedule" (workspace's dashboard-delivery cron, out of scope); `p.calendar.calendars` / `isDefault` / `setDefault` (removed with the collection table)
