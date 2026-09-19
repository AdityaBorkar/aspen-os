# HR Context

> Packages: `@aspen-os/hr-core` (`$name = "hrCore"`), `@aspen-os/hr-attendance` (`$name = "hrAttendance"`), `@aspen-os/hr-leave` (`$name = "hrLeave"`). Domain modules for human resources — employees, attendance, leave, lifecycle (onboarding/promotions/transfers/separation), overtime, shift management, org setup, positions/structure, and role-based access. Announcements live in `@aspen-os/announcement` (see `bounded-contexts/announcement.md`).

## Relationship Type

Downstream of Platform (Customer–Supplier). Fully conformant — each `implements Module` and follows one-file-per-action workflow layout. Runtime-wired — each receives `{ db, pubsub }` via `$initialize(units)` (stores `#db` and `#pubsub`); hr-attendance and hr-leave register one cron schedule each in `$prepareRuntime()`; hr-core registers lifecycle reconciliation subscriptions.

## Structure

- `HrCore.create(config)` — `$name = "hrCore"`, `$dependencies = []`; `$config: HrCoreModuleConfig = { country: "INDIA" }`
- `HrAttendance.create(config)` — `$name = "hrAttendance"`, `$dependencies = []`; `$config: HrAttendanceModuleConfig = { country: "INDIA" }`
- `HrLeave.create(config)` — `$name = "hrLeave"`, `$dependencies = []`; `$config: HrLeaveModuleConfig = { country: "INDIA" }`
- 11 workflow groups across three packages: hr-core `access`, `employee`, `lifecycle`, `position`, `payroll`, `config`; hr-attendance `attendance`, `overtime`, `shift`; hr-leave `leave`, `config`
- 50 database tables:
- **11 control-plane** (hr-core setup/access): `department`, `designation`, `employment_type`, `hr_permission`, `hr_role`, `hr_role_permission`, `hr_settings`, `hr_user`, `hr_user_branch_access`, `hr_user_role`, `payroll_settings`
- **39 tenant** (operational/transactional): hr-core 14 (employee, groups, skill maps, onboarding/promotion/transfer/separation, exit interviews, F&F, position + assignment, onboarding/separation tasks), hr-attendance 11 (attendance, requests, check-ins, overtime, shift), hr-leave 14 (leave types/periods/policies/allocations/applications/block lists/adjustments/encashments/ledger/compensatory + holidays)
- 52 domain events across 9 groups (hr-core 33: `EmployeeEventMap` 4, `LifecycleEventMap` 9, `PositionEventMap` 7, `SetupEventMap` 5, `AccessEventMap` 8; hr-attendance 12: `AttendanceEventMap` 5, `OvertimeEventMap` 3, `ShiftEventMap` 4; hr-leave 7: `LeaveEventMap` 7)
- 12 ACL resources: hr-core 7 (`config`, `employee`, `hrPermission`, `hrRole`, `hrUser`, `lifecycle`, `position`), hr-attendance 3 (`attendance`, `overtime`, `shift`), hr-leave 2 (`config`, `leave`)
- `$prepareRuntime()` — registers 2 cron schedules + lifecycle reconciliation subscriptions; `$cleanup()` unregisters them:

| Topic                      | Cron        | Action                        | Package       |
| -------------------------- | ----------- | ----------------------------- | ------------- |
| `hr.daily-attendance-sync` | `0 1 * * *` | Sync daily attendance records | hr-attendance |
| `hr.daily-leave-accrual`   | `0 0 * * *` | Accrue leave balances         | hr-leave      |

Reconciliation subscriptions (hr-core, registered in `$prepareRuntime()`, unregistered in `$cleanup()`):

| Topic                            | Action                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| `lifecycle.separation_completed` | Auto-close the employee's open-ended position assignments, emit `position.unassigned` |
| `lifecycle.transfer_approved`    | Surface transfer guidance when a current position sits in the old department          |

## Exposed on the platform instance

```
p.hrCore.access     branch-scoped RBAC — users, roles, permissions, branch access (33 methods)
p.hrCore.employee   employees, groups, skill maps, org chart (28 methods)
p.hrCore.lifecycle  onboarding, promotions, transfers, separation, F&F, exit interviews (52 methods)
p.hrCore.position   positions, assignments, org/position trees, direct reports, team (20 methods)
p.hrCore.payroll    monthly payroll export over employees + attendance/leave/overtime (1 method)
p.hrCore.config     departments (+ tree ops), designations, employment types,
                    settings (nested groups: departments, designations,
                    employmentTypes, hr, payroll)
p.hrAttendance.attendance records, check-ins, attendance requests (17 methods)
p.hrAttendance.overtime   overtime types + slips (13 methods)
p.hrAttendance.shift      shift types, locations, assignments, requests, schedules (34 methods)
p.hrLeave.leave     leave types/periods/policies/allocations/applications/compensatory leave/
                    encashment/block lists/adjustments/ledger (60 methods)
p.hrLeave.config    holidays + holiday lists
```

## Cross-context integration

- Compliance's EventBridge subscribes to `hr.employee_onboarded` (background check + ID verification documents) and `hr.employee_separated` (exit + final settlement documents).
- Announcement reads hr-core's `employee` + `hr_user` tables via raw SQL at publish time (one-directional `$dependencies = ["hrCore"]`); comms fans out `announcement.published` (see `bounded-contexts/announcement.md`).
- Module-internal: position group consumes `lifecycle.separation_completed` / `lifecycle.transfer_approved` to reconcile position assignments; `position.*` and `setup.department_*` events are produced by position/setup workflows for host-app subscribers.

## Language

- Employee, Attendance, Employee Check-in, Leave, Lifecycle, Overtime, Shift, Position, Position Assignment, Department, Designation, Employment Type, HR Access, HrCoreModuleConfig, HrAttendanceModuleConfig, HrLeaveModuleConfig
- Avoid: Staff/Worker/Personnel (for Employee), Timesheet (for Attendance), PTO (for Leave), Roster (for Shift), Job (for Position)
