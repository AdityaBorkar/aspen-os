# HR Context

> Package: `@aspen-os/hr`. Domain module for human resources — employees, attendance, leave, lifecycle (onboarding/promotions/transfers/separation), overtime, shift management, org setup, and role-based access.

## Relationship Type

Downstream of the Platform (Customer–Supplier). Fully conformant — `implements Module`, has `$prepareRuntime()`, and follows the one-file-per-action workflow layout. Runtime-wired — receives `{ db, pubsub }` via `$initialize(units)` (stores `#pubsub`), registers schedules in `$prepareRuntime()`.

## Structure (`packages/hr/`)

- `Hr.create(config)` — factory returning a Module instance; `$config: HrModuleConfig = { country: "INDIA" }`
- `$name = "hr"`, `$dependencies = []`
- 8 workflow groups exposed as `readonly` properties: `access`, `attendance`, `employee`, `leave`, `lifecycle`, `overtime`, `setup`, `shift` — ~250 public methods across per-action workflow files aggregated by per-group `barrel-<entity>.ts` barrels (not the 8 monolithic workflow files of the older layout)
- 50 database tables:
  - **14 control-plane** (setup/access): `department`, `designation`, `employee_grade`, `employment_type`, `holiday`, `holiday_list`, `hr_permission`, `hr_role`, `hr_role_permission`, `hr_settings`, `hr_user`, `hr_user_branch_access`, `hr_user_role`, `payroll_settings`
  - **36 tenant** (operational/transactional): employee, attendance, leave, lifecycle, overtime, shift, employee check-in, groups, health insurance, skill maps, etc.
- 43 domain events across 8 groups (`EmployeeEventMap` 4, `AttendanceEventMap` 5, `LeaveEventMap` 6, `LifecycleEventMap` 9, `OvertimeEventMap` 3, `SetupEventMap` 4, `ShiftEventMap` 4, `AccessEventMap` 8) → `HrEventMap`
- 10 ACL resources: `attendance`, `employee`, `hrPermission`, `hrRole`, `hrUser`, `leave`, `lifecycle`, `overtime`, `setup`, `shift`
- `$prepareRuntime()` — registers 2 cron schedules; `$cleanup()` unregisters them:

| Topic                      | Cron        | Action                        |
| -------------------------- | ----------- | ----------------------------- |
| `hr:daily-attendance-sync` | `0 1 * * *` | Sync daily attendance records |
| `hr:daily-leave-accrual`   | `0 0 * * *` | Accrue leave balances         |

## Exposed on the platform instance

```
p.hr.access       branch-scoped RBAC — users, roles, permissions, branch access (33 methods)
p.hr.attendance   records, check-ins, attendance requests (16 methods)
p.hr.employee     employees, groups, health insurance, skill maps, org chart (29 methods)
p.hr.leave        leave types/periods/policies/allocations/applications/compensatory leave/
                  encashment/block lists/adjustments/ledger (55 methods)
p.hr.lifecycle    onboarding, promotions, transfers, separation, F&F, exit interviews (49 methods)
p.hr.overtime     overtime types + slips (14 methods)
p.hr.setup        departments, designations, grades, employment types, holidays, settings (35 methods)
p.hr.shift        shift types, locations, assignments, requests, schedules (34 methods)
```

## Cross-context integration

- Compliance's EventBridge subscribes to `hr:employee_onboarded` (background check + ID verification documents) and `hr:employee_separated` (exit + final settlement documents).

## Language

- Employee, Attendance, Employee Check-in, Leave, Lifecycle, Overtime, Shift, Department, Designation, Employment Type, Employee Grade, Holiday List, Payroll Settings, HR Access, HrModuleConfig
- Avoid: Staff/Worker/Personnel (for Employee), Timesheet (for Attendance), PTO (for Leave), Roster (for Shift)
