# Calendar Domain Model

> Package: `@aspen-os/calendar`. Calendars, events, and reminders — the three time-domain surfaces. **Calendars** (named, colored collections), **events** (time-boxed entries with recurrence, attendees, timezone, and a polymorphic source link), and **reminders** (the platform's single polymorphic reminder surface). 4 tables — all tenant schemas with the `calendar_` prefix. Task reminders live here as `targetType = task` rows, driven by an event-driven task bridge.

## Entity-Relationship Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                       CALENDAR DOMAIN                                │
│                                                                      │
│  ┌──────────────────┐   1:N    ┌──────────────────────┐              │
│  │     Calendar     │─────────→│        Event         │              │
│  │ id               │          │ id                   │              │
│  │ name / color     │          │ calendarId (FK)      │              │
│  │ description      │          │ title / location     │              │
│  │ access (enum:    │          │ startsAt / endsAt    │              │
│  │  personal/global)│          │ allDay / timezone    │              │
│  │ ownerId          │          │ status (enum:        │              │
│  │ timezone         │          │  confirmed/tentative/│              │
│  │ isDefault        │          │  cancelled)          │              │
│  └────────┬─────────┘          │ recurrence (jsonb)   │              │
│           │                    │ sourceType/sourceId  │              │
│           │                    └──────────┬───────────┘              │
│           │                               │ 1:N                      │
│           │                               ▼                          │
│           │                    ┌──────────────────┐  ┌──────────────┐ │
│           │                    │    Attendee      │  │   Reminder   │ │
│           │                    │ id               │  │ id           │ │
│           │                    │ eventId (FK)     │  │ targetType   │ │
│           │                    │ email / name     │  │  (event/task/│ │
│           │                    │ attendeeId/Type  │  │  note/file/  │ │
│           │                    │ status (enum:    │  │  custom)     │ │
│           │                    │  invited/accepted│  │ targetId     │ │
│           │                    │  declined/       │  │ type (enum:  │ │
│           │                    │  tentative)      │  │  offset/     │ │
│           │                    └──────────────────┘  │  custom/     │ │
│           │                                          │  due_date/   │ │
│           │                                          │  overdue)    │ │
│           │                                          │ remindAt     │ │
│           │                                          │ userId       │ │
│           │                                          │ channel      │ │
│           │                                          │ isSent/      │ │
│           │                                          │ isRecurring  │ │
│           │                                          └──────────────┘ │
│           │                                                          │
│           │   Reminder.targetType ──▶ any module entity:            │
│           │     "task" → tasks task rows (task bridge)               │
│           │     "note" → notes note rows                             │
│           │     "file" → dms file rows                               │
│           │     "custom" → free-form                                 │
│           └──────────────────────────────────────────────────────────┘
└──────────────────────────────────────────────────────────────────────┘
```

## Aggregates

### Calendar (Aggregate Root)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)`)

**Invariants**:

- `isDefault` is unique per `ownerId` — `setDefault` clears the owner's other defaults; the first calendar a user creates auto-defaults
- Access is a user-set enum `personal` (owner-only) / `global` (org-wide within the tenant)

**Lifecycle commands** (via `p.calendar.calendars`): `create(input)`, `update(id, patch)`, `delete(id)` (cascades events/attendees/reminders), `get(id)`, `list(filters?)`, `setDefault(id)`.

**Relationships**: Has many `Event` (1:N). Deleting a calendar deletes its events, their attendees, and event-targeted reminders.

### Event (Aggregate Root)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)`)

**Value objects**:

- `EventRecurrence` — `{ frequency (daily/weekly/monthly/yearly), interval ≥ 1, count?, until?, byDay? }`; `count`/`until` mutually exclusive, `byDay` weekly-only
- `Occurrence` — a computed-on-read expansion (`id`, `eventId`, `startsAt`, `endsAt`, `title`, `location`, `status`, `calendarId`)

**Invariants**:

- `startsAt < endsAt` unless `allDay` (all-day stores 00:00 in the calendar tz; `endsAt` exclusive next-day)
- `sourceType` is a `<module>:<entity>` registry value; setting it requires `sourceEntityId`
- `status` transitions to `cancelled` are monotonic (soft cancel)

**Lifecycle commands** (via `p.calendar.events`): `create(input)`, `update(id, patch)`, `delete(id)`, `cancel(id)`, `get(id)`, `list(filters?)`, `getOccurrences(id, query?)`, `listOccurrences(filters?, query?)`.

**Relationships**: Belongs to `Calendar` (N:1, access inherited); has many `Attendee` (1:N); reminders reference the event via `targetType = 'event'`.

### Attendee (Supporting entity)

`{ eventId, email, name?, attendeeId?, attendeeType (user/contact), optional, status (invited/accepted/declined/tentative) }`. Soft-references a user or masters contact; carries a denormalized email/name snapshot. `add` publishes `calendar:attendee_invited`.

### Reminder (Supporting entity, polymorphic)

