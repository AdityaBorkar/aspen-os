# Tasks Domain Model

> Package: `@aspen-os/tasks`. Projects, tasks, statuses, comments, links, time entries, reminders, saved views, and automation rules. 17 tables — 6 control-plane (global config) + 11 tenant (operational).

## Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TASKS DOMAIN                                  │
│                                                                     │
│  ┌──────────────┐   1:N ┌──────────┐                                │
│  │   Project    │──────→│   Task   │──1:N──┌──────────────┐         │
│  │  id          │       │  id      │       │ TaskAssignee │         │
│  │  key (uniq)  │       │  title   │       │  taskId (FK) │         │
│  │  name        │       │  number  │       │  userId      │         │
│  │  status      │       │  priority│       └──────────────┘         │
│  │  leadId      │       │  statusId│                                │
│  │  taskCounter │       │  reporterId│                              │
│  │  defaultTaskTypeId │  │  parentId  │──1:N──┌──────────────┐      │
│  └──────┬───────┘       │  typeId    │       │   Comment    │      │
│         │               │  labels[]  │       │  taskId (FK) │      │
│         ├──1:N──┐       │  dueDate   │       │  userId      │      │
│         │       │       │  estimatedHours│   │  body        │      │
│         │  ┌────┴───────┐│  isArchived│       │  parentId    │──self│
│         │  │ProjectMember│└──────────┘       └──────────────┘      │
│         │  │projectId(FK)│  ┌──────────────┐                        │
│         │  │userId       │  │ TaskStatus   │  (project-scoped or    │
│         │  │role         │  │  id          │   global if projectId  │
│         │  └─────────────┘  │  name        │   is null)             │
│         │                   │  category    │  backlog|unstarted|     │
│         │                   │  isResolved  │  started|completed|    │
│         │                   │  sortOrder   │  cancelled             │
│         │                   │  projectId   │                        │
│         │                   └──────┬───────┘                        │
│         │                          │ 1:N                            │
│         │                          ▼                                │
│         │                  ┌──────────────┐                         │
│         │                  │StatusTransition (fromStatusId,          │
│         │                  │ toStatusId, requiresComment,           │
│         │                  │ requiresRole)                          │
│         │                  └──────────────┘                         │
│         │                                                           │
│         │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│         │  │ TaskLink     │  │ TimeEntry    │  │ SavedView    │     │
│         │  │ sourceId(FK) │  │ taskId (FK)  │  │ ownerId      │     │
│         │  │ targetId(FK) │  │ userId       │  │ projectId    │     │
│         │  │ linkType     │  │ duration     │  │ type         │     │
│         │  └──────────────┘  │ billable     │  │ filters(jsonb)│     │
│         │                    └──────────────┘  │ sort/groupBy  │     │
│         │                                      └──────────────┘     │
│         │                                                           │
│         │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│         │  │ AutomationRule│  │ Reminder     │  │ Watcher      │     │
│         │  │ projectId    │  │ taskId (FK)  │  │ taskId (FK)  │     │
│         │  │ trigger      │  │ userId       │  │ userId       │     │
│         │  │ conditions   │  │ remindAt     │  └──────────────┘     │
│         │  │ actions      │  │ type         │                       │
│         │  │ isActive     │  └──────────────┘                       │
│         │  └──────────────┘  ┌──────────────┐                       │
│         │                    │ Attachment   │  ┌──────────────┐     │
│         │                    │ taskId (FK)  │  │ ActivityLog  │     │
│         │                    └──────────────┘  │ taskId (FK)  │     │
│         │                                      └──────────────┘     │
│         └──────────────────────────────────────────────────────────  │
└─────────────────────────────────────────────────────────────────────┘
```

## Aggregates

### Project (Aggregate Root)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)` — the `uuidv7` JS function)

**Invariants**:

- `key` must be unique
- `taskCounter` is incremented atomically per task creation
- Cannot delete a project with existing tasks (must archive first)
- Lead is automatically added as `admin` project member on creation

**Lifecycle commands** (via `p.tasks.projects`): `create(input)`, `update(id, patch)`, `archive(id)` / `restore(id)`, `delete(id)` (refuses if tasks exist), `get(id)`, `list(filters?)`, `addMember(input)`, `updateMember(projectId, userId, patch)`, `removeMember(projectId, userId)`, `listMembers(projectId)`.

**Relationships**: Has many `Task` (1:N); has many `ProjectMember` (1:N); has many `TaskStatus` (1:N, or global if `projectId` is null); has many `TaskType` (1:N); has many `AutomationRule` (1:N).

### Task (Aggregate Root)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)`)

**Value objects**:

- `TaskPriority` — enum: urgent, high, medium, low, none
- `TaskNumber` — display format `KEY-seq` (e.g. `PROJ-1`)

**Invariants**:

- `parentId` max nesting depth of 3 levels
- No circular parent references (cycle detection in workflow)
- `taskNumber` is sequential per project
- `isArchived` is a soft-delete flag

**Lifecycle commands** (via `p.tasks.tasks`): `create(input)`, `update(id, patch)`, `delete(id)`, `archive(id)` / `restore(id)`, `bulkUpdate(input)`, `get(id)`, `list(filters?)`, `getSubTasks(parentId)`, `getCompletionSummary(parentId)`, `assign(input)`, `unassign(taskId, userId)`, `getAssignees(taskId)`, `getLoggedHours(taskId)`.

