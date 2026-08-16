# HR Module — Organization Structure (Scope of Work)

> Scope of Work for the **Organization Structure** feature of the `@aspen-os/hr` module. Adds a first-class structural layer — job positions, position assignments, department hierarchy management, and structure views — on top of the existing employee `reportsTo` chart.

## Status

> **Complete** — all four phases executed, gated green, and recorded below.

- **Phase 1 — Positions**: ✅ Done — `hr_position` table, position CRUD + deactivate/activate, `reportsToPosition` cycle guard, list filters; department `costCenter`/`headcount` columns; `HR_PERMISSION_MODULE.POSITION` + `position` ACL resource. Gate green (package `check:lint` + `check:types`; HR has no `build` script).
- **Phase 2 — Assignments**: ✅ Done — `hr_position_assignment`, assign/unassign/transfer with headcount + unique-primary enforcement, delete/deactivate active-assignment guard, history + current reads, `getById` incumbents, list fill state. Gate green.
- **Phase 3 — Department tree ops & structure views**: ✅ Done — `moveDepartment`, `setDepartmentHead`, department tree/subtree, `listPositionsByDepartment`, tightened `deleteDepartment` guard; org tree, position tree, direct reports / subordinates / peers / team, enhanced `getOrgChart`; lifecycle reconciliation subscription (separation auto-close, transfer guidance) + lifecycle event publishing. Gate green (package + root checks).
- **Phase 4 — Docs & verification**: ✅ Done — package docs updated (`overview`, `workflows`, `index`), domain docs updated (`domain-model/hr.md`, `bounded-contexts/hr.md`, `DOMAIN_MODEL.md`, `CONTEXT.md`), promotion approval now syncs `employee.designation`, sweep greps clean. Gate green (docs `check:types` + build; root `check:lint` + `check:types`).

## Overview

The HR module already models the two primitive dimensions of an organization: the **employee reporting hierarchy** (`employee.reportsTo`, exposed as `p.hr.employee.getOrganizationalChart(company?)`) and the **department tree** (`department.parentDepartment`, managed through `p.hr.setup.createDepartment` / `updateDepartment` / `deleteDepartment`). The Organization Structure feature makes structure an explicit, managed domain: **positions** become stable job slots that employees are assigned to, **department hierarchy** gains tree management and head-of-department assignment, and a family of **structure queries** (org tree, department tree, direct reports, team, peers) gives HR and employees a single source of truth for "who sits where and reports to whom."

The feature is implemented **inside the existing `@aspen-os/hr` module** — no new package. It follows the module's established patterns: table files under `db-schemas/`, one workflow file per action under `workflows/<group>/<entity>/<action>.ts` aggregated by per-group barrels (`barrel-<group>.ts`), valibot schemas in `schemas/`, ACL entries in `auth.ts`, event groups in `pubsub.ts`. It adds a new `position` workflow group (`p.hr.position.*`) and extends the existing `setup` (department tree) and `employee` (chart queries) groups.

New tables are **tenant-scoped operational data** — they live in tenant schemas (per ADR-0008 and the existing 36-table tenant split; adding these two tables raises the tenant count to 38). References to `employee`, `department`, `designation`, and `branch` are soft FKs only — no DB-level foreign key constraints (repo convention). The branch master itself lives in `@aspen-os/organization`; HR references branches by soft text key (`employee.branch`), and positions follow the same pattern.

---

## 1. Position

> ✅ **Phase 1 done** — table, CRUD, cycle guard, list filters, RBAC vocabulary implemented.

A position is a stable job slot in the organization's structure. Positions exist independent of any single employee (an employee occupies a position; a position outlives an employee).

