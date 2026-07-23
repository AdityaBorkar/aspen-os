# Task Management Module — Scope of Work

> Scope of Work for a Jira/Linear-style task management module built on the `@aspen-os/platform`.

## Overview

The Task Management Module provides a full-featured issue and project tracking system: task lifecycle management with sub-tasks and dependency graphs, multi-assignee workflows, rich markdown content, reminders, and multiple view modes (list, board, calendar, timeline). It integrates with the HR module for employee-based assignment, the Auth unit for RBAC, the Storage unit for file attachments, and the PubSub unit for notifications and reminders.

---

## 1. Core Task Management

### 1.1 Task

Central record for every work item.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Task Number** | text (auto) | Human-readable sequential number per project (e.g., `PROJ-142`). |
| **Title** | text | Short summary of the task. |
| **Description** | text (markdown) | Full description with markdown formatting, code blocks, images, and links. |
| **Status** | text (FK) | Current workflow status (see §4.1). |
| **Priority** | enum | `urgent`, `high`, `medium`, `low`, `none`. |
| **Type** | text (FK) | Task type (see §1.3). |
| **Project** | text (FK) | Parent project (see §2.1). |
| **Assignees** | text[] | Multiple users assigned to the task (see §1.4). |
| **Reporter** | text (FK) | User who created the task. |
| **Parent Task** | text (FK, nullable) | Self-referential link for sub-tasks (see §1.5). |
| **Start Date** | timestamptz (nullable) | When work should begin. |
| **Due Date** | timestamptz (nullable) | Deadline for completion. |
| **Completed At** | timestamptz (nullable) | When status moved to a terminal state. |
| **Estimated Hours** | numeric (nullable) | Time estimate for the task. |
| **Logged Hours** | numeric (computed) | Sum of time entries (see §5.1). |
| **Labels** | text[] | Tags for categorization (see §1.6). |
| **Sprint** | text (FK, nullable) | Sprint/iteration reference (see §2.3). |
| **Sort Order** | integer | Position within a view or column. |
| **Created At** | timestamptz | Record creation timestamp. |
| **Updated At** | timestamptz | Last modification timestamp. |

**Operations**:
- `create(input)` — create a new task.
- `update(id, patch)` — update any mutable field.
- `delete(id)` — soft-delete (archive) or hard-delete.
- `archive(id)` / `restore(id)` — soft-delete lifecycle.
- `bulkUpdate(ids, patch)` — batch status/assignee/label changes.

### 1.2 Task Type

Classify tasks by nature of work.

| Field | Type | Description |
|---|---|---|
| **Name** | text | e.g., Bug, Feature, Improvement, Spike, Chore, Epic. |
| **Icon** | text (nullable) | Icon identifier for UI display. |
| **Color** | text (nullable) | Hex color for visual distinction. |
| **Is Default** | boolean | Auto-selected when creating tasks. |
| **Project** | text (FK, nullable) | Scoped to a project, or null for global types. |

### 1.3 Labels

Flexible tagging system for cross-cutting categorization.

| Field | Type | Description |
|---|---|---|
| **Name** | text | Label text (e.g., `backend`, `urgent`, `design-review`). |
| **Color** | text | Hex color for UI display. |
| **Project** | text (FK, nullable) | Scoped to a project, or null for global labels. |

- Labels are stored as `text[]` on the Task record for query performance.
- A separate `TaskLabel` join table enables label management (rename, delete with cascade updates).

### 1.4 Multi-Assignee

Tasks can be assigned to multiple people simultaneously.

| Field | Type | Description |
|---|---|---|
| **Task** | text (FK) | Reference to task. |
| **User** | text (FK) | Reference to user (Auth unit). |
| **Assigned At** | timestamptz | When assignment was made. |
| **Assigned By** | text (FK) | Who made the assignment. |

- One user is designated as **Lead Assignee** (primary owner); others are co-assignees.
- Assignment changes are recorded in the task activity log (see §6.1).
- Bulk assign/unassign supported.
- When integrated with HR module, assignable users are filtered to active employees (see §8.1).

### 1.5 Sub-Tasks

Tasks can be decomposed into sub-tasks via a parent-child hierarchy.

- **Parent Task** field on Task is a self-referential FK.
- Sub-tasks inherit: project, sprint (optional), assignees (optional).
- Sub-tasks do NOT inherit: status, priority, labels (independent).
- **Parent progress**: parent task shows computed `completion %` = completed sub-tasks / total sub-tasks.
- **Blocking rule**: parent task cannot move to a terminal status until all sub-tasks are completed (configurable).
- **Nesting depth**: configurable maximum (default: 3 levels).
- Sub-tasks have their own full task record — they are not a child table.

