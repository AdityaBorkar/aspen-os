# @aspen-os/tasks

A domain module for the Aspen OS framework that provides Jira/Linear-style task management: projects, tasks with sub-tasks, multi-assignees, status workflows, task linking (dependency DAGs), time tracking, reminders, comments, saved views, and automation rules.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Module API](#module-api)
- [Database Schema](#database-schema)
- [Workflows](#workflows)
  - [Tasks](#tasks)
  - [Projects](#projects)
  - [Statuses](#statuses)
  - [Task Types](#task-types)
  - [Comments](#comments)
  - [Time Entries](#time-entries)
  - [Reminders](#reminders)
  - [Automation](#automation)
  - [Links](#links)
  - [Collaboration](#collaboration)
  - [Views](#views)
  - [Reports](#reports)
- [Services](#services)
- [Events](#events)
- [Integration Points](#integration-points)

## Overview

The tasks module is a fully implemented domain module following the Aspen OS Domain Module Pattern. It provides comprehensive task management with 12 workflows, 4 services, and 10 typed events.

**Package**: `@aspen-os/tasks`  
**Module name**: `"tasks"`  
**Dependencies**: `@aspen-os/platform`, `@aspen-os/constants`, `drizzle-orm`, `valibot`  
**Tables**: 16 tables, 8 pg enums

## Installation

```bash
bun install  # workspace package
```

## Quick Start

```ts
import { Platform } from "@aspen-os/platform/server"
import { TaskModule } from "@aspen-os/tasks"

const tasks = TaskModule.create()

const platform = Platform.create(config, { tasks })

await platform.prepare()  // pushes schema, registers pubsub handlers

// Access workflows via the module proxy
platform.tasks.tasks       // TaskWorkflow
platform.tasks.projects    // ProjectWorkflow
platform.tasks.statuses    // StatusWorkflow
platform.tasks.comments    // CommentWorkflow
// ... etc
```

## Module API

```ts
type TaskModuleConfig = {
  enableNotifications?: boolean  // default: false
}

class TaskModule {
  static create(config?: TaskModuleConfig): TaskModule
  readonly name: "tasks"
  readonly db_schema: typeof dbSchema

  initialize(units: { db: DatabaseUnit; pubsub: PubSubUnit }): void
  destroy(): Promise<void>

  // Workflow getters (throw if accessed before initialize())
  get tasks(): TaskWorkflow
  get projects(): ProjectWorkflow
  get statuses(): StatusWorkflow
  get taskTypes(): TaskTypeWorkflow
  get comments(): CommentWorkflow
  get timeEntries(): TimeEntryWorkflow
  get reminders(): ReminderWorkflow
  get automation(): AutomationWorkflow
  get links(): LinkWorkflow
  get collaboration(): CollaborationWorkflow
  get views(): ViewWorkflow
  get reports(): ReportService
}
```

When `enableNotifications` is `true`, the module instantiates a `NotificationBridge` service that integrates reminders and watchers with PubSub.

## Database Schema

### Enums

| Enum | Values |
|---|---|
| `task_priority` | `urgent`, `high`, `medium`, `low`, `none` |
| `task_link_type` | `blocks`, `blocked_by`, `related_to`, `duplicates`, `caused_by`, `split_from` |
| `project_status` | `active`, `archived`, `paused` |
| `project_member_role` | `admin`, `member`, `viewer` |
| `status_category` | `backlog`, `unstarted`, `started`, `completed`, `cancelled` |
| `saved_view_type` | `list`, `board`, `calendar`, `timeline` |
| `reminder_type` | `due_date`, `custom`, `overdue` |
| `automation_trigger` | `status_change`, `assignment_change`, `due_date_passed`, `task_created`, `task_updated` |

### Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `task_project` | Project with key and task counter | `key` (unique), `taskCounter`, `lead`, `status` |
| `task_project_member` | Project membership | `role` (admin/member/viewer), unique(project, user) |
| `task_type` | Task type definitions (Bug, Feature, etc.) | `project`, `name`, `icon`, `color` |
| `task_status` | Workflow statuses | `project`, `category`, `isResolved`, `sortOrder` |
| `task_status_transition` | Allowed status transitions | unique(from, to, project) |
| `task_label_def` | Label definitions | `project`, `name`, `color` |
| `task` | Central task entity | `number`, `taskNumber`, `priority`, `labels[]`, `parent` (sub-tasks), `isArchived` |
| `task_assignee` | Multi-assignee support | `isLead`, unique(task, user) |
| `task_link` | Task relationships (DAG edges) | `type` (blocks/blocked_by/related_to/...), unique(source, target, type) |
| `task_time_entry` | Time tracking entries | `duration` (minutes), `billable`, `user`, `date` |
| `task_reminder` | Task reminders | `type` (due_date/custom/overdue), `remindAt`, `isRecurring` |
| `task_activity_log` | Immutable audit trail | `action`, `oldValue`/`newValue` (jsonb) |
| `task_comment` | Threaded comments | `parentId` (threading), `isDeleted` |
| `task_attachment` | File attachments | `fileId` (references Storage) |
| `task_watcher` | Task watchers | unique(task, user) |
| `task_saved_view` | Saved filter/sort configurations | `type` (list/board/calendar/timeline), `filters`/`sort` (jsonb) |
| `task_automation_rule` | Automation rules | `trigger`, `conditions`/`actions` (jsonb), `isActive` |

All IDs are `text` with `DEFAULT gen_random_uuid()::text`. All timestamps are `TIMESTAMPTZ` with `withTimezone: true`.

## Workflows

### Tasks

`TaskWorkflow` (435 lines) -- the central workflow:

```ts
platform.tasks.tasks.create(input: CreateTaskInput): Promise<Task>
platform.tasks.tasks.update(id: string, patch: UpdateTaskInput): Promise<Task>
platform.tasks.tasks.delete(id: string): Promise<void>
platform.tasks.tasks.getById(id: string): Promise<Task>
platform.tasks.tasks.list(filters?: TaskFilters): Promise<Task[]>
platform.tasks.tasks.archive(id: string): Promise<void>
platform.tasks.tasks.restore(id: string): Promise<void>
platform.tasks.tasks.assign(id: string, userId: string, isLead?: boolean): Promise<void>
platform.tasks.tasks.unassign(id: string, userId: string): Promise<void>
platform.tasks.tasks.bulkUpdate(ids: string[], patch: UpdateTaskInput): Promise<void>
platform.tasks.tasks.getCompletionSummary(projectId?: string): Promise<TaskCompletionSummary>
```

Key behaviors:
- Auto-generates task numbers in `PROJ-142` format via project counter (atomic increment).
- Sub-task validation: cycle detection, max depth 3 levels.
- Auto-creates watchers when a user is assigned.
- Records activity log entries on mutations.

### Projects

`ProjectWorkflow` -- manages projects:

```ts
platform.tasks.projects.create(input): Promise<Project>
platform.tasks.projects.update(id, patch): Promise<Project>
platform.tasks.projects.archive(id) / restore(id): Promise<Project>
platform.tasks.projects.list(filters?): Promise<Project[]>
platform.tasks.projects.addMember(projectId, userId, role): Promise<void>
platform.tasks.projects.removeMember(projectId, userId): Promise<void>
platform.tasks.projects.updateMemberRole(projectId, userId, role): Promise<void>
```

Projects have a `key` (e.g., `PROJ`) used for task number generation. Each project maintains a `taskCounter` that increments on task creation.

### Statuses

`StatusWorkflow` -- manages workflow statuses and transitions:

```ts
platform.tasks.statuses.create(input): Promise<Status>
platform.tasks.statuses.update(id, patch): Promise<Status>
platform.tasks.statuses.delete(id): Promise<void>
platform.tasks.statuses.list(projectId): Promise<Status[]>
platform.tasks.statuses.addTransition(input): Promise<void>
platform.tasks.statuses.removeTransition(id): Promise<void>
platform.tasks.statuses.getTransitions(projectId): Promise<StatusTransition[]>
```

Statuses are categorized (`backlog`, `unstarted`, `started`, `completed`, `cancelled`) and have `isResolved` flag. Transitions define allowed status changes.

### Task Types

`TaskTypeWorkflow` -- manages task type definitions (Bug, Feature, Epic, etc.) per project.

### Comments

`CommentWorkflow` -- threaded comments with markdown support and soft-delete:

```ts
platform.tasks.comments.create(input: { taskId, body, parentId? }): Promise<Comment>
platform.tasks.comments.update(id, patch): Promise<Comment>
platform.tasks.comments.delete(id): Promise<void>  // soft-delete (sets isDeleted)
platform.tasks.comments.list(taskId): Promise<Comment[]>
```

### Time Entries

`TimeEntryWorkflow` -- time tracking:

```ts
platform.tasks.timeEntries.create(input: { taskId, userId, duration, description?, billable?, date? }): Promise<TimeEntry>
platform.tasks.timeEntries.update(id, patch): Promise<TimeEntry>
platform.tasks.timeEntries.delete(id): Promise<void>
platform.tasks.timeEntries.list(filters?): Promise<TimeEntry[]>
platform.tasks.timeEntries.getTotalTime(taskId?): Promise<number>
```

Duration is stored in minutes.

### Reminders

`ReminderWorkflow` -- task reminders:

```ts
platform.tasks.reminders.create(input: { taskId, type, remindAt?, isRecurring? }): Promise<Reminder>
platform.tasks.reminders.update(id, patch): Promise<Reminder>
platform.tasks.reminders.delete(id): Promise<void>
platform.tasks.reminders.list(filters?): Promise<Reminder[]>
```

Reminder types: `due_date`, `custom`, `overdue`. Supports recurring reminders.

### Automation

`AutomationWorkflow` -- automation rules with triggers and actions:

```ts
platform.tasks.automation.create(input: { projectId, trigger, conditions, actions, name }): Promise<AutomationRule>
platform.tasks.automation.update(id, patch): Promise<AutomationRule>
platform.tasks.automation.delete(id): Promise<void>
platform.tasks.automation.list(projectId): Promise<AutomationRule[]>
platform.tasks.automation.toggle(id, isActive): Promise<void>
```

Triggers: `status_change`, `assignment_change`, `due_date_passed`, `task_created`, `task_updated`. Conditions and actions are stored as JSONB.

### Links

`LinkWorkflow` -- task relationships (dependency DAG):

```ts
platform.tasks.links.create(input: { sourceId, targetId, type }): Promise<TaskLink>
platform.tasks.links.delete(id): Promise<void>
platform.tasks.links.list(taskId): Promise<TaskLinkInfo[]>
platform.tasks.links.getBlockers(taskId): Promise<Task[]>
platform.tasks.links.getRelated(taskId): Promise<Task[]>
```

Link types: `blocks`, `blocked_by`, `related_to`, `duplicates`, `caused_by`, `split_from`. Cycle prevention is enforced.

### Collaboration

`CollaborationWorkflow` -- watchers and attachments:

```ts
platform.tasks.collaboration.addWatcher(taskId, userId): Promise<void>
platform.tasks.collaboration.removeWatcher(taskId, userId): Promise<void>
platform.tasks.collaboration.listWatchers(taskId): Promise<string[]>
platform.tasks.collaboration.addAttachment(input): Promise<Attachment>
platform.tasks.collaboration.removeAttachment(id): Promise<void>
platform.tasks.collaboration.listAttachments(taskId): Promise<Attachment[]>
```

### Views

`ViewWorkflow` -- saved filter/sort configurations:

```ts
platform.tasks.views.create(input: { name, type, filters, sort, projectId?, ownerId? }): Promise<SavedView>
platform.tasks.views.update(id, patch): Promise<SavedView>
platform.tasks.views.delete(id): Promise<void>
platform.tasks.views.list(ownerId?, projectId?): Promise<SavedView[]>
```

View types: `list`, `board`, `calendar`, `timeline`. Filters and sort configurations stored as JSONB.

### Reports

`ReportService` -- reporting and analytics:

```ts
platform.tasks.reports.getTaskSummary(projectId?): Promise<TaskCompletionSummary>
platform.tasks.reports.getWorkload(userId?): Promise<...>
platform.tasks.reports.getVelocity(projectId): Promise<...>
platform.tasks.reports.getBurndown(projectId): Promise<...>
platform.tasks.reports.getTimeReport(filters?): Promise<...>
```

## Services

| Service | File | Purpose |
|---|---|---|
| `NotificationBridge` | `services/notification-bridge.ts` | PubSub integration for reminders and watcher notifications |
| `FilterEngine` | `services/filter-engine.ts` | Query builder for saved views and ad-hoc filters (supports is/contains/in/before/after/between/empty with AND/OR + parentheses) |
| `ReportService` | `services/report-service.ts` | Reporting queries (task summary, workload, velocity, burndown, time) |
| `DependencyGraph` | `services/dependency-graph.ts` | DAG operations: cycle detection, topological sort, critical path analysis, Gantt data |

## Events

10 events are defined in `src/event-map.ts`, each with a typed payload interface. Events are published via PubSub.

| Event | Payload | Trigger |
|---|---|---|
| `task:created` | `{ task: { id, number, taskNumber, title } }` | Task created |
| `task:updated` | `{ task: { id, title }; changes: Record<string, unknown> }` | Task updated |
| `task:deleted` | `{ taskId }` | Task deleted |
| `task:status_changed` | `{ taskId, fromStatus, toStatus }` | Status changed |
| `task:assigned` | `{ taskId, userId, isLead }` | User assigned |
| `task:unassigned` | `{ taskId, userId }` | User unassigned |
| `task:linked` | `{ sourceId, targetId, linkType }` | Task link created |
| `task:unlinked` | `{ linkId }` | Task link removed |
| `task:commented` | `{ taskId, commentId, userId }` | Comment added |
| `reminder:fired` | `{ reminderId, taskId, userId }` | Reminder fired |

## Integration Points

| Integration | Usage |
|---|---|
| **DatabaseUnit** | All workflow DB operations via drizzle |
| **PubSubUnit** | Event publishing, reminder scheduling, notification bridge |
| **AuthUnit** | User IDs for assignees, reporters, watchers, comment authors |
| **StorageUnit** | File attachments via `task_attachment.fileId` |
| **HR module** (optional) | Employee-to-assignee mapping, holiday list for business-day awareness in due date logic. Without HR, assignees fall back to Auth users and business-day logic is disabled. |

## Package Structure

```
packages/tasks/
  src/
    index.ts              # TaskModule class + type/schema re-exports
    db-schema.ts          # 16 tables + 8 pg enums (423 lines)
    types.ts              # Type re-exports + 4 interfaces
    event-map.ts          # 10 events with typed payloads (89 lines)
    schemas/
      index.ts            # Barrel re-exports
      enums.ts            # 8 valibot enum schemas
      utils.ts            # Shared validators (HexColorSchema, ProjectKeySchema, etc.)
      task.ts              # Task create/update/filters
      project.ts          # Project schemas
      status.ts           # Status + transition schemas
      task-type.ts        # Task type schemas
      comment.ts          # Comment schemas
      time-entry.ts       # Time entry schemas
      reminder.ts         # Reminder schemas
      automation.ts       # Automation rule schemas
      link.ts             # Link schemas
      collaboration.ts    # Watcher + attachment schemas
    workflows/
      index.ts             # Barrel re-exports
      task.ts              # TaskWorkflow (435 lines)
      project.ts           # ProjectWorkflow
      status.ts            # StatusWorkflow
      task-type.ts         # TaskTypeWorkflow
      comment.ts            # CommentWorkflow
      time-entry.ts         # TimeEntryWorkflow
      reminder.ts           # ReminderWorkflow
      automation.ts         # AutomationWorkflow
      link.ts               # LinkWorkflow
      collaboration.ts      # CollaborationWorkflow
      view.ts               # ViewWorkflow
    services/
      notification-bridge.ts  # PubSub integration
      filter-engine.ts        # Query builder for saved views
      report-service.ts       # Reporting queries
      dependency-graph.ts     # DAG operations (cycle detection, topo sort, critical path)
```

## SOW Reference

- [Tasks SOW](../../docs/sow/tasks.md) -- full statement of work including data model, workflow definitions, phase sequencing, and cross-module integrations