The platform's single reminder surface. `{ targetType (event/task/note/file/custom), targetId, type (offset/custom/due_date/overdue), channel (pubsub), remindAt, offsetMinutes?, userId (recipient), message?, isRecurring, interval?, isSent, sentAt? }`.

- `offset` reminders resolve `remindAt` from the target's anchor (event start) or a caller-supplied value
- `custom`/`due_date`/`overdue` require an explicit `remindAt`
- Task reminders (`targetType = task`) are materialized by the calendar-side **task bridge** from `task:due_date_changed`: three rows per recipient (due − 1d, due − 1h, due); deleted on `task:deleted` and on completion/cancellation
- The **reminder dispatcher** cron (`calendar:reminder-scan`) runs `processPending` — publishes `calendar:reminder_due` (full payload), marks `isSent`/`sentAt`, inserts the next occurrence for recurring reminders

## Domain Events — 13

| Event                       | Payload                                                                                             | Trigger                       |
| --------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------- |
| `calendar:calendar_created` | `{ calendar: { id, name, access, ownerId } }`                                                       | Calendar created              |
| `calendar:calendar_updated` | `{ calendar: { id, name, access, ownerId } }`                                                       | Calendar updated              |
| `calendar:calendar_deleted` | `{ calendarId }`                                                                                    | Calendar deleted              |
| `calendar:event_created`    | `{ calendarId, event: { id, title, startsAt, endsAt, calendarId }, sourceType?, sourceEntityId? }`  | Event created                 |
| `calendar:event_updated`    | `{ calendarId, event: { id, title, startsAt, endsAt, calendarId }, sourceType?, sourceEntityId? }`  | Event updated                 |
| `calendar:event_cancelled`  | `{ calendarId, event: { id, title, startsAt, endsAt, calendarId } }`                                | Event cancelled               |
| `calendar:event_deleted`    | `{ calendarId, eventId }`                                                                           | Event deleted                 |
| `calendar:attendee_invited` | `{ calendarId, eventId, attendee: { id, email, name, status } }`                                    | Attendee added                |
| `calendar:attendee_updated` | `{ calendarId, eventId, attendee: { id, email, name, status } }`                                    | Attendee updated              |
| `calendar:attendee_removed` | `{ calendarId, eventId, attendeeId }`                                                               | Attendee removed              |
| `calendar:reminder_created` | `{ reminder: { id, type, targetType, targetId, message, channel, userId, isRecurring } }`           | Reminder created              |
| `calendar:reminder_updated` | `{ reminder: { ... }, changes }`                                                                    | Reminder updated              |
| `calendar:reminder_deleted` | `{ reminderId }`                                                                                    | Reminder deleted              |
| `calendar:reminder_due`     | `{ remindAt, reminder: { id, type, targetType, targetId, message, channel, userId, isRecurring } }` | Dispatcher fired the reminder |

## Command-Query Separation

### Commands (Write Side)

| Context  | Command           | Method                                  |
| -------- | ----------------- | --------------------------------------- |
| Calendar | Create calendar   | `p.calendar.calendars.create()`         |
| Calendar | Set default       | `p.calendar.calendars.setDefault()`     |
| Calendar | Create event      | `p.calendar.events.create()`            |
| Calendar | Cancel event      | `p.calendar.events.cancel()`            |
| Calendar | Add attendee      | `p.calendar.attendees.add()`            |
| Calendar | Create reminder   | `p.calendar.reminders.create()`         |
| Calendar | Process reminders | `p.calendar.reminders.processPending()` |

### Queries (Read Side)

| Context  | Query            | Method                                |
| -------- | ---------------- | ------------------------------------- |
| Calendar | Get event        | `p.calendar.events.get()`             |
| Calendar | List events      | `p.calendar.events.list()`            |
| Calendar | Get occurrences  | `p.calendar.events.getOccurrences()`  |
| Calendar | List occurrences | `p.calendar.events.listOccurrences()` |
| Calendar | Get pending      | `p.calendar.reminders.getPending()`   |

## Invariants & Business Rules

1. **Access inheritance** — events, attendees, and reminders inherit their calendar's access; reminders are additionally recipient-scoped via `userId`. Read = `global` OR owner; mutate = owner or tenant admin.
2. **Default calendar** — `isDefault` unique per owner; first-created auto-defaults.
3. **Event window** — `startsAt < endsAt` unless `allDay`; `endsAt` required for timed events.
4. **Recurrence config** — `count`/`until` mutually exclusive; `byDay` weekly-only; interval ≥ 1.
5. **Offset re-anchoring** — event `update` re-anchors `type = offset` reminders (`remindAt = startsAt − offsetMinutes`).
6. **Task bridge** — task due-date changes materialize the 3-point bundle per recipient (assignees ∪ reporter); task delete removes all task reminders; completion/cancellation removes pending ones.
7. **Dispatcher idempotence** — `processPending` fires `isSent = false AND remindAt <= now` rows, marking `isSent` so the next scan skips them.
