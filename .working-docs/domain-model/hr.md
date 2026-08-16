# HR Domain Model

> Package: `@aspen-os/hr`. Human resources — 9 sub-domains across 52 tables (14 control-plane setup/access + 38 tenant operational/transactional). Fully conformant module.

## Sub-domain Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        HR DOMAIN (52 tables, 9 sub-domains)         │
│                                                                     │
│  Employee ←─ 1:N ─→ Attendance, Leave, Lifecycle, Overtime, Shift   │
│                                                                     │
│  Position (structural): hr_position, hr_position_assignment;        │
│    positions are stable job slots with hierarchy (reportsToPosition)│
│    and employee assignments (current + history).                    │
│                                                                     │
│  Setup (control plane): Department, Designation, EmployeeGrade,     │
│    EmploymentType, Holiday(+HolidayList), HrSettings,               │
│    PayrollSettings                                                   │
│  Access (control plane): HrUser, HrRole, HrPermission,              │
│    HrRolePermission, HrUserRole, HrUserBranchAccess                 │
│                                                                     │
│  Tenant tables: employee, attendance, attendanceRequest,            │
│    compensatoryLeaveRequest, employeeCheckin, employeeGroup(+Member),│
│    employeeHealthInsurance, employeeSkillMap,                       │
│    employeeOnboarding(+Task), employeePromotion, employeeTransfer,  │
│    employeeSeparation(+Task), exitInterview, fullAndFinalStatement, │
│    hr_position(+hr_position_assignment),                            │
│    leave{Type,Period,Policy,PolicyAssignment,PolicyDetail,          │
│    Allocation,Application,Adjustment,BlockList,Encashment,          │
│    LedgerEntry}, overtime{Type,Slip}, shift{Type,Location,          │
│    Assignment,Request,Schedule,ScheduleAssignment}                  │
│                                                                     │
│  (Module fully conformant — `implements Module`, `$prepareRuntime()`│
│   schedules DAILY_ATTENDANCE_SYNC + DAILY_LEAVE_ACCRUAL crons and   │
│   registers lifecycle reconciliation subscriptions)                 │
└─────────────────────────────────────────────────────────────────────┘
```

## Aggregates

### Employee (Aggregate Root)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)` — the `uuidv7` JS function)

**Invariants**:

- `employeeId` must be unique
- `status` controls lifecycle (active → inactive → left)
- `reportsTo` forms an organizational chart (hierarchical)

**Lifecycle commands** (via `p.hr.employee`): `create(input)`, `update(id, patch)`, `getById(id)`, `getByEmployeeId(id)`, `list(filters?)`, `deactivate(id)`, `activate(id)`, `markAsLeft(id)`, `getOrganizationalChart()`.

**Supporting surfaces**: employee group management (create/update/delete groups, add/remove/list members), health insurance management (create/update/delete, list by employee), skill map management (create/update/delete, list by employee).

### Attendance (Aggregate Root)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)`)

**Invariants**: One record per `(employeeId, date)`; `workingHours` derived from check-in/out; `lateEntry`/`earlyExit` minutes tracked; `isHalfDay` flag; shift association. Attendance requests follow a correction workflow (pending → approved/rejected).

**Lifecycle commands** (via `p.hr.attendance`): `create(input)`, `update(id, patch)`, `deleteRecord(id)`, `getById(id)`, `list(filters?)`, `getSummary(filters?)`, `createCheckin(input)`, `deleteCheckin(id)`, `getCheckinById(id)`, `listCheckins(filters?)`, `createAttendanceRequest(input)`, `updateAttendanceRequest(id, patch)`, `approveAttendanceRequest(id)`, `rejectAttendanceRequest(id)`, `deleteAttendanceRequest(id)`, `listAttendanceRequests(filters?)`, `getAttendanceRequestById(id)`.

### Leave (Aggregate Root)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)`)

**Invariants**: Leave applications follow an approval workflow (pending → approved/rejected → cancelled). Ledger entries track allocations/consumption; encashment and compensatory leave are separate workflows. `getLeaveBalance(employeeId, leaveTypeId?)` computes current balance.

**Lifecycle commands** (via `p.hr.leave`): leave types/periods/policies/policy assignments/policy details (create/update/delete/get/list), leave allocations, applications (create/update/approve/reject/cancel/get/list), block lists, adjustments, encashments (request/approve/reject/mark paid), compensatory leave (create/approve/reject/update/delete), ledger entries (list).

### Lifecycle (Aggregate Root)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)`)

