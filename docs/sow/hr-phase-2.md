# HR Module — Phase 2: Compensation & Financials

> Scope of Work derived from [Frappe HR](https://docs.frappe.io/hr/introduction) — the open-source HRMS reference implementation.

## Overview

Phase 2 builds on the core operations from Phase 1 to deliver the financial backbone of the HR system: employee expense management, company loans, salary structure and payroll processing, gratuity, income tax computation, flexible benefits, and reporting. This phase transforms time & attendance data into actionable compensation.

---

## 1. Travel and Expense Claim

### 1.1 Employee Advance

- Request and track cash advances given to employees before business travel or expenses.
- **Workflow states**: Draft → Paid → Unpaid.
- Linked to Payment Entry on disbursement.
- Can be claimed against via Expense Claim.
- Supports multi-currency advances for international employees.

### 1.2 Expense Claim

- Employees submit claims for business expenses (travel, meals, supplies, etc.).
- **Key fields**: expense type, amount, expense date, cost center, project, description, attached receipts.
- **Multi-level approval workflow**: configurable chain (employee → manager → finance → HR).
- Claims can be linked to an Employee Advance for reconciliation.
- Unclaimed advance amounts are flagged.
- Status tracking: Draft, Approved, Rejected, Paid.
- Creates Journal Entry or Payment Entry on settlement.

### 1.3 Multi-Currency Advance & Expense Claim

- Employees working internationally can receive advances in foreign currencies.
- Exchange rate handling at time of advance and claim.
- Reconciliation accounts per currency.

### 1.4 Travel Request

- Formal request for business travel.
- Captures: destination, purpose, dates, estimated expenses, advance requested.
- Approval workflow before travel commences.
- Links to Employee Advance and Expense Claim.

---

## 2. Loans

### 2.1 Loan Type

- Define categories of company loans (e.g., Housing Loan, Vehicle Loan, Personal Loan, Education Loan).
- **Configuration per type**:
  - Rate of interest (%).
  - Repayment method: Fixed (EMI) or Reducing Balance.
  - Maximum loan amount.
  - Is tax-exempt flag.
  - Linked salary component for payroll deduction.

### 2.2 Loan Application

- Employee applies for a loan: select Loan Type, requested amount, repayment period, purpose.
- Approval workflow (manager → HR → finance).
- On approval, can directly create a Loan record.

### 2.3 Loan

- Disbursed loan record.
- **Auto-generated repayment schedule**: monthly principal + interest breakdown based on repayment method and start date.
- **Repay from Salary**: checkbox to auto-deduct EMI from the employee's Salary Slip.
- **Disbursement Entry**: creates a Journal Entry for the loan disbursement.
- **Loan extension**: edit repayment schedule post-submission (e.g., if employee takes leave without pay).
- **Status tracking**: Sanctioned, Disbursed, Closed, Written Off.
- Linked accounts: Payment Account, Loan Account, Interest Income Account.

---

## 3. Salary Payouts

### 3.1 Salary Component

- Building blocks of salary: **Earnings** and **Deductions**.
- Each component has:
  - **Type**: Earning or Deduction.
  - **Abbr**: short code for salary slip display.
  - **Formula/Condition**: Python expressions for dynamic calculation (e.g., `base * 0.4`).
  - **Depends on Payment Days**: pro-rate based on actual working days.
  - **Is Tax Applicable**: included in taxable income.
  - **Variable Based on Taxable Salary**: auto-calculates income tax from slabs.
  - **Is Flexible Benefit**: enables flexible benefit behavior (see §6).
  - **Accrual Component**: accrues but excluded from gross until explicitly paid.
  - **Do Not Include in Total**: excludes from salary slip totals.

### 3.2 Salary Structure

- Template defining the composition of an employee's salary.
- Contains child tables for **Earnings** and **Deductions** — each row references a Salary Component with its formula/condition.
- Supports formula-based calculation per component.
- One structure can be shared across employees; actual values resolved at assignment time.

### 3.3 Salary Structure Assignment

- Links a Salary Structure to a specific employee.
- Overrides: base amount, variable pay, custom formula values.
- The system reads this (not the Salary Structure directly) when generating Salary Slips.
- Bulk assignment via **Salary Structure Assignment Tool**.

### 3.4 Payroll Period

- Defines the start and end date of a payroll cycle (e.g., fiscal year).
- Used to determine salary slip date ranges and tax calculations.

### 3.5 Payroll Entry

- Bulk payroll processing engine.
- **Flow**:
  1. Select company, payroll period, frequency (monthly/fortnightly/weekly).
  2. **Get Employees**: fetches eligible employees based on filters (department, branch, designation, etc.).
  3. **Create Salary Slips**: generates individual Salary Slip drafts for all selected employees.
  4. **Submit Salary Slips**: locks the slips.
  5. **Make Bank Entry**: creates a Journal Entry for bulk bank transfer.
  6. **Make Payment Entry**: creates individual payment entries.
- Options:
  - **Deduct Tax For Unclaimed Employee Benefits**: tax flexible benefits not yet claimed.
  - **Deduct Tax For Unsubmitted Tax Exemption Proof**: ignore declarations, use only proof submissions.
- Filters for selective payroll processing.

### 3.6 Salary Slip

- Individual employee salary statement for a pay period.
- **Sections**:
  - **Earnings**: all earning components with calculated amounts.
  - **Deductions**: all deduction components (tax, loan repayment, insurance, etc.).
  - **Net Pay**: earnings minus deductions.
  - **Accrued Benefits**: flexible benefits accruing but not yet paid.
- **Working days calculation**: total days, leaves without pay, payment days.
- **Leave calculation**: LWP deductions based on leave records.
- **Loan repayment**: auto-deduction if "Repay from Salary" is enabled on the Loan.
- **Additional Salary**: one-off earnings/deductions (overtime, incentives, corrections) pulled in automatically.
- Status: Draft, Submitted, Cancelled.

### 3.7 Additional Salary

- One-off earning or deduction not part of the regular salary structure.
- Used for: overtime pay (from Overtime Slip), retention bonus, employee incentive, ad-hoc corrections.
- Linked to a Salary Component and payroll date.
- Automatically included in the next Salary Slip for that employee.

### 3.8 Retention Bonus

- Incentive to retain key employees.
- Define: employee, bonus amount, payout date, linked salary component.
- Creates an Additional Salary record on submission.

### 3.9 Employee Incentive

- Performance or achievement-based monetary incentive.
- Define: employee, incentive amount, payroll date, linked salary component.
- Creates an Additional Salary record on submission.

### 3.10 Payroll Correction

- Mechanism to correct previously submitted salary slips.
- Generates negative or positive Additional Salary entries to offset errors in prior periods.

### 3.11 Arrears

- Calculation of salary differences when a salary structure changes retroactively.
- Auto-computes the delta between old and new structures for affected months.
- Paid out as Additional Salary.

---

## 4. Gratuity

### 4.1 Gratuity Rule

- Define gratuity calculation rules based on regional regulations.
- **Components**: salary components included in gratuity calculation (e.g., basic + DA).
- **Experience slabs**: different multipliers for different tenure brackets (e.g., 15 days salary per year of service for 5-10 years).
- **Minimum service period** eligibility.

### 4.2 Gratuity

- Record gratuity payable to an employee upon separation or as per policy.
- **Auto-calculation**: fetches current work experience and computes total gratuity based on the Gratuity Rule.
- **Payment methods**:
  - **Via Salary Slip**: creates an Additional Salary for the gratuity amount, included in the payroll cycle.
  - **Via Payment Entry**: direct disbursement — select Payable Account, Expense Account, Mode of Payment; click "Create Payment Entry" to generate the journal entry.
- **Payable Account** and **Expense Account** configuration for accounting integration.

---

## 5. Employee Tax and Benefits

### 5.1 Income Tax Slab

- Define tax brackets for a payroll period.
- Multiple slabs with lower limit, upper limit, rate (%), and standard deduction.
- Country/regulation-specific — supports multiple tax regimes.
- Applied automatically when the Salary Component has "Variable Based on Taxable Salary" enabled.

### 5.2 Employee Tax Exemption Category

- Government-defined categories of tax-exempt spending (e.g., Section 80C, 80G, 80D in India).
- Configurable categories with sub-categories.

### 5.3 Employee Tax Exemption Sub Category

- Specific heads under each category (e.g., under 80C: Life Insurance Premium, PPF, ELSS, etc.).
- Max exemption amount per sub-category.

### 5.4 Employee Tax Exemption Declaration

- Employee declares planned exemptions at the start of the financial year.
- Used to calculate monthly tax deductions on projected earnings minus declared exemptions.
- Can be submitted mid-year; adjustments applied from next payroll.
- **HRA Exemption**: auto-calculation based on actual rent, basic salary, and metro/non-metro classification.

### 5.5 Employee Tax Exemption Proof Submission

- End-of-year submission of actual proof of declared exemptions.
- System compares declarations vs. proof; unproven exemptions are taxed in the final payroll.
- Optionally, "Deduct Tax For Unsubmitted Tax Exemption Proof" can be enabled to tax unproven amounts earlier.

### 5.6 Employee Other Income

- Employees declare income from sources outside the employer (rental, investments, etc.).
- Included in taxable income projection for accurate TDS calculation.

### 5.7 Employee Benefit Application

- Employees opt into specific flexible benefits from their assigned package.
- If not submitted, the system falls back to Salary Structure Assignment defaults.
- Can be made mandatory via Payroll Settings.

### 5.8 Employee Benefit Claim

- Claim payout for flexible benefits configured as "Pay Against Benefit Claim".
- Claim limit: accrued amount so far (for pro-rata benefits) or full annual amount (for lump-sum benefits).
- Unclaimed amounts auto-disbursed in the final payroll cycle (if configured).
- Creates Additional Salary for the claimed amount.

---

## 6. Flexible Benefits

### 6.1 Overview

Flexible benefit plans allow employees to choose from a menu of employer-provided benefits (health insurance, pension, telephone allowance, meal vouchers, etc.).

### 6.2 Benefit Payout Types

| Type | Behavior |
|---|---|
| **Accrue and payout at end of payroll period** | Amount accrues each cycle; fully paid in the final cycle. |
| **Accrue per cycle, pay only on claim** | Accrues monthly; paid only when employee submits a Benefit Claim. Unclaimed balance optionally auto-paid in final cycle. |
| **Allow claim up to full period limit** | No accruals; employee can claim the entire annual amount at any time. |

### 6.3 Accrual Component

- Salary Component flag "Accrual Component" — records a benefit in the salary slip as *Accrued Earnings*.
- Excluded from gross pay and accounting entries until explicitly paid via Additional Salary.
- Benefit Ledger Entry created for tracking.
- Use case: loyalty bonus accrued monthly, paid after N months.

### 6.4 Benefit Ledger Entry

- Immutable record of every benefit accrual and payout per employee per component.
- Source of truth for benefit balance calculations.

### 6.5 Accrued Earnings Report

- Dashboard showing total accruals vs. payouts per component per employee.
- Actionable: create Additional Salary for pending standard accruals; process Benefit Claims for flexible benefits.

---

## 7. Reports

### 7.1 Human Resources Reports

Standard reports included in the HR module:

| Report | Description |
|---|---|
| **Monthly Attendance Details** | Attendance summary per employee per month. |
| **Employee Leave Balance** | Current leave balances per employee per leave type. |
| **Leave Ledger Report** | Detailed leave transaction history. |
| **Salary Register** | Summary of all salary slips for a pay period. |
| **Salary Slip (Individual)** | Printable/downloadable individual salary slip. |
| **Employee Tax Exemption Proof Submission** | Status of proof submissions. |
| **Loan Repayment Schedule** | EMI breakdown per loan. |
| **Loan Ledger** | Running balance of outstanding loans. |
| **Gratuity** | Gratuity liability report. |
| **Overtime Summary** | Overtime hours and pay per employee. |

### 7.2 Employee CTC Break-Up

- Detailed breakdown of an employee's Cost to Company.
- Shows: basic, HRA, allowances, employer contributions (PF, ESI), benefits — total CTC.

### 7.3 Project Profitability Report

- Allocates employee costs (from salary slips) to projects.
- Compares project revenue vs. employee cost for profitability analysis.

---

## Data Model Summary (Phase 2 Doctypes)

| Module | Key Doctypes |
|---|---|
| Travel & Expense | Employee Advance, Expense Claim, Travel Request |
| Loans | Loan Type, Loan Application, Loan |
| Salary Payouts | Salary Component, Salary Structure, Salary Structure Assignment, Payroll Period, Payroll Entry, Salary Slip, Additional Salary, Retention Bonus, Employee Incentive |
| Gratuity | Gratuity Rule, Gratuity |
| Tax & Benefits | Income Tax Slab, Employee Tax Exemption Category, Employee Tax Exemption Sub Category, Employee Tax Exemption Declaration, Employee Tax Exemption Proof Submission, Employee Other Income, Employee Benefit Application, Employee Benefit Claim |
| Flexible Benefits | Benefit Ledger Entry, Accrued Earnings Report |
| Payroll Correction | Payroll Correction, Arrears |

---

## Dependencies on Phase 1

| Phase 1 Output | Phase 2 Usage |
|---|---|
| Employee Master | Referenced by all salary, loan, expense, and tax records. |
| Attendance records | Used for working days calculation in Salary Slip. |
| Leave Without Pay | Deducted from Salary Slip payment days. |
| Overtime Slip → Additional Salary | Included in Salary Slip earnings. |
| Holiday List | Used for working days and holiday multipliers in overtime. |
| Department/Designation/Branch | Filters for Payroll Entry employee selection. |

## Out of Scope (Phase 2)

- Performance management (Phase 3).
- Recruitment and staffing (Phase 3).
- Training management (Phase 3).
- Fleet management (Phase 3).
