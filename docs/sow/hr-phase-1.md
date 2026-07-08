# HR Module — Phase 1: Core Operations

> Scope of Work derived from [Frappe HR](https://docs.frappe.io/hr/introduction) — the open-source HRMS reference implementation.

## Overview

Phase 1 establishes the foundational HR infrastructure: organizational structure, time & attendance tracking, shift scheduling, leave management, the employee lifecycle, overtime processing, and system setup. These are the prerequisites for all downstream HR and payroll functionality.

---

## 1. Setup

### 1.1 HR Settings

- Global HR configuration doctype controlling behavior across all modules.
- Toggles for: auto-attendance, geolocation tracking, leave without pay handling, expense claim defaults.
- Configure default holiday list, leave approval workflow, and employee naming series.

### 1.2 Payroll Settings

- Define income tax component and rounding.
- Configure whether benefits application is mandatory.
- Set fiscal year and payroll period boundaries.
- Enable/disable multi-currency expense claims.

### 1.3 Organization Masters

| Master | Purpose |
|---|---|
| **Employment Type** | Classify employees (Permanent, Contract, Intern, Temp, etc.). |
| **Branch** | Physical office locations. |
| **Department** | Organizational units (Accounting, Sales, Engineering, etc.). |
| **Designation** | Job titles (CEO, Sales Manager, Engineer, etc.). |
| **Employee Grade** | Seniority-based classification (A, B, C, etc.). |

### 1.4 Holiday List

- Define annual holidays per region or company.
- Holidays are excluded from leave balance calculations and attendance marking.
- Support for weekly off-days configuration.
- Holiday List Assignment to employees or groups.

---

## 2. Organizational Management

### 2.1 Employee Master

Central record for every employee containing:

- **Personal info**: name, date of birth, gender, contact details, address, emergency contacts.
- **Employment info**: employee ID, date of joining, employment type, department, designation, branch, grade, reports-to (manager).
- **payroll info**: salary structure assignment reference, bank details, tax status.
- **Status**: Active, Inactive, Suspended, Left.
- **Company assignment**: multi-company support — employee belongs to a single company.

### 2.2 Employee Group

- Logical grouping of employees for bulk operations (e.g., assign shifts, send notifications).
- Groups can be based on any criteria — department, project team, skill set, etc.

### 2.3 Employee Health Insurance

- Track health insurance policies assigned to employees.
- Record insurer, policy number, coverage details, validity period.

### 2.4 Organizational Chart

- Visual hierarchy built from the "Reports To" field in Employee master.
- Displays employee name, image, designation, and connection count per node.
- Horizontal layout on desktop, vertical on mobile.
- Filterable by company.
- Interactive — click nodes to navigate to employee records.

---

## 3. Attendance

### 3.1 Attendance Record

- Core doctype: marks whether an employee was Present, Absent, On Leave, or Half Day on a given date.
- Cannot be marked for future dates.
- Supports shift reference linkage.

### 3.2 Employee Attendance Tool

- Bulk attendance marking interface.
- Select employees by department/branch/designation and mark status for a date range.

### 3.3 Attendance Request

- Employee-initiated request to correct or retroactively mark attendance.
- Supports approval workflow (manager → HR).
- Reasons: forget check-in, field duty, client visit, etc.

### 3.4 Upload Attendance

- CSV/bulk upload of attendance records.
- Useful for migrating legacy data or importing from external systems.

### 3.5 Employee Checkin

- Log of individual check-in and check-out events per employee.
- Fields: employee, time, log type (IN/OUT), shift reference, device ID.
- **Geolocation tracking**: optional — fetches and stores lat/long on check-in (desk and mobile).
- **Off-shift indicator**: logs outside assigned shift windows are flagged as "Off-Shift" and excluded from auto-attendance.
- Integration point for biometric/RFID devices.

### 3.6 Auto Attendance

- Automatically marks attendance based on Employee Checkin records.
- Configured per Shift Type with the following parameters:
  - **Check-in interpretation**: alternating IN/OUT entries vs. strict log type.
  - **Working hours calculation**: first-check-in/last-check-out (includes breaks) vs. every valid pair (excludes breaks).
  - **Grace periods**: configurable minutes before shift start and after shift end.
  - **Thresholds**: working hours below which attendance is marked Half Day or Absent.
  - **Holiday handling**: optionally mark attendance on holidays if checkins exist.
  - **Sync tracking**: "Process Attendance After" date and "Last Sync of Checkin" timestamp.
  - **Auto-update sync**: for single-device or mobile-app scenarios.

### 3.7 Biometric Device Integration

- API/webhook integration to push check-in logs from biometric/RFID devices into Employee Checkin records.
- Device mapping to shift types.

### 3.8 Late Entry & Early Exit

- Configurable per shift type.
- Grace period (minutes) after shift start for late entry marking.
- Grace period (minutes) before shift end for early exit marking.
- Flagged on attendance records.

---

## 4. Shift Management

### 4.1 Shift Type

Defines a shift template:

- **Name**, **start time**, **end time** (24hr format).
- Night shifts supported (end time < start time = next calendar day).
- **Holiday list** (per-shift override or default from company).
- **Allow Overtime** toggle + Overtime Type reference.
- All Auto Attendance settings (see §3.6).

### 4.2 Shift Location

- Define physical locations where shifts operate.
- Used for geofencing and attendance validation.

### 4.3 Shift Assignment

- Assigns a Shift Type to an employee for a date range.
- Fixed period (with end date) or ongoing (no end date).
- Can be set to Inactive after submission.
- Calendar view available for visualizing schedules.
- Configurable: allow or disallow multiple shift assignments on the same date (HR Settings).

### 4.4 Shift Request

- Employee-initiated request for a specific shift.
- Approval workflow; on approval, automatically creates a Shift Assignment.

### 4.5 Shift Schedule

- Reusable pattern defining which days of the week a shift repeats.
- Frequency settings (weekly, bi-weekly, etc.).
- Referenced by Shift Schedule Assignment.

### 4.6 Shift Schedule Assignment

- Assigns a Shift Schedule to an employee, generating recurring Shift Assignments automatically.

### 4.7 Shift Assignment Tool

- Bulk assignment interface for assigning shifts to multiple employees at once.
- Filter by department, branch, designation.

### 4.8 Roster

- **Calendar view** of Employee × Day showing assigned shifts, leaves, and holidays.
- Search and filter by company, department, branch, designation, shift type.
- **Create shifts** inline: click a cell to add a shift (regular or repeating/scheduled).
- **View/edit/delete shifts** inline.
- **Move and swap shifts** via drag-and-drop.
- Delete options: single date, all consecutive shifts, or entire schedule assignment.

---

## 5. Leave Management

### 5.1 Leave Type

Define categories of leave:

- **Leave Type Name** (e.g., Sick Leave, Annual Leave, Maternity Leave, Unpaid Leave).
- **Max Days Allowed** per allocation period.
- **Is Carry Forward** — unused days roll to next period.
- **Is Leave Without Pay** — affects salary calculation.
- **Is Partially Paid** — partial salary during leave.
- **Allow Negative Balance** — permit overdraw.
- **Include holidays within leaves as leaves** — counts sandwiched holidays.
- **Applicable After (working days)** — probation period before leave is available.
- **Maximum Continuous Days Allowed** — cap on consecutive days.

### 5.2 Leave Period

- Defines the start and end date of a leave accounting period (typically a fiscal year).

### 5.3 Leave Policy

- Template defining leave allocations per Leave Type for a period.
- Example: 12 days Annual, 10 days Sick, 5 days Personal.
- Applied via Leave Policy Assignment.

### 5.4 Leave Policy Assignment

- Assigns a Leave Policy to an employee for a specific period.
- Bulk-assignable via Leave Control Panel.

### 5.5 Leave Control Panel

- Bulk tool for HR to assign leave policies, allocate leaves, and manage leave periods for groups of employees.

### 5.6 Leave Allocation

- Actual leave balance granted to an employee per Leave Type per period.
- Created manually or via Leave Policy Assignment.
- Supports carry-forward from previous allocation.

### 5.7 Earned Leaves

- Leaves that accrue incrementally (e.g., 1 day per month) rather than being allocated upfront.
- Configurable: accrual frequency, max carry-forward, applicable after certain months.

### 5.8 Leave Application

- Employee applies for leave: select Leave Type, from/to dates, reason.
- Approval workflow: employee → approver (configurable per employee or department).
- Email notifications to approver on submission.
- Auto-updates leave balance on approval.
- Half-day leave support.

### 5.9 Compensatory Leave Request

- Request leave in lieu of working on a holiday or weekend.
- On approval, creates leave allocation for the compensatory leave type.

### 5.10 Leave Encashment

- Cash out unused leave days.
- Amount calculated based on salary and encashable days.
- Creates an Additional Salary record for payment.

### 5.11 Leave Block List

- Prevents employees from applying leave on specific dates (e.g., quarter-end, critical project deadlines).
- Configurable per department or company-wide.
- Optional override for HR users.

### 5.12 Leave Ledger Entry

- Immutable audit trail of all leave transactions: allocations, applications, carry-forward, encashment, adjustments.
- Source of truth for leave balance calculations.

### 5.13 Leave Adjustment

- Manual correction of leave balances by HR.
- Creates a corresponding Leave Ledger Entry.

### 5.14 Holiday List Assignment

- Assign holiday lists to employees individually or in bulk.
- Employees can have different holiday lists based on region or branch.

---

## 6. Employee Lifecycle

### 6.1 Employee Onboarding

- Structured workflow for new hire setup.
- Tasks: document collection, IT equipment provisioning, email setup, orientation scheduling, policy acknowledgments.
- Assignable to different departments/individuals.
- Status tracking per task.

### 6.2 Employee Promotion

- Record promotion details: new designation, grade, salary revision.
- Effective date tracking.
- Linked to employee master update on submission.

### 6.3 Employee Transfer

- Record inter-branch, inter-department, or inter-company transfers.
- Old and new assignments captured.
- Effective date; auto-updates employee master.

### 6.4 Employee Separation

- Structured offboarding workflow.
- Tasks: exit interview, knowledge transfer, asset return, access revocation, final settlement trigger.
- Status tracking per task.

### 6.5 Employee Skill Map

- Inventory of employee skills with proficiency levels.
- Skills can be tagged to employees with self-assessed or manager-assessed ratings.
- Useful for workforce planning and training needs analysis.

### 6.6 Exit Interview

- Survey/questionnaire sent to departing employees.
- Captures feedback for organizational improvement.
- Configurable questionnaire templates.
- Results stored for analytics.

### 6.7 Full and Final Statement

- Settlement calculation upon employee separation.
- Includes: pending salary, leave encashment, bonus, loan recovery, gratuity, deductions.
- Generates payment entry for final disbursement.

---

## 7. Overtime

### 7.1 Overtime Type

- Configure overtime calculation rules:
  - **Max overtime hours per day** — cap beyond which hours are unpaid.
  - **Overtime salary component** — the earnings line item for overtime pay.
  - **Amount calculation**: Fixed hourly rate OR salary-component-based (annual ÷ payment days ÷ standard hours).
  - **Pay rate multipliers**: standard multiplier, holiday multiplier, weekend multiplier.

### 7.2 Overtime via Shift Type

- Enable "Allow Overtime" on a Shift Type and assign an Overtime Type.
- Overtime is calculated from check-in/check-out times exceeding the shift duration.

### 7.3 Overtime Slip

- Generated per employee for a date range.
- "Fetch Overtime Details" populates the slip from attendance records.
- HR approval/rejection workflow.
- On approval, creates an Additional Salary record for inclusion in the next salary cycle.

---

## Data Model Summary (Phase 1 Doctypes)

| Module | Key Doctypes |
|---|---|
| Setup | HR Settings, Payroll Settings, Employment Type, Branch, Department, Designation, Employee Grade, Holiday List |
| Organization | Employee, Employee Group, Employee Health Insurance, Organizational Chart |
| Attendance | Attendance, Employee Checkin, Attendance Request, Upload Attendance |
| Shifts | Shift Type, Shift Location, Shift Assignment, Shift Request, Shift Schedule, Shift Schedule Assignment, Roster |
| Leave | Leave Type, Leave Period, Leave Policy, Leave Policy Assignment, Leave Allocation, Leave Application, Compensatory Leave Request, Leave Encashment, Leave Block List, Leave Ledger Entry, Leave Adjustment |
| Lifecycle | Employee Onboarding, Employee Promotion, Employee Transfer, Employee Separation, Employee Skill Map, Exit Interview, Full and Final Statement |
| Overtime | Overtime Type, Overtime Slip |

---

## Dependencies & Prerequisites

- Employee master must exist before any time-tracking or leave operations.
- Shift Type must exist before Shift Assignment or Auto Attendance.
- Leave Type and Leave Period must exist before Leave Policy or Leave Application.
- Holiday List must exist before attendance/leave processing.
- Employee Checkin records are prerequisites for Auto Attendance and Overtime.

## Out of Scope (Phase 1)

- Salary processing, payroll entry, salary slips (Phase 2).
- Expense claims, loans, tax calculation (Phase 2).
- Performance management, recruitment, training (Phase 3).
- Fleet management (Phase 3).
