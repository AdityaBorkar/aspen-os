# HR Context

> Package: `@aspen-os/hr`. Domain module for human resources — employees, attendance, leave, lifecycle (onboarding/promotions/transfers/separation), overtime, shift management, org setup, positions/structure, announcements, and role-based access.

## Relationship Type

Downstream of the Platform (Customer–Supplier). Fully conformant — `implements Module`, has `$prepareRuntime()`, and follows the one-file-per-action workflow layout. Runtime-wired — receives `{ db, pubsub }` via `$initialize(units)` (stores `#db` and `#pubsub`), registers schedules + lifecycle reconciliation subscriptions in `$prepareRuntime()`.

## Structure (`packages/hr/`)

- `Hr.create(config)` — factory returning a Module instance; `$config: HrModuleConfig = { country: "INDIA" }`
- `$name = "hr"`, `$dependencies = []`
- 10 workflow groups exposed as `readonly` properties: `access`, `announcement`, `attendance`, `employee`, `leave`, `lifecycle`, `overtime`, `position`, `setup`, `shift` — ~290 public methods across per-action workflow files aggregated by per-group `barrel-<entity>.ts` barrels
- 54 database tables:
  - **14 control-plane** (setup/access): `department`, `designation`, `employee_grade`, `employment_type`, `holiday`, `holiday_list`, `hr_permission`, `hr_role`, `hr_role_permission`, `hr_settings`, `hr_user`, `hr_user_branch_access`, `hr_user_role`, `payroll_settings`
  - **40 tenant** (operational/transactional): employee, attendance, leave, lifecycle, overtime, shift, position (+assignment), announcement (+recipient), employee check-in, groups, health insurance, skill maps, etc.
- 58 domain events across 10 groups (`EmployeeEventMap` 4, `AttendanceEventMap` 5, `LeaveEventMap` 6, `LifecycleEventMap` 9, `OvertimeEventMap` 3, `PositionEventMap` 7, `SetupEventMap` 6, `ShiftEventMap` 4, `AccessEventMap` 8, `AnnouncementEventMap` 6) → `HrEventMap`
- 12 ACL resources: `announcement`, `attendance`, `employee`, `hrPermission`, `hrRole`, `hrUser`, `leave`, `lifecycle`, `overtime`, `position`, `setup`, `shift`
- `$prepareRuntime()` — registers 3 cron schedules + lifecycle reconciliation subscriptions; `$cleanup()` unregisters them:

| Topic                       | Cron        | Action                              |
| --------------------------- | ----------- | ----------------------------------- |
| `hr:daily-attendance-sync`  | `0 1 * * *` | Sync daily attendance records       |
| `hr:daily-leave-accrual`    | `0 0 * * *` | Accrue leave balances               |
| `hr:announcement-scheduler` | `* * * * *` | Publish due scheduled announcements |

Reconciliation subscriptions (registered alongside the schedules, unregistered in `$cleanup()`):

| Topic                            | Action                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| `lifecycle:separation_completed` | Auto-close the employee's open-ended position assignments, emit `position:unassigned` |
| `lifecycle:transfer_approved`    | Surface transfer guidance when a current position sits in the old department          |

## Exposed on the platform instance

```
p.hr.access       branch-scoped RBAC — users, roles, permissions, branch access (33 methods)
p.hr.announcement internal communications — author, schedule, publish, archive, pin, audience
                  targeting, delivery snapshot + stats (14 methods)
p.hr.attendance   records, check-ins, attendance requests (16 methods)
p.hr.employee     employees, groups, health insurance, skill maps, org chart (29 methods)
p.hr.leave        leave types/periods/policies/allocations/applications/compensatory leave/
                  encashment/block lists/adjustments/ledger (55 methods)
p.hr.lifecycle    onboarding, promotions, transfers, separation, F&F, exit interviews (49 methods)
p.hr.overtime     overtime types + slips (14 methods)
p.hr.position     positions, assignments, org/position trees, direct reports, team (20 methods)
p.hr.setup        departments (+ tree ops), designations, grades, employment types, holidays,
                  settings (40 methods)
p.hr.shift        shift types, locations, assignments, requests, schedules (34 methods)
```

## Cross-context integration

- Compliance's EventBridge subscribes to `hr:employee_onboarded` (background check + ID verification documents) and `hr:employee_separated` (exit + final settlement documents).
- Comms' EventBridge subscribes to `announcement:published` (one `comms_notification` per auth-user recipient with `sourceModule: "hr"`, `sourceEntity.type: "announcement"`); hr's `getStats` reads read/acknowledgement counts back from those `comms_notification` rows (narrow, directed cross-module read for stats only).
- Module-internal: the position group consumes `lifecycle:separation_completed` / `lifecycle:transfer_approved` to reconcile position assignments; `position:*` and `setup:department_*` events are produced by the position/setup workflows for host-app subscribers.

## Language

- Employee, Attendance, Employee Check-in, Leave, Lifecycle, Overtime, Shift, Position, Position Assignment, Department, Designation, Employment Type, Employee Grade, Holiday List, Payroll Settings, HR Access, Announcement, Announcement Audience, Delivery Snapshot, HrModuleConfig
- Avoid: Staff/Worker/Personnel (for Employee), Timesheet (for Attendance), PTO (for Leave), Roster (for Shift), Job (for Position), Notification (for Announcement — Notification stays a comms term)
