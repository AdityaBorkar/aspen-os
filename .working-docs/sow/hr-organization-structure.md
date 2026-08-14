# HR Module — Organization Structure (Scope of Work)

> Scope of Work for the **Organization Structure** feature of the `@aspen-os/hr` module. Adds a first-class structural layer — job positions, position assignments, department hierarchy management, and structure views — on top of the existing employee `reportsTo` chart.

## Overview

The HR module already models the two primitive dimensions of an organization: the **employee reporting hierarchy** (`employee.reportsTo`, exposed as `p.hr.employee.getOrganizationalChart()`) and the **department tree** (`department.parentDepartment`). The Organization Structure feature makes structure an explicit, managed domain: **positions** become stable job slots that employees are assigned to, **department hierarchy** gains tree management and head-of-department assignment, and a family of **structure queries** (org tree, department tree, direct reports, team, peers) gives HR and employees a single source of truth for "who sits where and reports to whom."

The feature is implemented **inside the existing `@aspen-os/hr` module** — no new package. It follows the module's established patterns: table files under `db-schemas/`, one workflow file per action under `workflows/`, valibot schemas in `schemas/`, ACL entries in `auth.ts`, event groups in `pubsub.ts`. It adds a new `position` workflow group (`p.hr.position.*`) and extends the existing `setup` (department tree) and `employee` (chart queries) groups.

New tables are **tenant-scoped operational data** — they live in tenant schemas (per ADR-0008 and the existing 36-table tenant split). References to `employee`, `department`, `designation`, and `branch` are soft FKs only — no DB-level foreign key constraints (repo convention).

---

## 1. Position

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

Builds on the existing `department` table (`parent_department`, `manager`, `code`). No new table; adds tree-management workflows and two optional columns.

**Schema additions to `department`**:

- **Cost Center** — text (nullable): accounting/cost-center code.
- **Headcount** — integer (nullable): sanctioned headcount for headcount reporting.

**Operations** (extend the `setup` group):

- `moveDepartment(id, newParentId)` — re-parent a department; rejects cycles (reuse `validateParentDepartment`), updates the subtree.
- `setDepartmentHead(id, employeeId)` — set/clear `department.manager`; emits `department:head_changed`.
- `getDepartmentTree()` — full tree: name, code, manager (head), active position count, active employee count.
- `getDepartmentSubtree(id, depth?)` — subtree rooted at a department.
- `listPositionsByDepartment(id)` — active positions under a department (direct + subtree toggle).

**Constraints**:

- Cycle prevention and max-depth guard reuse the existing `wouldCreateCircular` util (max depth 10).
- A department cannot be deleted while it has children, active positions, or employees.
- Moving a department does not reassign its employees — employees keep `department`; the tree is re-parented only.

---

## 4. Structure Reconciliation with Employee Lifecycle

Structure must stay consistent as employees change:

- **Promotion** (`lifecycle.promotion`) — on approval, position assignment's designation-relevant fields are out of scope; the position itself is unchanged. The promotion updates `employee.designation`.
- **Transfer** (`lifecycle.transfer`) — on approval, if the employee's current position belongs to the old department, HR is offered an automatic `transferAssignment` to a matching position in the new department (soft guidance, not enforced).
- **Separation** (`lifecycle.separation`) — on completion, open-ended position assignments of the employee are auto-closed (`toDate = exitDate`), and `position:unassigned` is emitted.

---

## 5. Structure Views & Queries

A single family of read workflows answers "who sits where, who reports to whom."