### 1.6 Task Linking

Tasks can be linked to other tasks with typed relationships.

| Link Type | Description | Constraint |
|---|---|---|
| **Blocks** | This task blocks the target. | Target cannot be completed until this task is completed. |
| **Blocked By** | This task is blocked by the target. | Inverse of Blocks. |
| **Related To** | General association. | No constraint. |
| **Duplicates** | This task is a duplicate of the target. | Soft constraint — warns on completion. |
| **Caused By** | This bug was caused by the target task. | No constraint. |
| **Split From** | This task was split from the target. | No constraint. |

- Links are bidirectional: creating "A blocks B" automatically creates "B blocked by A".
- Link validation: prevents circular block chains.
- Visual dependency graph (DAG) view for complex task relationships.

### 1.7 Dependency Graph

- **Blocks/Blocked By** relationships form a Directed Acyclic Graph (DAG).
- Cycle detection on link creation — reject operations that would create a cycle.
- **Topological sort** for ordered task execution views.
- **Critical path** computation: longest chain of dependent tasks.
- **Gantt chart** data: start/end dates + dependencies → timeline visualization.

---

## 2. Project & Sprint Management

### 2.1 Project

Top-level container for organizing tasks.

| Field | Type | Description |
|---|---|---|
| **Name** | text | Project name. |
| **Key** | text (unique) | Short code for task numbering (e.g., `PROJ`, `ENG`, `OPS`). Max 10 chars, uppercase. |
| **Description** | text (nullable) | Project summary. |
| **Lead** | text (FK) | Project owner/lead. |
| **Status** | enum | `active`, `archived`, `paused`. |
| **Start Date** | timestamptz (nullable) | Project start. |
| **Target Date** | timestamptz (nullable) | Project deadline. |
| **Default Task Type** | text (FK, nullable) | Default type for new tasks in this project. |
| **Task Counter** | integer (auto) | Auto-incrementing counter for task numbering. |

**Operations**:
- `create(input)` — create project, initializes task counter at 0.
- `update(id, patch)` — update project settings.
- `archive(id)` / `restore(id)` — soft-delete lifecycle.
- `delete(id)` — hard-delete (only if no tasks exist).

### 2.2 Project Member

Controls who has access to a project.

| Field | Type | Description |
|---|---|---|
| **Project** | text (FK) | Reference to project. |
| **User** | text (FK) | Reference to user. |
| **Role** | enum | `admin`, `member`, `viewer`. |
| **Joined At** | timestamptz | When the user was added. |

- **Admin**: full project control (settings, members, delete tasks).
- **Member**: create/edit/assign tasks, comment.
- **Viewer**: read-only access to project and its tasks.

### 2.3 Sprint / Iteration

Time-boxed work periods for agile workflows.

| Field | Type | Description |
|---|---|---|
| **Name** | text | Sprint name (e.g., `Sprint 1`, `2026-W28`). |
| **Project** | text (FK) | Parent project. |
| **Start Date** | timestamptz | Sprint start. |
| **End Date** | timestamptz | Sprint end. |
| **Goal** | text (nullable) | Sprint objective / description. |
| **Status** | enum | `planned`, `active`, `completed`. |

**Operations**:
- `create(input)` — create sprint.
- `start(id)` — activate sprint (sets status to active).
- `complete(id)` — close sprint; incomplete tasks can be moved to next sprint or backlog.
- `moveIncompleteTasks(fromSprint, toSprint)` — bulk move remaining tasks.

### 2.4 Backlog

- Tasks not assigned to any sprint are considered in the **backlog**.
- Backlog is a virtual view — not a separate table.
- Backlog ordering via `Sort Order` field on tasks.
- Drag-and-drop reordering and sprint assignment.

---

## 3. Views & Filters

### 3.1 Saved View

Reusable filter/display configurations.

| Field | Type | Description |
|---|---|---|
| **Name** | text | View name (e.g., "My Open Tasks", "Bugs This Sprint"). |
| **Owner** | text (FK) | User who created the view. |
| **Project** | text (FK, nullable) | Scoped to a project, or global. |
| **Type** | enum | `list`, `board`, `calendar`, `timeline`. |
| **Filters** | jsonb | Serialized filter criteria. |
| **Sort** | jsonb | Serialized sort configuration. |
| **Group By** | text | Field to group results by (status, assignee, priority, etc.). |
| **Is Shared** | boolean | Visible to other project members. |
| **Is Default** | boolean | Auto-loaded when entering the project. |