**Invariants**: Onboarding (tasks + completion tracking), promotions (with salary revision), transfers (between departments/branches/companies), separation (exit interviews, full & final settlement). Approval workflows: requested → approved → completed.

**Lifecycle commands** (via `p.hr.lifecycle`): onboarding (create/update/complete/delete, tasks create/update/complete/delete), promotions (request/approve/complete/reject), transfers (request/approve/complete/reject), separations (initiate/complete, tasks), exit interviews (create/update/complete/delete), full & final statements (create/update/approve/mark paid/delete).

### Overtime (Aggregate Root)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)`)

**Invariants**: Configurable overtime types (rates, multipliers for holidays/weekends); overtime slips follow an approval workflow (pending → approved/rejected).

**Lifecycle commands** (via `p.hr.overtime`): overtime types (create/update/delete/get/list), overtime slips (create/update/approve/reject/delete/get/list), `getOvertimeSummary(filters?)`.

### Shift (Aggregate Root)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)`)

**Invariants**: Shift types (start/end times, grace periods, auto-attendance), shift locations (geofencing), shift assignments, shift requests (approval workflow), and shift schedules (weekly day-of-week assignments).

**Lifecycle commands** (via `p.hr.shift`): shift types/locations/assignments/requests/schedules/schedule assignments (create/update/delete/get/list + approve/reject requests + deactivate assignments).

### Access (HR RBAC sub-domain)

**Invariants**: Role-based access control within the HR module — permissions, roles, and branch-wise access controls for HR users. A user's effective permissions are the union of their roles' permissions, scoped by `hr_user_branch_access`.

**Lifecycle commands** (via `p.hr.access`): users (create/update/delete/get/list), roles (create/update/delete/assign-to-user/remove-from-user/list), permissions (create/delete/assign-to-role/remove-from-role/list), branch access (grant/revoke/update/check/list), permission checks (`hasPermission`, `getUserPermissions`, `getAccessibleBranches`, `getUserRolesForBranch`).

### Position (organization structure sub-domain)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)`) on both `hr_position` and `hr_position_assignment`

**Invariants**: Positions are stable job slots — a position outlives its incumbents. Position names are unique within a department; `reportsToPosition` cannot create a cycle (max depth 10). Assignments link employees to positions with history; open-ended (`toDate` null) assignments are current. Headcount caps current assignments per position; `isPrimary` is unique per employee among current assignments. Delete/deactivate are blocked while active assignments exist. The reporting hierarchy is derived from position chains, falling back to `employee.reportsTo`.

**Lifecycle commands** (via `p.hr.position`): positions (create/update/delete/deactivate/activate/get/list), assignments (assign/unassign/transfer, history by position and employee, current reads), structure views (`getOrgTree`, `getPositionTree`, `getDirectReports`, `getSubordinates`, `getPeers`, `getTeam`). Lifecycle events reconcile assignments: separation completion auto-closes open assignments; transfer approval surfaces guidance; department head/position changes emit `setup:department_head_changed` / `setup:department_moved` / `position:*` events.

### Setup (org structure sub-domain)

**Invariants**: Department (hierarchical via `parentDepartment`, `manager`), Designation, EmployeeGrade, EmploymentType, Holiday + HolidayList, HrSettings, PayrollSettings — all control-plane (shared across tenants).

**Lifecycle commands** (via `p.hr.setup`): create/update/delete/get/list for departments, designations, grades, employment types, holidays, holiday lists; get/update `hrSettings` and `payrollSettings`.

## Domain Events — 52 (9 groups → `HrEventMap`)

