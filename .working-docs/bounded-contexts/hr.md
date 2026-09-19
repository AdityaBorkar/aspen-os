# HR Context

> Packages: `@aspen-os/hr-core` (`$name = "hrCore"`), `@aspen-os/hr-attendance` (`$name = "hrAttendance"`), `@aspen-os/hr-leave` (`$name = "hrLeave"`). Domain modules for human resources — employees, attendance, leave, lifecycle (onboarding/promotions/transfers/separation), overtime, shift management, org setup, and role-based access. Announcements live in `@aspen-os/announcement` (see `bounded-contexts/announcement.md`).

## Relationship Type

Downstream of Platform (Customer–Supplier). Fully conformant — each `implements Module` and follows one-file-per-action workflow layout. hr-attendance and hr-leave are runtime-wired — each registers one cron schedule in `$prepareRuntime()`; hr-core registers no runtime resources (reconciliation subscriptions were removed with the position/assignment model).

## Structure

- `HrCore.create(config)` — `$name = "hrCore"`, `$dependencies = []`; `$config: HrCoreModuleConfig = { country: "INDIA" }`
- `HrAttendance.create(config)` — `$name = "hrAttendance"`, `$dependencies = []`; `$config: HrAttendanceModuleConfig = { country: "INDIA" }`
- `HrLeave.create(config)` — `$name = "hrLeave"`, `$dependencies = []`; `$config: HrLeaveModuleConfig = { country: "INDIA" }`
- Workflow groups across three packages: hr-core `access`, `employee`, `transition`, `payroll`, `config`; hr-attendance `attendance`, `overtime`, `shift`; hr-leave `leave`, `config`
- 42 database tables, all pushed as tenant schemas:
- **hr-core 17**: employee, employeeGroup, employeeGroupMember, employeeSkillMap, employeeOnboarding, employeePromotion, employeeTransfer, employeeSeparation, department, hrSettings, payrollSettings, hrPermission, hrRole, hrRolePermission, hrUser, hrUserRole, hrUserBranchAccess
- **hr-attendance 11** (attendance, requests, check-ins, overtime, shift), **hr-leave 14** (leave types/periods/policies/allocations/applications/block lists/adjustments/encashments/ledger/compensatory + holidays)
- Org structure is `employee.department` + `employee.reports_to` only — designations and positions/assignments were removed
- 41 domain events across 8 groups (hr-core 22: `EmployeeEventMap` 4, `TransitionEventMap` 6, `SetupEventMap` 4, `AccessEventMap` 8; hr-attendance 12: `AttendanceEventMap` 5, `OvertimeEventMap` 3, `ShiftEventMap` 4; hr-leave 7: `LeaveEventMap` 7)
- 7 ACL resources: hr-core 6 (`config`, `employee`, `hrPermission`, `hrRole`, `hrUser`, `transition`) + `payroll` (read-only) = 7; hr-attendance 3 (`attendance`, `overtime`, `shift`); hr-leave 2 (`config`, `leave`)
- `$prepareRuntime()` — registers 2 cron schedules + unregisters them in `$cleanup()`:

| Topic                      | Cron        | Action                        | Package       |
| -------------------------- | ----------- | ----------------------------- | ------------- |
| `hr.daily-attendance-sync` | `0 1 * * *` | Sync daily attendance records | hr-attendance |
| `hr.daily-leave-accrual`   | `0 0 * * *` | Accrue leave balances         | hr-leave      |

## Exposed on the platform instance

```
p.hrCore.access      branch-scoped RBAC — users, roles, permissions, branch access (33 methods)
p.hrCore.employee    employees, groups, skill maps, org chart (23 methods)
p.hrCore.transition  onboarding, promotions, transfers, separations (27 methods)
p.hrCore.payroll     monthly payroll export over employees + attendance/leave/overtime (1 method)
p.hrCore.config      departments (+ tree ops), settings (nested groups: departments, hr, payroll)
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

## Language

- Employee, Attendance, Employee Check-in, Leave, Lifecycle, Overtime, Shift, Department, HR Access, HrCoreModuleConfig, HrAttendanceModuleConfig, HrLeaveModuleConfig
- Avoid: Staff/Worker/Personnel (for Employee), Timesheet (for Attendance), PTO (for Leave), Roster (for Shift), Job (for Position), Position/Assignment (removed — use `employee.reportsTo`/`department`)