| Field                   | Type                     | Description                                                                                        |
| ----------------------- | ------------------------ | -------------------------------------------------------------------------------------------------- |
| **ID**                  | text (auto)              | System-generated unique identifier (UUID v7).                                                      |
| **Name**                | text                     | Position title (e.g., `Senior Backend Engineer`).                                                  |
| **Department**          | text (soft FK)           | Owning department (from the `setup` group).                                                        |
| **Branch**              | text (nullable)          | Physical branch, if branch-specific.                                                               |
| **Designation**         | text (nullable)          | Designation tier, if the position maps to one.                                                     |
| **Reports To Position** | text (soft FK, nullable) | Parent position in the position hierarchy; `null` = reports to the department head / top of chain. |
| **Employment Type**     | text (nullable)          | Default employment type (permanent, contract, …).                                                  |
| **Headcount**           | integer                  | Number of employees this position can hold (default `1`).                                          |
| **Job Description**     | text (nullable)          | Role responsibilities.                                                                             |
| **Is Active**           | boolean                  | Soft lifecycle flag. Default `true`.                                                               |
| **Created At**          | timestamptz              | Record creation timestamp.                                                                         |
| **Updated At**          | timestamptz              | Last modification timestamp.                                                                       |

**Operations**:

- `create(input)` — create a position under a department and optional parent position.
- `update(id, patch)` — edit title, department, branch, designation, headcount, job description, reports-to.
- `delete(id)` — soft-delete; blocked while active assignments exist (see constraints).
- `deactivate(id)` / `activate(id)` — toggle `isActive`.
- `getById(id)` — position with incumbent(s) and direct-sub-position count.
- `list(filters?)` — filter by department, branch, designation, isActive, with headcount fill state.

**Constraints**:

- Position names must be unique within a department.
- `reportsToPosition` cannot create a cycle (walk ancestors, max depth guard — mirror `wouldCreateCircular` in `workflows/utils.ts`).
- Cannot deactivate a position with active assignments.
- A position cannot be moved into a different department while holding active assignments without explicit reassignment (or the move is allowed and assignments follow — see §4).
- Assignments cannot exceed `headcount`.

---

## 2. Position Assignment

> ✅ **Phase 2 done** — table, assign/unassign/transfer, constraints, history queries implemented.

Links employees to positions, with full history. A position has a _current_ incumbent set; past assignments are retained as history.

| Field           | Type            | Description                                              |
| --------------- | --------------- | -------------------------------------------------------- |
| **ID**          | text (auto)     | System-generated unique identifier (UUID v7).            |
| **Position ID** | text (soft FK)  | Assigned position.                                       |
| **Employee ID** | text (soft FK)  | Assigned employee.                                       |
| **From Date**   | date            | Assignment start.                                        |
| **To Date**     | date (nullable) | Assignment end; `null` = current/open-ended.             |
| **Is Primary**  | boolean         | Employee's primary role when holding multiple positions. |
| **Created At**  | timestamptz     | Record creation timestamp.                               |
| **Updated At**  | timestamptz     | Last modification timestamp.                             |

**Operations**:

- `assignEmployee(positionId, employeeId, input?)` — create a current assignment; closes any open-ended assignment of the same employee that conflicts, and honors `headcount`.
- `unassignEmployee(assignmentId, toDate)` — close an open-ended assignment (set `toDate = today`).
- `transferAssignment(assignmentId, newPositionId)` — reassign an employee from one position to another; closes the source assignment and opens one at the target.
- `getPositionHistory(positionId)` — all assignments for a position (current + past).
- `getEmployeePositionHistory(employeeId)` — all positions an employee has held.
- `getCurrentAssignment(positionId)` / `getCurrentPositions(employeeId)` — convenience reads.

**Constraints**:

- An employee has at most **one open-ended (current) assignment per position**.
- `isPrimary = true` is unique per employee among current assignments.
- `headcount` enforcement: a position with `headcount = 1` can have at most one open-ended assignment.
- Assignment change does not rewrite `employee.reportsTo` — the reporting hierarchy is derived from assignments where the position's `reportsToPosition` chain exists, and falls back to `employee.reportsTo` otherwise (see §5).

---

## 3. Department Hierarchy Management

> ✅ **Phase 3 done** — tree ops, head assignment, delete guard, structure views, reconciliation subscription implemented.

Builds on the existing `department` table — no new table. **Current state**: the control-plane `department` table (`db-schemas/setup.ts`) carries `code` (unique, uppercased on write), `name`, `manager`, `parentDepartment`, `isActive`, `metadata` (jsonb), `createdAt`, `updatedAt`. `updateDepartment` already re-parents safely (self-parent guard + `validateParentDepartment`, which walks ancestors via `wouldCreateCircular` with a max depth of 10). `deleteDepartment` is today an **unguarded soft delete** (`isActive = false`). This SOW adds tree-management workflows, head assignment, and two optional columns — and tightens the delete guard.

