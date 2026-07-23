# @aspen-os/reports

A placeholder package for a centralized reporting module within the Aspen OS platform. Currently a stub with no implementation.

## Table of Contents

- [Overview](#overview)
- [Status](#status)
- [Current Reporting Capabilities](#current-reporting-capabilities)
- [Planned Direction](#planned-direction)
- [Integration Points](#integration-points)

## Overview

The reports package is intended to provide a unified reporting layer across all Aspen OS domain modules. It does not currently contain any source code.

**Package**: `@aspen-os/reports`  
**Module name**: `"reports"` (planned)  
**Current state**: Empty -- `src/index.ts` is 0 bytes, `package.json` has name only

## Status

**Not started.** The package has:
- No `package.json` dependencies, exports, or scripts
- No source files (empty `src/index.ts`)
- No database schema
- No workflows or services
- No validation schemas
- No event map
- No SOW document

## Current Reporting Capabilities

Reporting functionality is currently implemented as **per-module services** rather than through a centralized reports package:

| Module | Service | Reports Available |
|---|---|---|
| **Tasks** | `TaskModule` -> `ReportService` (`packages/tasks/src/services/report-service.ts`) | Task summary, workload, velocity, burndown, cumulative flow, time report |
| **Organization** | (planned via SOW) | No dedicated report service yet |
| **HR** (Phase 2 planned) | (per SOW) | Monthly attendance, leave balance/ledger, salary register/slips, tax exemption proofs, loan repayment/ledger, gratuity, overtime summary, employee CTC break-up, project profitability |
| **Drive** | `SearchService` (`packages/drive/src/services/search-service.ts`) | Full-text search with scope/type/label/date/size filters (not a report service per se, but provides query capabilities) |

### Accessing existing reports

```ts
// Tasks reports (already implemented)
platform.tasks.reports.getTaskSummary(projectId?)
platform.tasks.reports.getWorkload(userId?)
platform.tasks.reports.getVelocity(projectId)
platform.tasks.reports.getBurndown(projectId)
platform.tasks.reports.getTimeReport(filters?)
```

## Planned Direction

Based on the SOW documents and `docs/TODO.md`, the following reporting areas are planned across the system:

### From Tasks SOW (Section 7)
- Task Summary (by status, priority, type, assignee)
- Workload Distribution (per-user task count and time allocation)
- Velocity Tracking (completed tasks per sprint/period)
- Burndown Charts (remaining work over time)
- Cumulative Flow Diagram (WIP over time)
- Time Reports (billable vs non-billable hours)

### From HR Phase 2 SOW (Section 7)
- Monthly Attendance Report
- Leave Balance and Ledger Reports
- Salary Register and Salary Slips
- Tax Exemption Proof Reports
- Loan Repayment and Ledger Reports
- Gratuity Reports
- Overtime Summary Reports
- Employee CTC Break-Up
- Project Profitability Reports

### Potential Centralized Reports Module

A future `@aspen-os/reports` package could provide:

1. **Cross-module dashboards** -- aggregate metrics from tasks, HR, organization, and drive
2. **Report builder** -- configurable report templates with filters and groupings
3. **Export capabilities** -- PDF, Excel, CSV export of report data
4. **Scheduled reports** -- recurring report generation and delivery via PubSub
5. **Report sharing** -- shareable report links with access control

## Integration Points

When implemented, the reports module would integrate with:

| Integration | Usage |
|---|---|
| **DatabaseUnit** | Read-only queries across all module tables |
| **PubSubUnit** | Scheduled report generation, report delivery notifications |
| **AuthUnit** | Access control for report visibility |
| **StorageUnit** | Exported report file storage |
| **All domain modules** | Data sources (tasks, organization, HR, drive) |

## Package Structure (Planned)

```
packages/reports/
  src/
    index.ts              # ReportsModule class (planned)
    db-schema.ts          # Report templates, saved reports, schedules (planned)
    types.ts              # Report configuration types (planned)
    event-map.ts          # Report generation/delivery events (planned)
    schemas/
      index.ts            # Validation schemas (planned)
    workflows/
      report-builder.ts   # Dynamic report generation (planned)
      scheduler.ts        # Scheduled report execution (planned)
    services/
      export-service.ts   # PDF/Excel/CSV export (planned)
      query-engine.ts     # Cross-module query execution (planned)
```