**Relationships**: Belongs to `Project` (N:1); has one `TaskStatus` (N:1); optionally has one `TaskType` (N:1); self-referential `parentId` for sub-tasks (max 3 levels); has many `TaskAssignee`, `Comment`, `TaskLink`, `TimeEntry`, `Reminder`, `Watcher`, `ActivityLog`, `Attachment` (1:N each).

### Supporting entities

- **Task Status**: `{ name, category (backlog/unstarted/started/completed/cancelled), color, sortOrder, isDefault, isResolved }`. Transitions constrained via `TaskStatusTransition` rules (optionally requiring a comment or role). Project-scoped or global.
- **Task Link**: typed relationship (`blocks`, `blocked_by`, `related_to`, `duplicates`, `caused_by`, `split_from`). Creating a link automatically creates its inverse; BFS cycle detection prevents circular dependencies.
- **Saved View**: reusable `{ name, type (list/board/calendar/timeline), filters (jsonb), sort (jsonb), groupBy, isShared, isDefault }`, owned by a user, optionally project-scoped.
- **Automation Rule**: trigger-action rule `{ trigger (status_change/assignment_change/due_date_passed/task_created/task_updated), conditions (jsonb), actions (jsonb), isActive }`, evaluated by the automation workflows.
- **Time Entry**: `{ taskId, userId, duration (minutes), date, description, billable }`.
- **Reminder**: `{ taskId, userId, type (due_date/custom/overdue), remindAt, isRecurring, interval, isSent }`.
- **Watcher**: user subscribed to task updates.
- **Activity Log**: append-only `{ taskId, userId, action, oldValue (jsonb), newValue (jsonb) }`.
- **Comment**: threaded via `parentId`; supports attachments.
- **Attachment**: `{ taskId, commentId?, storageKey, ... }`.

## Domain Events — 10

| Event                 | Payload                                         | Trigger                   |
| --------------------- | ----------------------------------------------- | ------------------------- |
| `task:created`        | `{ task: { id, number, projectId, title } }`    | Task created              |
| `task:updated`        | `{ task: { id, title }, changes }`              | Task updated              |
| `task:deleted`        | `{ taskId }`                                    | Task deleted              |
| `task:status_changed` | `{ task: { id, title }, fromStatus, toStatus }` | Task status changed       |
| `task:assigned`       | `{ taskId, userId, assignedBy }`                | User assigned to task     |
| `task:unassigned`     | `{ taskId, userId }`                            | User unassigned from task |
| `task:linked`         | `{ sourceId, targetId, linkType }`              | Task link created         |
| `task:unlinked`       | `{ sourceId, targetId }`                        | Task link removed         |
| `task:commented`      | `{ taskId, comment: { id, body } }`             | Comment added             |
| `reminder:fired`      | `{ taskId, reminder: { id, type, userId } }`    | Reminder fired            |

## Command-Query Separation

### Commands (Write Side)

| Context | Command                | Method                         |
| ------- | ---------------------- | ------------------------------ |
| Tasks   | Create task            | `p.tasks.tasks.create()`       |
| Tasks   | Update task            | `p.tasks.tasks.update()`       |
| Tasks   | Archive task           | `p.tasks.tasks.archive()`      |
| Tasks   | Assign task            | `p.tasks.tasks.assign()`       |
| Tasks   | Create project         | `p.tasks.projects.create()`    |
| Tasks   | Archive project        | `p.tasks.projects.archive()`   |
| Tasks   | Create comment         | `p.tasks.comments.create()`    |
| Tasks   | Create link            | `p.tasks.links.create()`       |
| Tasks   | Log time               | `p.tasks.timeEntries.create()` |
| Tasks   | Create reminder        | `p.tasks.reminders.create()`   |
| Tasks   | Create automation rule | `p.tasks.automations.create()` |

### Queries (Read Side)

| Context | Query                  | Method                                 |
| ------- | ---------------------- | -------------------------------------- |
| Tasks   | Get task               | `p.tasks.tasks.get()`                  |
| Tasks   | List tasks             | `p.tasks.tasks.list()`                 |
| Tasks   | Get sub-tasks          | `p.tasks.tasks.getSubTasks()`          |
| Tasks   | Get completion summary | `p.tasks.tasks.getCompletionSummary()` |
| Tasks   | List project members   | `p.tasks.projects.listMembers()`       |
| Tasks   | Get dependency graph   | `p.tasks.links.getDependencyGraph()`   |
| Tasks   | Get critical path      | `p.tasks.links.getCriticalPath()`      |
| Tasks   | Topological sort       | `p.tasks.links.topologicalSort()`      |

## Invariants & Business Rules

22. **Project key uniqueness** — enforced by DB unique constraint.
23. **Task number sequence** — `taskCounter` on project is incremented per task; display number is `KEY-seq`.
24. **Task parent depth** — max 3 levels of nesting (enforced in workflow).
25. **No circular task parents** — cycle detection via recursive traversal.
26. **Task link cycle detection** — creating a `blocks` link runs BFS cycle detection; throws on cycle.
27. **Status transition rules** — `TaskStatusTransition` can constrain which status changes are allowed (optionally requiring a comment or role).
28. **Project deletion guard** — projects with existing tasks cannot be deleted (must archive first).