**Schema additions to `department`**:

- **Cost Center** — text (nullable): accounting/cost-center code.
- **Headcount** — integer (nullable): sanctioned headcount for headcount reporting.

**Operations** (extend the `setup` group):

- `moveDepartment(id, newParentId)` — re-parent a department; rejects cycles (reuse `validateParentDepartment`), updates the subtree.
- `setDepartmentHead(id, employeeId)` — set/clear `department.manager`; emits `setup:department_head_changed`.
- `getDepartmentTree()` — full tree: name, code, manager (head), active position count, active employee count.
- `getDepartmentSubtree(id, depth?)` — subtree rooted at a department.
- `listPositionsByDepartment(id)` — active positions under a department (direct + subtree toggle).

**Constraints**:

- Cycle prevention and max-depth guard reuse the existing `wouldCreateCircular` util (max depth 10).
- A department cannot be deleted while it has children, active positions, or employees — **new guard**: today `deleteDepartment` soft-deletes unconditionally; this SOW adds the children/position/employee checks.
- Moving a department does not reassign its employees — employees keep `department`; the tree is re-parented only.

---

## 4. Structure Reconciliation with Employee Lifecycle

> ✅ **Phase 4 note** — `approvePromotion` now syncs `employee.designation` (plus `grade`/`department` when set); separation auto-close and transfer guidance subscribe in `$prepareRuntime()`.

Structure must stay consistent as employees change. The lifecycle group already emits `lifecycle:promotion_approved`, `lifecycle:transfer_approved`, and `lifecycle:separation_completed` (part of the 43-event `HrEventMap`). The reconciliation steps below subscribe to these existing events — the position feature becomes their first consumer:

- **Promotion** (`lifecycle:promotion_approved`) — position assignment's designation-relevant fields are out of scope; the position itself is unchanged. `employee.designation` is synced by the promotion workflow itself — today `p.hr.lifecycle.approvePromotion` only marks the promotion record approved, so syncing `employee.designation` on approval is a **prerequisite this SOW assumes** (or a small lifecycle change this feature ships, noted in Phase 4).
- **Transfer** (`lifecycle:transfer_approved`) — if the employee's current position belongs to the old department, HR is offered an automatic `transferAssignment` to a matching position in the new department (soft guidance, not enforced).
- **Separation** (`lifecycle:separation_completed`) — open-ended position assignments of the employee are auto-closed (`toDate = exitDate`), and `position:unassigned` is emitted.

---

## 5. Structure Views & Queries

A single family of read workflows answers "who sits where, who reports to whom." Today the only structure read is `p.hr.employee.getOrganizationalChart(company?)`, which filters active employees by optional `company` and returns `EmployeeTreeNode[]` (`id`, `name`, `designation`, `image`, `children`) via `buildEmployeeTree` (`workflows/utils.ts`). It has no department/branch/position fields and no structure filters.