### 3.2 List View

- Tabular display of tasks with configurable columns.
- Column visibility and ordering per view.
- Inline editing for quick updates.
- Bulk selection and operations.
- Sortable by any field.

### 3.3 Board View (Kanban)

- Columns mapped to task statuses (see §4.1).
- Drag-and-drop cards between columns to change status.
- Card displays: title, assignee avatars, priority badge, labels, due date.
- Swimlanes: group cards by assignee, priority, label, or sprint.
- Column WIP limits (optional): warn when a column exceeds capacity.

### 3.4 Calendar View

- Tasks displayed on a monthly/weekly calendar based on due date or start date.
- Drag tasks to reschedule.
- Color-coded by priority or project.
- Overdue tasks highlighted.

### 3.5 Timeline View (Gantt)

- Horizontal bar chart of tasks over time.
- Dependencies rendered as arrows between bars.
- Drag to adjust start/end dates.
- Zoom levels: day, week, month.
- Critical path highlighting.
- Milestones (zero-duration tasks).

### 3.6 Filter System

Composable filter engine supporting:

| Operator | Applies To | Example |
|---|---|---|
| `is` / `is not` | All fields | Status is "In Progress" |
| `contains` | Text fields | Title contains "login" |
| `in` / `not in` | Enums, FKs | Priority in [urgent, high] |
| `before` / `after` | Dates | Due date before 2026-08-01 |
| `between` | Dates | Created between date range |
| `is empty` / `is not empty` | Nullable fields | Assignee is not empty |
| `has any` / `has all` / `has none` | Arrays | Labels has any [backend, api] |

- Filters combine with AND / OR logic.
- Parenthetical grouping for complex expressions.
- Filter presets for common queries.

---

## 4. Workflow & Status Management

### 4.1 Status

Configurable workflow states for tasks.

| Field | Type | Description |
|---|---|---|
| **Name** | text | Status name (e.g., Backlog, Todo, In Progress, In Review, Done). |
| **Category** | enum | `backlog`, `unstarted`, `started`, `completed`, `cancelled`. |
| **Color** | text | Hex color for UI. |
| **Project** | text (FK, nullable) | Scoped to a project, or global. |
| **Sort Order** | integer | Position in the workflow sequence. |
| **Is Default** | boolean | Assigned to new tasks automatically. |
| **Is Resolved** | boolean | Terminal state — task is considered done. |

- Each project can define its own workflow (set of statuses).
- Default workflow: Backlog → Todo → In Progress → In Review → Done → Cancelled.

### 4.2 Status Transition

Defines allowed state changes (optional — if not configured, all transitions are allowed).

| Field | Type | Description |
|---|---|---|
| **From Status** | text (FK) | Source status. |
| **To Status** | text (FK) | Target status. |
| **Project** | text (FK) | Scoped to a project. |
| **Requires Comment** | boolean | Prompt for a comment on transition. |
| **Requires Role** | text (nullable) | Only users with this role can perform the transition. |

- Transition validation on status change.
- Transition triggers (see §4.3).

### 4.3 Automation Rules

Configurable triggers and actions for workflow automation.

| Field | Type | Description |
|---|---|---|
| **Name** | text | Rule name. |
| **Project** | text (FK) | Scoped to a project. |
| **Trigger** | enum | `status_change`, `assignment_change`, `due_date_passed`, `task_created`, `task_updated`. |
| **Conditions** | jsonb | Filter criteria that must match for the rule to fire. |
| **Actions** | jsonb | List of actions to execute. |
| **Is Active** | boolean | Enable/disable the rule. |

**Supported Actions**:
- Set field value (e.g., set `completed_at` when status becomes "Done").
- Send notification to assignees / watchers.
- Add/remove labels.
- Assign/unassign users.
- Create follow-up tasks.
- Update parent task.

### 4.4 Recurring Tasks

- Tasks configured to auto-generate copies on a schedule.
- **Recurrence Rule**: frequency (daily, weekly, monthly, custom cron), end condition (never, after N occurrences, by date).
- New task created with the same template fields but fresh dates and unassigned status.
- Original task marked as "template" — not counted in active work.

---

