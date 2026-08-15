# Tasks Context

> Package: `@aspen-os/tasks`. Domain module for project/task management — projects, tasks, statuses, comments, links, time entries, reminders, saved views, and automation rules.

## Relationship Type

Downstream of the Platform (Customer–Supplier). Stateless — `$initialize()` / `$prepareRuntime()` / `$cleanup()` are empty; workflow groups are `readonly` properties.

## Structure (`packages/tasks/`)

- `Tasks.create(config?)` — factory returning a Module instance; `$config: TaskModuleConfig = { enableNotifications?: boolean }`
- `$name = "tasks"`, `$dependencies = []`
- 11 workflow groups exposed as `readonly` properties: `tasks`, `projects`, `comments`, `links`, `timeEntries`, `statuses`, `taskTypes`, `reminders`, `automations`, `collaboration`, `views`
- 17 database tables — the only module that splits between both `control_plane_schemas` and `tenant_schemas`:
  - **6 control-plane**: `label`, `project`, `project_member`, `status`, `status_transition`, `task_type`
  - **11 tenant**: `task`, `task_assignee`, `task_link`, `time_entry`, `reminder`, `activity_log`, `comment`, `attachment`, `watcher`, `saved_view`, `automation_rule`
- 10 domain events published via PubSub (`TaskDomainEventMap`)
- ACL is empty (`defineAcl({})`)
- `$prepareInfra()` returns declarative infra (db schemas, events) — schema pushing handled centrally by the platform
- `filter-engine.ts` is a utility in `utils/`; `notification-bridge.ts` and `report-service.ts` in `services/` are not imported by any workflow (dead code)

## Exposed on the platform instance

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
p.tasks.reminders      { create, createDueDateReminders, createOverdueReminder, delete, get,
                         getPending, list, processPending, update }
p.tasks.automations    { create, delete, evaluateRules, get, getActiveRules, listByProject, update }
p.tasks.collaboration  { addAttachment, addWatcher, deleteAttachment, getActivityLog,
                         listAttachments, listAttachmentsByComment, listWatchers, removeWatcher }
p.tasks.views          { create, delete, get, getDefault, listByOwner, listByProject, listShared,
                         update }
```

Workflows are one file per action under `workflows/<entity>/<verb>.ts` (e.g. `task/assign.ts`, `status/transition/validate.ts`, `reminder/pending/process.ts`).

## Cross-context integration

- Compliance's EventBridge subscribes to events from other modules — Tasks is a **source** of work, not a consumer; no other module consumes task events today.

## Language

- Project, Task, Task Status, Task Type, Task Link, Saved View, Automation Rule, Time Entry, Task Reminder, Watcher, Activity Log, TaskModuleConfig
- Avoid: Board/Workspace (for Project), Issue/Ticket/Item (for Task), Column/Stage (for Status), Filter/Dashboard (for Saved View)
