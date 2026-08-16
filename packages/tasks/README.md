# `@aspen-os/tasks`

A domain module for the Aspen OS framework providing project/task management: projects, tasks with sub-tasks and multi-assignees, status workflows with transition rules, typed task links (dependency DAGs), time tracking, comments, attachments, automation rules, saved views, and collaboration (watchers, activity log).

> **Task reminders live in `@aspen-os/calendar`** — they are `calendar_reminder` rows with `targetType = task`, materialized by the calendar task bridge from `task:due_date_changed`. This module no longer owns any reminder surface.

## Module

```ts
import { Tasks } from "@aspen-os/tasks";

const tasks = Tasks.create({
  enableNotifications: true,
});
```

| Config                | Type      | Default | Notes                                                            |
| --------------------- | --------- | ------- | ---------------------------------------------------------------- |
| `enableNotifications` | `boolean` | `false` | Configures `task:*` event publishing via the notification bridge |

- `$name = "tasks"`, `$dependencies = []` — stateless (`$initialize`/`$prepareRuntime`/`$cleanup` empty)
- 10 workflow groups: `tasks`, `projects`, `comments`, `links`, `timeEntries`, `statuses`, `taskTypes`, `automations`, `collaboration`, `views`
- 16 tables — 6 control-plane (`label`, `project`, `project_member`, `status`, `status_transition`, `task_type`) + 10 tenant (`task`, `task_assignee`, `task_link`, `time_entry`, `activity_log`, `comment`, `attachment`, `watcher`, `saved_view`, `automation_rule`)
- 10 domain events via PubSub; empty ACL (`defineAcl({})`)

## Surface

```
p.tasks.tasks          { archive, assign, bulkUpdate, create, delete, get, getAssignees,
                         getCompletionSummary, getLoggedHours, getSubTasks, list, restore,
                         unassign, update }
p.tasks.projects       { addMember, archive, create, delete, get, list, listMembers,
                         removeMember, restore, update, updateMember }
p.tasks.comments       { create, delete, get, listByTask, listReplies, update }
p.tasks.links          { create, delete, getCriticalPath, getDependencyGraph, listByTask,
                         topologicalSort }
p.tasks.timeEntries    { create, delete, get, getTotalDuration, list, update }
p.tasks.statuses       { create, createTransition, delete, deleteTransition, get, getGlobal,
                         list, listTransitions, update, validateTransition }
p.tasks.taskTypes      { createLabel, createTaskType, deleteLabel, deleteTaskType, listLabels,
                         listTaskTypes, updateLabel, updateTaskType }
p.tasks.automations    { create, delete, evaluateRules, get, getActiveRules, listByProject, update }
p.tasks.collaboration  { addAttachment, addWatcher, deleteAttachment, getActivityLog,
                         listAttachments, listAttachmentsByComment, listWatchers, removeWatcher }
p.tasks.views          { create, delete, get, getDefault, listByOwner, listByProject, listShared,
                         update }
```

## Events

| Event                   | Payload                                               | Trigger                       |
| ----------------------- | ----------------------------------------------------- | ----------------------------- |
| `task:created`          | `{ task: { id, number, projectId, title }, dueDate }` | Task created                  |
| `task:updated`          | `{ task: { id, title }, changes }`                    | Task updated                  |
| `task:deleted`          | `{ taskId }`                                          | Task deleted                  |
| `task:status_changed`   | `{ task: { id, title }, fromStatus, toStatus }`       | Status changed                |
| `task:assigned`         | `{ taskId, userId, assignedBy }`                      | User assigned                 |
| `task:unassigned`       | `{ taskId, userId }`                                  | User unassigned               |
| `task:linked`           | `{ sourceId, targetId, linkType }`                    | Task link created             |
| `task:unlinked`         | `{ sourceId, targetId }`                              | Task link removed             |
| `task:commented`        | `{ taskId, comment: { id, body } }`                   | Comment added                 |
| `task:due_date_changed` | `{ taskId, dueDate, userIds }`                        | Task due date changed/cleared |

`task:due_date_changed` (`userIds` = assignees ∪ reporter) is consumed by the `@aspen-os/calendar` task bridge to materialize/cancel task reminders.

## Services

| Service              | File                              | Purpose                                                                                               |
| -------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `NotificationBridge` | `services/notification-bridge.ts` | `task:*` event publishers, wired into the create/update/delete/assign/unassign/comment/link workflows |
| `FilterEngine`       | `services/filter-engine.ts`       | Query builder for saved views and ad-hoc filters                                                      |
| `ReportService`      | `services/report-service.ts`      | Reporting queries (task summary, workload, velocity, burndown, time)                                  |
| `DependencyGraph`    | `services/dependency-graph.ts`    | DAG operations: cycle detection, topological sort, critical path analysis                             |

## Cross-context

- Compliance's EventBridge subscribes to other modules' events; Tasks is a source of work, not a consumer.
- The `@aspen-os/calendar` task bridge consumes `task:due_date_changed`, `task:deleted`, and `task:status_changed` to materialize/cancel task reminders. Both modules stay `$dependencies = []`.

## Documentation

Full reference docs live in `packages/tasks/docs/` (overview, workflows, events, db-schemas) and the domain record in `.working-docs/domain-model/tasks.md` / `.working-docs/bounded-contexts/tasks.md`.