## 5. Time Management

### 5.1 Time Entry

Track time spent on tasks.

| Field | Type | Description |
|---|---|---|
| **Task** | text (FK) | Reference to task. |
| **User** | text (FK) | Who logged the time. |
| **Duration** | integer | Minutes spent. |
| **Description** | text (nullable) | What was worked on. |
| **Date** | date | When the work happened. |
| **Billable** | boolean | Whether this time is billable. |
| **Created At** | timestamptz | Record creation. |

**Operations**:
- `log(taskId, userId, duration, description?, date?)` — create time entry.
- `start(taskId)` / `stop()` — timer-based tracking (stores start time, computes duration on stop).
- `update(id, patch)` — edit a time entry.
- `delete(id)` — remove a time entry.
- Task's `Logged Hours` field is a computed sum of all time entries.

### 5.2 Reminder

Scheduled notifications for task-related events.

| Field | Type | Description |
|---|---|---|
| **Task** | text (FK) | Reference to task. |
| **User** | text (FK) | Who receives the reminder. |
| **Type** | enum | `due_date`, `custom`, `overdue`. |
| **Remind At** | timestamptz | When to fire the reminder. |
| **Message** | text (nullable) | Custom reminder text. |
| **Is Sent** | boolean | Whether the reminder has been delivered. |
| **Recurring** | boolean | Repeat the reminder. |
| **Recurrence Interval** | text (nullable) | e.g., `daily`, `every_2_hours`. |

**Reminder Types**:
- **Due Date**: auto-created when a task has a due date. Default reminders at: 1 day before, 1 hour before, at due time.
- **Custom**: user-defined reminder at any time.
- **Overdue**: auto-created when a task passes its due date without completion.

**Delivery**: via PubSub unit → notification channel (in-app, email, push — depends on notification unit).

### 5.3 Due Date Intelligence

- **Overdue detection**: background job scans for tasks past due date → marks as overdue, triggers notifications.
- **Due Soon**: configurable threshold (default: 24 hours) — tasks approaching deadline get a visual indicator.
- **Business Day Awareness** (via HR module): due dates can skip weekends and holidays from the Holiday List.

---

## 6. Collaboration

### 6.1 Activity Log

Immutable audit trail of all changes to a task.

| Field | Type | Description |
|---|---|---|
| **Task** | text (FK) | Reference to task. |
| **User** | text (FK) | Who performed the action. |
| **Action** | text | Type of change (e.g., `status_changed`, `assignee_added`, `comment_added`, `due_date_changed`). |
| **Old Value** | jsonb (nullable) | Previous value. |
| **New Value** | jsonb (nullable) | New value. |
| **Created At** | timestamptz | When the action occurred. |

- Activity log is append-only — no edits or deletes.
- Displayed as a timeline on the task detail view.
- Filterable by action type.

### 6.2 Comment

Threaded discussions on tasks.

| Field | Type | Description |
|---|---|---|
| **Task** | text (FK) | Reference to task. |
| **User** | text (FK) | Comment author. |
| **Body** | text (markdown) | Comment content with markdown support. |
| **Parent Comment** | text (FK, nullable) | For threaded replies. |
| **Edited At** | timestamptz (nullable) | Last edit timestamp. |
| **Created At** | timestamptz | Creation timestamp. |

**Features**:
- Markdown rendering (same engine as task description).
- @mention users (triggers notification via PubSub).
- Edit history tracked (body snapshots stored on edit).
- Delete (soft-delete with "comment deleted" placeholder).

### 6.3 Attachment

Files attached to tasks or comments.

| Field | Type | Description |
|---|---|---|
| **Task** | text (FK) | Reference to task. |
| **Comment** | text (FK, nullable) | If attached to a specific comment. |
| **File** | text (FK) | Reference to Storage unit's FileMetadata. |
| **Uploaded By** | text (FK) | Who uploaded the file. |
| **Created At** | timestamptz | Upload timestamp. |

- Files stored via the Storage unit (S3-compatible).
- Max file size and allowed types configurable.
- Inline image display in markdown (images render preview).

### 6.4 Watcher

Users subscribed to task updates.

| Field | Type | Description |
|---|---|---|
| **Task** | text (FK) | Reference to task. |
| **User** | text (FK) | Who is watching. |
| **Added At** | timestamptz | When they started watching. |

- Assignees are automatically added as watchers.
- Watchers receive notifications for all task activity (configurable).
- Users can opt-out of specific notification types per task.