| Query                                | Returns                                                                                                                                                                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getOrgTree()`                       | Position tree (via `reportsToPosition`) with incumbent employees, department, branch; filtered by `company` like the existing chart.                                                                                                        |
| `getPositionTree(positionId?)`       | Sub-position subtree for one position (default root).                                                                                                                                                                                       |
| `getDepartmentTree()`                | §3 department tree with heads and counts.                                                                                                                                                                                                   |
| `getDirectReports(managerId)`        | Employees whose `employee.reportsTo = managerId` (existing shape).                                                                                                                                                                          |
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

---

## 7. Dependencies & Prerequisites

| Dependency                        | Reason                                                                                          |
| --------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Employee master**               | Incumbents, direct reports, org chart all read the `employee` table.                            |
| **Department master**             | Positions belong to departments; tree ops manage `parent_department`.                           |
| **Designation / Employment Type** | Optional position fields referencing the `setup` group.                                         |
| **Branch**                        | Optional `branch` scoping on positions; employees already carry `branch`.                       |
| **Access group**                  | Optional: branch-scoped visibility of structure queries for HR users (`hr_user_branch_access`). |
| **Lifecycle group**               | Transfer/separation hooks auto-close assignments.                                               |

---

## 8. Cross-Module Integrations

| Integration        | Flow                                                                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **HR `employee`**  | Incumbents via `position_assignment`; chart queries (`getOrgChart`, direct reports) read `employee.reportsTo`.                                  |
| **HR `setup`**     | `department`, `designation` refs; department tree ops + head assignment.                                                                        |
| **HR `lifecycle`** | Promotion/transfer/separation reconcile position assignments (§4).                                                                              |
| **HR `access`**    | Structure query scoping by branch access level; HR-user authors.                                                                                |
| **Announcements**  | Positions become a first-class audience type (`position` / department-with-descendants already supported) for targeting employees by structure. |
| **Platform**       | `getContext().actorId`; per-request ACL via `defineAcl`.                                                                                        |

---

## 9. RBAC Model

### ACL Additions (`packages/hr/src/auth.ts`)

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

Seeds should register `module = "position"` permissions (`create`, `read`, `update`, `delete`) for the admin/system roles via the existing `hr_permission` / `hr_role_permission` tables.

---

## 10. Out of Scope

- **Cost-center accounting / budgeting** — `costCenter` is a label only; no budget allocation or finance integration.
- **Headcount planning / requisitions** — creating positions from hiring requests (recruitment phase 3).
- **Succession planning / talent pools**.
- **Drag-and-drop org chart editing** — the chart is read-only; edits happen through position/department workflows.
- **Multi-company consolidation** — positions belong to a single company (`employee.company`); no corporate tree.
- **Direct-hire assignment on onboarding** — assigning a new hire to a position happens manually or via future onboarding integration.
- **Structure analytics dashboards** beyond per-node counts (department/position fill, span of control) returned by existing queries.

---

## 11. Implementation Notes

### Module Structure (additions to `packages/hr`)

```
packages/hr/src/
├── db-schemas/
│   ├── position.ts            # hr_position + hr_position_assignment
│   └── setup.ts               # department + costCenter, headcount columns
├── schemas/
│   ├── position.ts            # CreatePositionSchema, UpdatePositionSchema,
│   │                          #   PositionFiltersSchema, AssignEmployeeSchema,
│   │                          #   TransferAssignmentSchema + InferOutput types
│   └── setup.ts               # + MoveDepartmentSchema, SetDepartmentHeadSchema
├── workflows/
│   ├── position.create.ts
│   ├── position.update.ts
│   ├── position.delete.ts
│   ├── position.deactivate.ts
│   ├── position.activate.ts
│   ├── position.get-by-id.ts
│   ├── position.list.ts
│   ├── position.assign-employee.ts
│   ├── position.unassign-employee.ts
│   ├── position.transfer-assignment.ts
│   ├── position.get-position-history.ts
│   ├── position.get-employee-position-history.ts
│   ├── position.get-org-tree.ts
│   ├── position.get-position-tree.ts
│   ├── position.get-direct-reports.ts
│   ├── position.get-subordinates.ts
│   ├── position.get-peers.ts
│   ├── position.get-team.ts
│   ├── setup.move-department.ts
│   ├── setup.set-department-head.ts
│   ├── setup.get-department-tree.ts
│   ├── setup.get-department-subtree.ts
│   ├── employee.get-org-chart.ts   # enhanced: + department/position, filters
│   └── barrel-position.ts
├── utils/
│   ├── position-utils.ts      # manager resolver (position chain → reportsTo fallback),
│   │                          #   cycle detection, headcount enforcement, close-assignment
│   └── constants.ts
├── auth.ts                    # + position ACL resource
├── pubsub.ts                  # + PositionEventMap + POSITION_EVENTS, DEPARTMENT tree events
├── types.ts                   # + position schemas/types, OrgTreeNode, PositionTreeNode
└── module.ts                  # + readonly position = { ... } group; setup/employee extended
```

### Domain Events

| Event                     | Payload                                                | Trigger                                              |
| ------------------------- | ------------------------------------------------------ | ---------------------------------------------------- |
| `position:created`        | `{ position: { id, name, department } }`               | Position created.                                    |
| `position:updated`        | `{ position: { id }, changes }`                        | Position edited (incl. re-parent).                   |
| `position:deactivated`    | `{ positionId }`                                       | Position deactivated.                                |
| `position:activated`      | `{ positionId }`                                       | Position reactivated.                                |
| `position:assigned`       | `{ assignment: { positionId, employeeId, fromDate } }` | Employee assigned to a position.                     |
| `position:unassigned`     | `{ positionId, employeeId, toDate }`                   | Assignment closed (manual, transfer, or separation). |
| `position:reassigned`     | `{ employeeId, fromPositionId, toPositionId }`         | Employee transferred between positions.              |
| `department:head_changed` | `{ departmentId, headEmployeeId }`                     | Department head set/cleared.                         |
| `department:moved`        | `{ departmentId, fromParentId, toParentId }`           | Department re-parented.                              |

> **PubSub pitfall**: `position:*` / `department:moved` are producer-only topics unless a consumer subscribes. Follow the platform rule — `publish()` must throw (not silently drop) when no queue row exists for the topic.

### Phase Sequencing

**Phase 1 — Positions**: `hr_position` table, position CRUD + deactivate/activate, `reportsToPosition` cycle guard, list filters.

**Phase 2 — Assignments**: `hr_position_assignment`, assign/unassign/transfer, headcount + primary-constraint enforcement, history queries, lifecycle reconciliation (separation auto-close).

**Phase 3 — Structure views**: org tree, position tree, department tree ops (`moveDepartment`, `setDepartmentHead`, subtree queries), direct reports / subordinates / peers / team, enhanced `getOrgChart` (department + position fields, filters).

### Estimated Effort (Relative)

| Area                     | Complexity | Notes                                                                    |
| ------------------------ | ---------- | ------------------------------------------------------------------------ |
| Position CRUD            | Low        | Standard lifecycle + hierarchy fields.                                   |
| Position hierarchy       | Medium     | Cycle detection, depth guard, subtree reads.                             |
| Assignment + history     | Medium     | Headcount/primary constraints, transfer semantics.                       |
| Manager resolution       | Medium     | Position-chain → `reportsTo` fallback; consistent across queries.        |
| Department tree ops      | Medium     | Re-parenting, cycle reuse (`validateParentDepartment`), head assignment. |
| Structure views          | Medium     | Tree aggregation with incumbent + count projection.                      |
| Lifecycle reconciliation | Low        | Separation auto-close; transfer guidance.                                |
| RBAC                     | Low        | One new ACL resource + permission seeds.                                 |

### Testing Focus Areas

- **Position hierarchy**: cycle rejection, self-parent, max-depth guard, subtree reads after re-parent.
- **Assignment constraints**: headcount cap, one open-ended assignment per position, unique primary, transfer closes source assignment.
- **Manager resolution**: derived manager via position chain vs `employee.reportsTo` fallback; consistency across `getDirectReports`/`getTeam`.
- **Department tree**: moveDepartment cycle prevention, head set/clear, subtree projection, delete guards.
- **Reconciliation**: separation auto-closes assignments; transfer guidance; events emitted.
- **Org chart**: enhanced nodes (department, position), filters by department/branch/position, existing `buildEmployeeTree` behavior unchanged for empty filters.