| Group      | Count | Events                                                                                                                                                                                                                                                                                                     |
| ---------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Employee   | 4     | `employee:created`, `employee:updated`, `employee:status_changed`, `employee:group_created`                                                                                                                                                                                                                |
| Attendance | 5     | `attendance:created`, `attendance:checkin_created`, `attendance:request_created`, `attendance:request_approved`, `attendance:request_rejected`                                                                                                                                                             |
| Leave      | 6     | `leave:application_submitted`, `leave:application_approved`, `leave:application_rejected`, `leave:application_cancelled`, `leave:allocation_created`, `leave:encashment_requested`                                                                                                                         |
| Lifecycle  | 9     | `lifecycle:onboarding_started`, `lifecycle:onboarding_completed`, `lifecycle:promotion_requested`, `lifecycle:promotion_approved`, `lifecycle:transfer_requested`, `lifecycle:transfer_approved`, `lifecycle:separation_initiated`, `lifecycle:separation_completed`, `lifecycle:exit_interview_scheduled` |
| Overtime   | 3     | `overtime:slip_created`, `overtime:slip_approved`, `overtime:slip_rejected`                                                                                                                                                                                                                                |
| Position   | 7     | `position:created`, `position:updated`, `position:deactivated`, `position:activated`, `position:assigned`, `position:unassigned`, `position:reassigned`                                                                                                                                                    |
| Setup      | 6     | `setup:department_created`, `setup:department_moved`, `setup:department_head_changed`, `setup:designation_created`, `setup:holiday_list_created`, `setup:settings_updated`                                                                                                                                 |
| Shift      | 4     | `shift:assignment_created`, `shift:request_created`, `shift:request_approved`, `shift:request_rejected`                                                                                                                                                                                                    |
| Access     | 8     | `access:user_created`, `access:user_activated`, `access:user_deactivated`, `access:role_created`, `access:role_assigned`, `access:role_revoked`, `access:branch_access_granted`, `access:branch_access_revoked`                                                                                            |

## Command-Query Separation (representative)

### Commands

| Context | Command                   | Method                                 |
| ------- | ------------------------- | -------------------------------------- |
| HR      | Create employee           | `p.hr.employee.create()`               |
| HR      | Update employee           | `p.hr.employee.update()`               |
| HR      | Create group              | `p.hr.employee.createGroup()`          |
| HR      | Create attendance         | `p.hr.attendance.create()`             |
| HR      | Create check-in           | `p.hr.attendance.createCheckin()`      |
| HR      | Create leave application  | `p.hr.leave.createLeaveApplication()`  |
| HR      | Approve leave application | `p.hr.leave.approveLeaveApplication()` |
| HR      | Create shift assignment   | `p.hr.shift.createShiftAssignment()`   |
| HR      | Create overtime slip      | `p.hr.overtime.createOvertimeSlip()`   |
| HR      | Create department         | `p.hr.setup.createDepartment()`        |
| HR      | Create position           | `p.hr.position.create()`               |
| HR      | Assign employee to role   | `p.hr.position.assignEmployee()`       |
| HR      | Create HR user            | `p.hr.access.createUser()`             |
| HR      | Grant branch access       | `p.hr.access.grantBranchAccess()`      |

### Queries

| Context | Query                    | Method                                   |
| ------- | ------------------------ | ---------------------------------------- |
| HR      | Get employee             | `p.hr.employee.getById()`                |
| HR      | List employees           | `p.hr.employee.list()`                   |
| HR      | Get organizational chart | `p.hr.employee.getOrganizationalChart()` |
| HR      | Get org tree             | `p.hr.position.getOrgTree()`             |
| HR      | Get position history     | `p.hr.position.getPositionHistory()`     |
| HR      | List leave applications  | `p.hr.leave.listLeaveApplications()`     |
| HR      | Get leave balance        | `p.hr.leave.getLeaveBalance()`           |
| HR      | List roles               | `p.hr.access.listRoles()`                |
| HR      | Get HR settings          | `p.hr.setup.getHrSettings()`             |

## Invariants & Business Rules

1. **Scheduled cron jobs** — `hr:daily-attendance-sync` (`0 1 * * *`) and `hr:daily-leave-accrual` (`0 0 * * *`) are registered in `$prepareRuntime()` and unregistered in `$cleanup()`.
2. **Schema placement** — 14 setup/access tables live in the control plane (shared across tenants); the 38 operational/transactional tables live in tenant schemas.
3. **Approval workflows** — leave applications, attendance requests, overtime slips, shift requests, promotions, transfers, and separations all follow pending → approved/rejected transitions enforced in workflow.
4. **Position constraints** — position names unique per department; `reportsToPosition` cycles rejected (max depth 10); assignments capped by `headcount`; one open-ended assignment per (employee, position); unique `isPrimary` among current assignments; delete/deactivate blocked with active assignments.
5. **Lifecycle reconciliation** — `lifecycle:separation_completed` auto-closes the employee's open-ended position assignments (`toDate = exitDate`) and emits `position:unassigned`; `lifecycle:transfer_approved` surfaces transfer guidance; `lifecycle:promotion_approved` (via `approvePromotion`) syncs `employee.designation`.
6. **Structure views** — direct reports, subordinates, and peers resolve managers through the position `reportsToPosition` chain (falling back to `employee.reportsTo`); the org chart is a position tree with incumbents.