---

## 7. Reporting & Analytics

### 7.1 Task Summary Report

- Task counts by status, priority, assignee, label, project.
- Filterable by date range, sprint, project.
- Exportable to CSV.

### 7.2 Workload Report

- Tasks per assignee with status breakdown.
- Overdue tasks per assignee.
- Capacity visualization (estimated vs. available hours).
- Requires HR module integration for employee availability data.

### 7.3 Velocity Report

- Tasks completed per sprint.
- Story points / estimated hours completed per sprint.
- Velocity trend over time.
- Requires sprint data.

### 7.4 Burndown Chart

- Remaining work (tasks or estimated hours) over sprint duration.
- Ideal burndown line vs. actual.
- Scope changes highlighted (tasks added mid-sprint).

### 7.5 Cumulative Flow Diagram

- Stacked area chart of tasks by status over time.
- Identifies bottlenecks (growing columns).
- Useful for process improvement.

### 7.6 Time Report

- Logged hours per user, per task, per project.
- Billable vs. non-billable breakdown.
- Date range filtering.
- Exportable to CSV.

---

## 8. Cross-Module Integrations

### 8.1 HR Module Integration

| Integration | Flow |
|---|---|
| **Employee → Assignee** | Task assignees are sourced from the HR Employee master. Only active employees are eligible for assignment. |
| **Employee → Reporter** | Task reporters are mapped to employees. |
| **Department → Project** | Projects can be associated with departments for organizational alignment. |
| **Holiday List → Due Date** | Due date calculations can skip holidays defined in the Holiday List. |
| **Leave Management → Availability** | Task assignment suggestions can exclude employees on leave. |
| **Shift Schedule → Working Hours** | Time estimates and due date calculations can factor in shift schedules. |

### 8.2 Auth Unit Integration

| Integration | Flow |
|---|---|
| **User → Assignee/Reporter** | Tasks reference Auth users for assignment and reporting. |
| **Roles → Project Permissions** | Project member roles (admin/member/viewer) are enforced via Auth's access control. |
| **Session → Audit** | Activity log entries include the authenticated user from the current session. |

### 8.3 Storage Unit Integration

| Integration | Flow |
|---|---|
| **File Upload → Attachment** | Task and comment attachments are stored via the Storage unit. |
| **Markdown Images** | Inline images in markdown content are uploaded to Storage and referenced by key. |

### 8.4 PubSub Unit Integration

| Integration | Flow |
|---|---|
| **Reminder → Notification** | Reminder events are published to PubSub for delivery by the notification system. |
| **Task Activity → Watchers** | Task changes publish events that trigger watcher notifications. |
| **Automation Rules → Actions** | Automation triggers publish events that execute configured actions. |

### 8.5 RPC Unit Integration

| Integration | Flow |
|---|---|
| **API Exposure** | All task operations are exposed as oRPC procedures for client consumption. |
| **Client Framework** | Task queries and mutations available via the client-side RPC unit. |

---

## 9. Data Model Summary

| Domain | Key Tables |
|---|---|
| **Core** | Task, TaskType, Label, TaskLabel |
| **Hierarchy** | Sub-task relationships (self-referential FK on Task) |
| **Linking** | TaskLink (source, target, link_type) |
| **Project** | Project, ProjectMember |
| **Sprint** | Sprint |
| **Status** | Status, StatusTransition |
| **Assignment** | TaskAssignee |
| **Time** | TimeEntry |
| **Reminders** | Reminder |
| **Collaboration** | Comment, Attachment, Watcher, ActivityLog |
| **Views** | SavedView |
| **Automation** | AutomationRule |

---

## 10. Dependencies & Prerequisites

| Dependency | Reason |
|---|---|
| **Auth Unit** | User identity, roles, access control for project permissions. |
| **Storage Unit** | File attachments and inline images in markdown content. |
| **PubSub Unit** | Reminder delivery, watcher notifications, automation events. |
| **RPC Unit** | API exposure for client applications. |
| **HR Module** (optional) | Employee master for assignment, holiday lists for due date logic, leave data for availability. |

**Without HR Module**: Tasks can still be created and managed. Assignee selection falls back to Auth users. Due date business-day logic is disabled.

---

## 11. Out of Scope

