# @aspen-os/hr

A domain module for the Aspen OS framework that provides comprehensive Human Resources management: employee lifecycle, attendance, shift scheduling, leave management, overtime, and organizational setup. Modeled after [Frappe HR](https://frappehr.com).

## Table of Contents

- [Overview](#overview)
- [Status](#status)
- [Installation](#installation)
- [Planned Architecture](#planned-architecture)
- [Phase 1: Core Operations](#phase-1-core-operations)
  - [Setup](#setup)
  - [Employee Management](#employee-management)
  - [Attendance](#attendance)
  - [Shift Management](#shift-management)
  - [Leave Management](#leave-management)
  - [Employee Lifecycle](#employee-lifecycle)
  - [Overtime](#overtime)
- [Phase 2: Compensation & Financials](#phase-2-compensation--financials)
- [Phase 3: Talent Management & Operations](#phase-3-talent-management--operations)
- [Validation Schemas](#validation-schemas)
- [Workflows](#workflows)
- [Integration Points](#integration-points)

## Overview

The HR module is a comprehensive HRMS (Human Resource Management System) built on the Aspen OS platform. It covers the full employee journey from onboarding through separation, including time tracking, leave management, payroll-adjacent features, and talent management.

**Package**: `@aspen-os/hr`  
**Module name**: `"hr"` (planned)  
**Inspired by**: [Frappe HR](https://frappehr.com)

## Status

**Partially implemented.** The module has substantial code written (~5,300 lines across schemas and workflows) but is not yet compilable or wired into the platform. The following are incomplete:

| Component | Status |
|---|---|
| `src/schemas/` (9 files, ~1,500 lines) | Complete -- all Phase 1 valibot schemas written |
| `src/workflows/` (7 files, ~4,370 lines) | Complete -- all Phase 1 workflow logic written |
| `src/db-schema.ts` | **Empty** -- ~39 drizzle tables need to be defined |
| `src/types.ts` | **Empty** -- needs re-exports + 4 domain interfaces |
| `src/event-map.ts` | **Empty** -- HR events not yet defined |
| `src/index.ts` | **Skeleton** -- does not follow the Domain Module Pattern |
| `package.json` | **Name only** -- missing deps, exports, scripts |

### What needs to be done

1. Define ~39 drizzle tables in `db-schema.ts` matching the columns the workflows write.
2. Populate `types.ts` to re-export schema types and define `EmployeeTreeNode`, `AttendanceSummary`, `LeaveBalance`, `OvertimeSummary`.
3. Rewrite `index.ts` to follow the [Domain Module Pattern](../framework/README.md#writing-a-domain-module).
4. Define HR events in `event-map.ts`.
5. Update `package.json` with dependencies (`@aspen-os/platform`, `drizzle-orm`, `valibot`) and exports.

## Installation

```bash
bun install  # workspace package
```

## Planned Architecture

The HR module follows the Domain Module Pattern used by `@aspen-os/organization`:

```ts
import { HrModule } from "@aspen-os/hr"

const hr = HrModule.create({ country: "INDIA" })

const platform = Platform.create(config, { organization, hr })
```

### Planned workflow accessors

| Getter | Workflow | Domain |
|---|---|---|
| `platform.hr.setup` | `SetupWorkflow` | HR settings, departments, designations, grades, holidays |
| `platform.hr.employees` | `EmployeeWorkflow` | Employee CRUD, groups, health insurance, skills, org chart |
| `platform.hr.attendance` | `AttendanceWorkflow` | Attendance records, checkins, requests |
| `platform.hr.shifts` | `ShiftWorkflow` | Shift types, locations, assignments, schedules |
| `platform.hr.leave` | `LeaveWorkflow` | Leave types, policies, allocations, applications, ledger |
| `platform.hr.lifecycle` | `LifecycleWorkflow` | Onboarding, promotions, transfers, separations |
| `platform.hr.overtime` | `OvertimeWorkflow` | Overtime types, slips, approval, summary |

## Phase 1: Core Operations

The Phase 1 SOW (`docs/sow/hr-phase-1.md`) establishes the foundational HR infrastructure. All schemas and workflows for Phase 1 are written.

### Setup

**Workflow**: `SetupWorkflow` (553 lines)

Manages HR configuration and organizational masters:

- **HR Settings** -- global HR configuration (upsert pattern)
- **Payroll Settings** -- payroll configuration (upsert pattern)
- **Employment Type** -- full-time, part-time, contract, intern, etc.
- **Department** -- hierarchical departments with circular-reference detection
- **Designation** -- job titles/roles
- **Employee Grade** -- grading levels
- **Holiday List** -- named holiday lists containing individual holidays

### Employee Management

**Workflow**: `EmployeeWorkflow` (524 lines)

Manages the employee master record and related entities:

- Employee CRUD with unique employee-ID check
- Activate / deactivate / markAsLeft lifecycle states
- Organizational chart tree building from `reportsTo` self-reference
- **Employee Groups** -- group CRUD + membership management
- **Health Insurance** -- per-employee insurance records (CRUD)
- **Skill Map** -- per-employee skill proficiency records (CRUD)

**Missing types to define**: `EmployeeTreeNode` (recursive tree node with `id`, `name`, `children`, `reportsTo`)

### Attendance

**Workflow**: `AttendanceWorkflow` (400 lines)

Tracks employee attendance with validation rules:

- Future-date guard (cannot mark attendance for future dates)
- Duplicate-attendance guard (one record per employee per date)
- Monthly summary aggregation (`getMonthlySummary`)
- Employee checkin logging (with type: in/out)
- Attendance requests with approve/reject workflow

**Missing types to define**: `AttendanceSummary` (aggregated stats: present, absent, late, half-day counts)

### Shift Management

**Workflow**: `ShiftWorkflow` (535 lines)

Manages shift scheduling and assignments:

- **Shift Type** -- shift definitions with auto-attendance parameters (start/end times, grace periods)
- **Shift Location** -- physical locations for shifts
- **Shift Assignment** -- assign employees to shifts with date ranges
- **Shift Request** -- employee-initiated shift change requests (approve/reject)
- **Shift Schedule** -- recurring shift schedules
- **Shift Schedule Assignment** -- assign schedules to employees
- `approveShiftRequest()` auto-creates a shift assignment from an approved request

### Leave Management

**Workflow**: `LeaveWorkflow` (1,181 lines -- the largest workflow)

A full leave ledger system:

- **Leave Type** -- earned, sick, casual, compensatory, etc.
- **Leave Period** -- date ranges for leave allocation
- **Leave Policy** -- policy with per-type details (allocation, accrual rate)
- **Leave Policy Assignment** -- assign policies to employees
- **Leave Allocation** -- granted leave days per employee per period
- **Leave Application** -- leave requests with block-list checking and balance verification
  - `approveLeaveApplication()` -- updates allocation and creates a ledger entry
  - `cancelLeaveApplication()` -- reverts allocation
- **Compensatory Leave** -- comp-off requests
- **Leave Encashment** -- encash unused leave (approve/reject/paid)
- **Leave Block List** -- date/date-range blocks on leave applications
- **Leave Adjustment** -- manual allocation adjustments
- **Leave Ledger Entry** -- immutable audit trail of all leave transactions

**Missing types to define**: `LeaveBalance` (allocated, used, remaining, encashed per leave type)

### Employee Lifecycle

**Workflow**: `LifecycleWorkflow` (907 lines)

Manages the full employee journey:

- **Onboarding** -- new employee onboarding with task tracking
- **Onboarding Tasks** -- per-onboarding task checklist
- **Promotion** -- promotions with approve/reject/complete workflow
- **Transfer** -- inter-department/branch transfers
- **Separation** -- exit process with separation tasks
- **Separation Tasks** -- checklist for separation process
- **Exit Interview** -- post-exit interview records
- **Full and Final Statement** -- settlement with earnings/deductions/net-payable calculation

### Overtime

**Workflow**: `OvertimeWorkflow` (270 lines)

Manages overtime tracking:

- **Overtime Type** -- definitions with multipliers (standard, holiday, weekend rates)
- **Overtime Slip** -- per-employee overtime records with hours and rates
  - `approveOvertimeSlip()` -- calculates amount from standard/holiday/weekend hours x rates
- Summary aggregation by employee and date range

**Missing types to define**: `OvertimeSummary` (total hours, total amount, breakdown by type)

## Phase 2: Compensation & Financials

The Phase 2 SOW (`docs/sow/hr-phase-2.md`) adds the financial backbone. **No code exists for Phase 2 yet.**

Modules planned:

1. **Travel & Expense Claims** -- employee advances, expense claims with multi-level approval, multi-currency support, travel requests
2. **Loans** -- loan types, applications, auto repayment schedule generation, salary-deducted repayment
3. **Salary Payouts** -- salary components, salary structures, assignments, payroll periods, bulk payroll entry, salary slips, additional salary, retention bonuses, incentives, corrections, arrears
4. **Gratuity** -- gratuity rules (experience-based slabs), auto-calculation
5. **Employee Tax & Benefits** -- income tax slabs, exemption categories, declarations, proof submissions, other income, benefit applications/claims
6. **Flexible Benefits** -- accrue-and-payout / accrue-per-cycle / claim-up-to-limit models, accrual components, benefit ledger entries, accrued earnings reports
7. **Reports** -- monthly attendance, leave balance/ledger, salary register/slips, tax exemption proofs, loan repayment/ledger, gratuity, overtime summary, employee CTC break-up, project profitability

## Phase 3: Talent Management & Operations

The Phase 3 SOW (`docs/sow/hr-phase-3.md`) adds performance, recruitment, training, and fleet management. **No code exists for Phase 3 yet.**

Modules planned:

1. **Performance Management** -- goals (hierarchical with progress cascade), appraisal templates (KRA weightages), appraisal cycles, appraisals (automated/manual scoring, feedback, self-appraisal), performance feedback
2. **Recruitment** -- staffing plans, job requisitions, job openings, job portal, applicants, interviews (types/rounds/feedback), job offers, appointment letters, employee referrals
3. **Training** -- training programs, events (invitations, certificates), results, feedback
4. **Fleet Management** -- vehicles, vehicle logs, expense claims, fleet reports

**Cross-module integrations**: Recruitment to Lifecycle (offer acceptance triggers onboarding), Performance to Salary, Training to Skill Map, Goals to Appraisal.

## Validation Schemas

All Phase 1 schemas are complete in `src/schemas/` (9 files, ~1,500 lines). They use **Valibot** and follow the `Create*Schema` / `Update*Schema` / `*FiltersSchema` naming convention.

| File | Content |
|---|---|
| `enums.ts` (163 lines) | 23 valibot `enum_` schemas covering all HR domain enums |
| `utils.ts` (39 lines) | `NameSchema`, `EmployeeIdSchema`, `EmailSchema`, `PhoneSchema`, `DateStringSchema`, etc. |
| `employee.ts` (219 lines) | Employee create/update/filters, group, health insurance, skill map schemas |
| `attendance.ts` (130 lines) | Attendance, checkin, attendance request schemas |
| `shift.ts` (222 lines) | Shift type (with auto-attendance params), location, assignment, request, schedule schemas |
| `leave.ts` (364 lines) | Leave type, period, policy, allocation, application, compensatory, encashment, block list, adjustment schemas |
| `lifecycle.ts` (302 lines) | Onboarding, promotion, transfer, separation, exit interview, full-and-final schemas |
| `overtime.ts` (94 lines) | Overtime type, slip schemas |
| `setup.ts` (190 lines) | HR settings, payroll settings, employment type, department, designation, grade, holiday schemas |
| `index.ts` (271 lines) | Barrel re-export of all schemas and types |

## Workflows

All Phase 1 workflows are complete in `src/workflows/` (7 files, ~4,370 lines). They perform real DB operations via drizzle and validate input with Valibot `parse()`.

| File | Class | Lines | Tables Referenced |
|---|---|---|---|
| `employee.ts` | `EmployeeWorkflow` | 524 | `employee`, `employeeGroup`, `employeeGroupMember`, `employeeHealthInsurance`, `employeeSkillMap` |
| `attendance.ts` | `AttendanceWorkflow` | 400 | `attendance`, `attendanceRequest`, `employeeCheckin` |
| `shift.ts` | `ShiftWorkflow` | 535 | `shiftType`, `shiftLocation`, `shiftAssignment`, `shiftRequest`, `shiftSchedule`, `shiftScheduleAssignment` |
| `leave.ts` | `LeaveWorkflow` | 1181 | 12 leave tables including `leaveLedgerEntry` |
| `lifecycle.ts` | `LifecycleWorkflow` | 907 | `employeeOnboarding`, `onboardingTask`, `employeePromotion`, `employeeTransfer`, `employeeSeparation`, `separationTask`, `exitInterview`, `fullAndFinalStatement` |
| `overtime.ts` | `OvertimeWorkflow` | 270 | `overtimeType`, `overtimeSlip` |
| `setup.ts` | `SetupWorkflow` | 553 | `hrSettings`, `payrollSettings`, `employmentType`, `department`, `designation`, `employeeGrade`, `holidayList`, `holiday` |

All workflows follow the pattern: `constructor(private readonly db: NodePgDatabase) {}` with synchronous CRUD methods that `parse()` input before writing.

## Integration Points

The HR module integrates with other framework units and modules:

| Integration | Usage |
|---|---|
| **DatabaseUnit** | All workflow DB operations via drizzle |
| **PubSubUnit** | Planned -- for event publishing (attendance marked, leave applied, etc.) |
| **AuthUnit** | Employee records reference auth `user.id` via `userId` field |
| **Tasks module** | Tasks SOW references HR for assignee resolution (Employee to Assignee mapping) and business-day awareness (Holiday List) |
| **Drive module** | Employee document attachments (resumes, contracts, certificates) |

### Dependencies

- **Required**: `@aspen-os/platform`, `drizzle-orm`, `valibot`
- **Optional**: `@aspen-os/constants` (for shared enums if promoted from local)
- **Cross-module**: Tasks module optionally depends on HR for employee resolution and business-day logic

## Package Structure

```
packages/hr/
  src/
    index.ts              # Skeleton -- needs rewrite to follow Domain Module Pattern
    db-schema.ts          # EMPTY -- ~39 tables need to be defined
    types.ts              # EMPTY -- needs re-exports + 4 domain interfaces
    event-map.ts          # EMPTY -- HR events not yet defined
    schemas/
      index.ts            # Barrel re-exports (271 lines)
      enums.ts             # 23 valibot enum schemas
      utils.ts             # Shared validators
      employee.ts          # Employee + group + insurance + skills
      attendance.ts        # Attendance + checkin + requests
      shift.ts             # Shift types, locations, assignments, schedules
      leave.ts             # Full leave ledger system (364 lines)
      lifecycle.ts         # Onboarding, promotion, transfer, separation
      overtime.ts          # Overtime types and slips
      setup.ts             # Settings, departments, designations, holidays
    workflows/
      index.ts             # Barrel re-exports
      employee.ts          # EmployeeWorkflow (524 lines)
      attendance.ts        # AttendanceWorkflow (400 lines)
      shift.ts             # ShiftWorkflow (535 lines)
      leave.ts             # LeaveWorkflow (1181 lines -- largest)
      lifecycle.ts         # LifecycleWorkflow (907 lines)
      overtime.ts          # OvertimeWorkflow (270 lines)
      setup.ts              # SetupWorkflow (553 lines)
```

## SOW References

- [Phase 1: Core Operations](../../docs/sow/hr-phase-1.md) -- setup, employee, attendance, shifts, leave, lifecycle, overtime
- [Phase 2: Compensation & Financials](../../docs/sow/hr-phase-2.md) -- expenses, loans, payroll, gratuity, tax, flexible benefits
- [Phase 3: Talent Management & Operations](../../docs/sow/hr-phase-3.md) -- performance, recruitment, training, fleet