| Query                                | Returns                                                                                                                                                                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getOrgTree()`                       | Position tree (via `reportsToPosition`) with incumbent employees, department, branch; filtered by `company` like the existing chart.                                                                                                        |
| `getPositionTree(positionId?)`       | Sub-position subtree for one position (default root).                                                                                                                                                                                       |
| `getDepartmentTree()`                | §3 department tree with heads and counts.                                                                                                                                                                                                   |
| `getDirectReports(managerId)`        | Employees whose `employee.reportsTo = managerId` — new workflow; mirrors the existing org-chart recursion shape.                                                                                                                            |
| `getSubordinates(managerId, depth?)` | Multi-level reporting subordinates.                                                                                                                                                                                                         |
| `getPeers(employeeId)`               | Employees sharing the same `reportsTo`.                                                                                                                                                                                                     |
| `getTeam(employeeId)`                | The employee's position subtree members (position-based team).                                                                                                                                                                              |
| `getOrgChart(filters?)`              | **Enhanced** `employee.getOrganizationalChart()`: adds `department` and optional `position` fields per node, and `filters` for `department`, `branch`, `position`; retains name, image, designation, children (connection count derivable). |

**Position-based reporting**: when an employee has a current position assignment and the position has a `reportsToPosition` chain ending at another position's incumbent, that incumbent is the derived manager. Otherwise the manager is `employee.reportsTo`. A `manager` resolver utility centralizes this fallback so all queries agree.

---

## 6. Data Model Summary

| Schema        | Table                     | Purpose                                                                                    |
| ------------- | ------------------------- | ------------------------------------------------------------------------------------------ |
| tenant        | `hr_position`             | Job position (slot) with hierarchy, department, headcount.                                 |
| tenant        | `hr_position_assignment`  | Employee ↔ position placements with history.                                               |
| control plane | `department` _(extended)_ | + `costCenter`, `headcount` columns; tree ops reuse existing `parentDepartment`/`manager`. |

Table counts move from **50 (14 control-plane + 36 tenant) to 52 (14 + 38)**; the domain-model inventory in `DOMAIN_MODEL.md` and `domain-model/hr.md` must be updated with the two new tenant tables.

---

## 7. Dependencies & Prerequisites

| Dependency                        | Reason                                                                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Employee master**               | Incumbents, direct reports, org chart all read the `employee` table (`reportsTo`, `branch`, `company`).                                                            |
| **Department master**             | Positions belong to departments; tree ops manage `parent_department` (control-plane `setup`).                                                                      |
| **Designation / Employment Type** | Optional position fields referencing the `setup` group (control-plane `designation`, `employment_type`).                                                           |
| **Branch**                        | Optional `branch` scoping on positions; employees already carry `branch` — the branch master lives in `@aspen-os/organization` and is referenced by soft text key. |
| **Access group**                  | `hr_permission` / `hr_role_permission` for `position` permission seeds; optional branch-scoped visibility of structure queries (`hr_user_branch_access`).          |
| **Lifecycle group**               | `lifecycle:promotion_approved`, `lifecycle:transfer_approved`, `lifecycle:separation_completed` hooks auto-close/reconcile assignments.                            |

---

## 8. Cross-Module Integrations

| Integration        | Flow                                                                                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HR `employee`**  | Incumbents via `position_assignment`; chart queries (`getOrgChart`, direct reports) read `employee.reportsTo`.                                                                                          |
| **HR `setup`**     | `department`, `designation` refs; department tree ops + head assignment.                                                                                                                                |
| **HR `lifecycle`** | Promotion/transfer/separation reconcile position assignments via the existing lifecycle events (§4).                                                                                                    |
| **HR `access`**    | Structure query scoping by branch access level; `position` permission seeds through the module's own RBAC tables.                                                                                       |
| **Announcements**  | Positions become a first-class audience type (`position`; department-with-descendants already supported) for targeting employees by structure — depends on the `hr-announcements.md` SOW landing first. |
| **Organization**   | Branch master (`@aspen-os/organization`) is the soft-FK target for `position.branch`; no code coupling.                                                                                                 |
| **Platform**       | `getContext().actorId`; per-request ACL via `defineAcl`.                                                                                                                                                |

---

## 9. RBAC Model

### ACL Additions (`packages/hr/src/auth.ts`)

Add one resource to the existing `defineAcl` call (10 resources today; `position` joins them, shaped like the `employee` resource):

```ts
position: ["create", "delete", "read", "update"],
```

Existing resources cover the rest: `setup` (department tree ops) and `employee` (chart reads) are unchanged.

### Roles

| Role                   | Access                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| **HR Admin**           | Full CRUD on positions, assignments, department moves, department head assignment.                        |
| **HR Manager**         | Create/update positions and assignments; view full structure. Cannot delete.                              |
| **Employee / HR user** | Read structure (org tree, chart, team) — scoped to accessible branches when branch access controls apply. |

Seeds register `module = "position"` permissions (`create`, `read`, `update`, `delete`) for the admin/system roles via the existing `hr_permission` / `hr_role_permission` tables. This requires a new `POSITION` entry in the `HR_PERMISSION_MODULE` constant (`packages/hr/src/utils/constants.ts`, currently `access`, `attendance`, `employee`, `leave`, `lifecycle`, `overtime`, `setup`, `shift`) so the module's permission vocabulary covers the new group.

---

## 10. Out of Scope

- **Cost-center accounting / budgeting** — `costCenter` is a label only; no budget allocation or finance integration.
- **Headcount planning / requisitions** — creating positions from hiring requests (recruitment SOW owns the hiring pipeline; positions are never created from job mandates/openings).
- **Succession planning / talent pools**.
- **Drag-and-drop org chart editing** — the chart is read-only; edits happen through position/department workflows.
- **Multi-company consolidation** — positions belong to a single company (`employee.company`); no corporate tree.
- **Direct-hire assignment on onboarding** — assigning a new hire to a position happens manually or via future onboarding integration.
- **Structure analytics dashboards** beyond per-node counts (department/position fill, span of control) returned by existing queries.
- **Position-based announcement audiences** — deferred to the `hr-announcements.md` SOW; this SOW only guarantees the `position` entity exists to target.

---

## 11. Implementation Notes

### Module Structure (additions to `packages/hr`)

Workflow files follow the module's current layout — one file per action under `workflows/<group>/<entity>/<action>.ts`, aggregated by a per-group barrel. `Workflow.name(...)` values use the `hr.<group>.<kebab-action>` convention (`hr.setup.create-department`).

```
packages/hr/src/
├── db-schemas/
│   ├── position.ts            # hr_position + hr_position_assignment (tenant)
│   └── setup.ts               # department + costCenter, headcount columns (control plane)
├── schemas/
│   ├── position.ts            # CreatePositionSchema, UpdatePositionSchema,
│   │                          #   PositionFiltersSchema, AssignEmployeeSchema,
│   │                          #   TransferAssignmentSchema + InferOutput types
│   └── setup.ts               # + MoveDepartmentSchema, SetDepartmentHeadSchema
├── workflows/
│   ├── position/
│   │   ├── position/create.ts, update.ts, delete.ts, deactivate.ts, activate.ts,
│   │   │   by-id/get.ts, list.ts
│   │   ├── assignment/assign.ts, unassign.ts, transfer.ts,
│   │   │   by-position/history.ts, by-employee/history.ts, current/get.ts
│   │   ├── org-tree/get.ts, position-tree/get.ts, direct-reports/get.ts,
│   │   │   subordinates/get.ts, peers/get.ts, team/get.ts
│   ├── setup/
│   │   ├── department/move.ts, department/set-head.ts
│   │   ├── departments/tree.ts, departments/subtree.ts,
│   │   │   positions-by-department/list.ts
│   ├── employee/
│   │   └── organizational-chart/get.ts   # enhanced: + department/position, filters
│   └── barrel-position.ts
├── utils/
│   ├── position-utils.ts      # manager resolver (position chain → reportsTo fallback),
│   │                          #   cycle detection, headcount enforcement, close-assignment
│   └── constants.ts           # + HR_PERMISSION_MODULE.POSITION
├── auth.ts                    # + position ACL resource
├── pubsub.ts                  # + PositionEventMap + POSITION_EVENTS; SetupEventMap + 2 events
├── types.ts                   # + position schemas/types, OrgTreeNode, PositionTreeNode
└── module.ts                  # + readonly position = { ... } group; setup/employee extended
```

### Domain Events

Every existing HR event is prefixed by its workflow group (`employee:*`, `setup:*`, `lifecycle:*`, …). New events follow the same rule — the department events are `setup:department_head_changed` / `setup:department_moved` (the older `department:*` spelling would break the convention), and the new group's events are `position:*`. The event map grows from 43 to 52: a new `PositionEventMap` (7 events) and two entries on `SetupEventMap`.

| Event                           | Payload                                                | Trigger                                              |
| ------------------------------- | ------------------------------------------------------ | ---------------------------------------------------- |
| `position:created`              | `{ position: { id, name, department } }`               | Position created.                                    |
| `position:updated`              | `{ position: { id }, changes }`                        | Position edited (incl. re-parent).                   |
| `position:deactivated`          | `{ positionId }`                                       | Position deactivated.                                |
| `position:activated`            | `{ positionId }`                                       | Position reactivated.                                |
| `position:assigned`             | `{ assignment: { positionId, employeeId, fromDate } }` | Employee assigned to a position.                     |
| `position:unassigned`           | `{ positionId, employeeId, toDate }`                   | Assignment closed (manual, transfer, or separation). |
| `position:reassigned`           | `{ employeeId, fromPositionId, toPositionId }`         | Employee transferred between positions.              |
| `setup:department_head_changed` | `{ departmentId, headEmployeeId }`                     | Department head set/cleared.                         |
| `setup:department_moved`        | `{ departmentId, fromParentId, toParentId }`           | Department re-parented.                              |

> **PubSub pitfall**: `position:*` and `setup:department_*` are producer-only topics unless a consumer subscribes — pg-boss silently drops a published message when no queue row exists for the topic. The lifecycle-reconciliation hooks (§4) become consumers of `lifecycle:separation_completed` (and optionally `promotion_approved`/`transfer_approved`), but the position/department events themselves need either a host subscription or a `publish()` that throws when no queue row exists for the topic (platform rule). Wire this into the pubsub tests.

### Phase Sequencing

**Phase 1 — Positions**: `hr_position` table, position CRUD + deactivate/activate, `reportsToPosition` cycle guard, list filters. Department `costCenter`/`headcount` columns. `HR_PERMISSION_MODULE.POSITION` + `position` ACL resource + permission seeds. Gate: package `check:lint` + `check:types` + `build`.

**Phase 2 — Assignments**: `hr_position_assignment`, assign/unassign/transfer, headcount + primary-constraint enforcement, history queries. Gate: package `check:lint` + `check:types` + `build`.

**Phase 3 — Department tree ops & structure views**: `moveDepartment`, `setDepartmentHead`, department tree/subtree queries, tightened `deleteDepartment` guard; org tree, position tree, direct reports / subordinates / peers / team, enhanced `getOrgChart` (department + position fields, filters). Lifecycle reconciliation subscription (separation auto-close, transfer guidance). Gate: package `check:lint` + `check:types` + `build`, then root `check:lint` + `check:types`.

**Phase 4 — Docs & verification**: package docs (`packages/hr/docs/*` via the `write-docs` skill), domain-doc updates — `domain-model/hr.md` (sub-domain/aggregate count, table inventory 50 → 52, new `position` group, 43 → 52 events, new invariants), `bounded-contexts/hr.md` (new group + ACL resource + events), `DOMAIN_MODEL.md` table inventory; `CONTEXT.md`/`AGENTS.md` if the HR surface changes warrant it. Sweep greps return clean. Gate: docs `check:types` + build; root `check:lint` + `check:types`.

### Estimated Effort (Relative)

| Area                     | Complexity | Notes                                                                                  |
| ------------------------ | ---------- | -------------------------------------------------------------------------------------- |
| Position CRUD            | Low        | Standard lifecycle + hierarchy fields.                                                 |
| Position hierarchy       | Medium     | Cycle detection, depth guard, subtree reads.                                           |
| Assignment + history     | Medium     | Headcount/primary constraints, transfer semantics.                                     |
| Manager resolution       | Medium     | Position-chain → `reportsTo` fallback; consistent across queries.                      |
| Department tree ops      | Medium     | Re-parenting, cycle reuse (`validateParentDepartment`), head assignment, delete guard. |
| Structure views          | Medium     | Tree aggregation with incumbent + count projection.                                    |
| Lifecycle reconciliation | Low        | Separation auto-close; transfer guidance; event subscription.                          |
| RBAC                     | Low        | One new ACL resource + permission seeds + constant entry.                              |

### Testing Focus Areas

- **Position hierarchy**: cycle rejection, self-parent, max-depth guard, subtree reads after re-parent.
- **Assignment constraints**: headcount cap, one open-ended assignment per position, unique primary, transfer closes source assignment.
- **Manager resolution**: derived manager via position chain vs `employee.reportsTo` fallback; consistency across `getDirectReports`/`getTeam`.
- **Department tree**: moveDepartment cycle prevention, head set/clear, subtree projection, delete guards (children/positions/employees).
- **Reconciliation**: separation auto-closes assignments; transfer guidance; events emitted on `lifecycle:*` events.
- **Org chart**: enhanced nodes (department, position), filters by department/branch/position, existing `buildEmployeeTree` behavior unchanged for empty filters.
- **PubSub**: `position:*`/`setup:department_*` payload correctness; producer-without-consumer throws (no silent drop).