- **AI/ML features**: smart assignment, duplicate detection, natural language task creation.
- **Time tracking integrations**: external tools (Toggl, Harvest).
- **Git/VCS integration**: commit linking, branch creation from tasks.
- **Custom fields**: user-defined fields beyond the schema (future extension).
- **Multi-language support**: i18n of UI labels.
- **Mobile-native app**: responsive web only.
- **Public API rate limiting**: handled at the RPC/gateway layer.

---

## 12. Implementation Notes

### Module Structure

```
packages/tasks/
├── index.ts                 # Module entry — implements Module interface
├── types.ts                 # Task module types
├── db-schema.ts             # Drizzle table definitions
├── workflows/
│   ├── task.ts              # Task CRUD operations
│   ├── project.ts           # Project management
│   ├── sprint.ts            # Sprint lifecycle
│   ├── comment.ts           # Comment operations
│   ├── time-entry.ts        # Time tracking
│   ├── reminder.ts          # Reminder scheduling
│   ├── automation.ts        # Automation rule engine
│   └── link.ts              # Task linking & dependency graph
├── services/
│   ├── task-service.ts      # Core task business logic
│   ├── dependency-graph.ts  # DAG operations (cycle detection, topo sort, critical path)
│   ├── filter-engine.ts     # Query builder for saved views and filters
│   ├── notification-bridge.ts # PubSub integration for reminders/watchers
│   └── report-service.ts    # Reporting queries
└── event-map.ts             # Task domain events
```

### Domain Events

| Event | Payload | Trigger |
|---|---|---|
| `task:created` | `{ task }` | Task created |
| `task:updated` | `{ task, changes }` | Task fields modified |
| `task:deleted` | `{ taskId }` | Task deleted |
| `task:status_changed` | `{ task, fromStatus, toStatus }` | Status transition |
| `task:assigned` | `{ taskId, userId, assignedBy }` | Assignee added |
| `task:unassigned` | `{ taskId, userId }` | Assignee removed |
| `task:linked` | `{ sourceId, targetId, linkType }` | Task link created |
| `task:unlinked` | `{ sourceId, targetId }` | Task link removed |
| `task:commented` | `{ taskId, comment }` | Comment added |
| `task:time_logged` | `{ taskId, timeEntry }` | Time entry created |
| `reminder:fired` | `{ reminder, taskId }` | Reminder triggered |
| `sprint:started` | `{ sprint }` | Sprint activated |
| `sprint:completed` | `{ sprint }` | Sprint closed |

### Estimated Effort (Relative)

| Area | Complexity | Notes |
|---|---|---|
| Core Task CRUD | Low | Standard CRUD with markdown support. |
| Sub-tasks & Linking | Medium | Self-referential FK, DAG validation, cycle detection. |
| Multi-assignee | Low | Join table with lead assignee designation. |
| Workflow & Automation | Medium | Status transitions, rule engine, trigger evaluation. |
| Views (List, Board) | Medium | Filter engine, drag-and-drop, real-time updates. |
| Calendar & Timeline | High | Date-based rendering, Gantt with dependencies, critical path. |
| Reminders | Medium | Scheduled job via PubSub, recurring reminders. |
| Time Tracking | Low | Timer start/stop, duration aggregation. |
| Collaboration | Medium | Comments with markdown, @mentions, activity log. |
| Reporting | Medium | Aggregation queries, chart data preparation. |
| HR Integration | Low | FK references to Employee, optional availability checks. |

### Phase Sequencing

**Phase 1 — Core**:
- Task CRUD with markdown content
- Sub-tasks
- Task types and labels
- Project and sprint management
- Basic status workflow (configurable statuses)
- Multi-assignee

**Phase 2 — Views & Workflow**:
- List view, board view
- Saved views and filter engine
- Status transitions and validation
- Activity log and comments

**Phase 3 — Advanced**:
- Task linking and dependency graph
- Calendar and timeline views
- Automation rules
- Reminders and notifications
- Time tracking

**Phase 4 — Reporting & Polish**:
- All reports (summary, workload, velocity, burndown, time)
- HR module integration
- Performance optimization
- Bulk operations

### Testing Focus Areas

- **Dependency graph**: cycle detection correctness, topological sort, critical path computation.
- **Multi-assignee**: permission checks with multiple assignees, lead assignee designation.
- **Reminders**: scheduled delivery timing, timezone handling, recurring reminder reset.
- **Filter engine**: complex AND/OR filter composition, performance on large datasets.
- **Activity log**: immutable audit trail completeness, correct old/new value capture.
- **Sprint lifecycle**: incomplete task handling on sprint completion, backlog reordering.
