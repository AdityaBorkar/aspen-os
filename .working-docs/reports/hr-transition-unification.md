# Report: Promotion / Transfer / Separation / Onboarding / Assignment — Differences & Unification

> **Update (2026-09-19):** Designations and then the entire position model
> (`hr_position`, `hr_position_assignment`, the `position` workflow group, assignment
> reconciliation) were **removed** from hr-core. §4's recommendation "keep assignment as the
> system of record" is superseded: org structure now lives entirely on `employee`
> (`department` + `reportsTo`), the transition types patch employee fields directly, and
> unifying the four transition tables (§4 steps 1–3) no longer needs an assignment bridge.

> Scope: `packages/hr-core` — the `transition` workflow group (promotion, transfer, separation,
> onboarding) and the `position.assignment` workflow group. Evidence gathered by reading
> `src/db-schemas/{employee,position,enums}.ts`, `src/schemas/{transition,position}.ts`,
> `src/workflows/transition/**`, `src/workflows/position/assignment/**`,
> `src/workflows/{fetch,utils}.ts`, `src/pubsub.ts`, `src/services/reconciliation.ts`.
> Status: observational report, no code changed.

## 1. Tables compared

All five tables share the same skeleton: `uuidv7` PK, `text` `employee_id` (no FK constraint),
`created_at`/`updated_at` timestamptz with `defaultNow()`, indexes on `employee_id` (+ `status`
where present).

|                          | `employee_onboarding`                                                                    | `employee_promotion`                                                            | `employee_transfer`                                                            | `employee_separation`                                                                | `hr_position_assignment`                               |
| ------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| **File**                 | `db-schemas/employee.ts`                                                                 | `db-schemas/employee.ts`                                                        | `db-schemas/employee.ts`                                                       | `db-schemas/employee.ts`                                                             | `db-schemas/position.ts`                               |
| **Date field(s)**        | `completed_at` (ts, nullable)                                                            | `effective_date` (date, NOT NULL)                                               | `effective_date` (date, NOT NULL)                                              | `exit_date` (date, NOT NULL), `resignation_date` (nullable)                          | `from_date` (NOT NULL), `to_date` (nullable)           |
| **Status**               | `hr_onboarding_status`: `pending/in_progress/completed/cancelled`, default `in_progress` | `hr_promotion_status`: `pending/approved/completed/rejected`, default `pending` | `hr_transfer_status`: `pending/approved/completed/rejected`, default `pending` | `hr_separation_status`: `pending/in_progress/completed/cancelled`, default `pending` | **none** — open/closed is encoded as `to_date IS NULL` |
| **Approval columns**     | none                                                                                     | `approved_at/by`, `rejected_at/by`, `rejection_reason`                          | `approved_at/by`, `rejected_at/by`, `rejection_reason`                         | none                                                                                 | none                                                   |
| **Domain payload**       | `metadata` jsonb, `notes`                                                                | `current_department`, `new_department`, `salary_revision`, `reason`             | `from_/to_` × `branch/company/department`, `reason`                            | `metadata` jsonb, `notes`, `reason`                                                  | `position_id`, `is_primary`                            |
| **4 separate pg enums?** | yes                                                                                      | yes                                                                             | yes                                                                            | yes                                                                                  | n/a                                                    |

Key observations:

- The four transition tables are **structurally near-identical**; they differ mainly in payload
  columns and which of two status vocabularies they use.
- The two status vocabularies overlap heavily: `{pending, completed}` is shared; approval types add
  `{approved, rejected}`; onboarding/separation add `{in_progress, cancelled}`.
- `hr_position_assignment` is a different kind of record entirely: an **interval** (from/to dates,
  open-ended while `to_date` is null) with no status machine, no approval, no reason.

## 2. Workflows compared

Workflow inventory (files under `src/workflows/`):

| Action         | promotion/                    | transfer/                     | separation/                            | onboarding/                                     | position/assignment/                                                 |
| -------------- | ----------------------------- | ----------------------------- | -------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------- |
| create         | `create.ts`                   | `create.ts`                   | `create.ts`                            | `create.ts`                                     | `assign.ts`                                                          |
| get by id      | `by-id/get.ts`                | `by-id/get.ts`                | `by-id/get.ts`                         | `by-id/get.ts`                                  | — (via `current/get.ts`)                                             |
| list + filters | `promotions/list.ts`          | `transfers/list.ts`           | `separations/list.ts`                  | `onboardings/list.ts`                           | `current/get.ts`, `by-employee/history.ts`, `by-position/history.ts` |
| update         | `update.ts` (no status patch) | `update.ts` (no status patch) | `update.ts` (**status patch allowed**) | `update.ts` (**status patch allowed**)          | —                                                                    |
| delete         | `delete.ts`                   | `delete.ts`                   | `delete.ts`                            | `remove.ts` (fn is still `deleteOnboarding`)    | —                                                                    |
| approve        | `approve.ts`                  | `approve.ts`                  | —                                      | —                                               | —                                                                    |
| reject         | `reject.ts`                   | `reject.ts`                   | —                                      | —                                               | —                                                                    |
| complete       | `complete.ts`                 | `complete.ts`                 | — (done via `update` status patch)     | `complete.ts` **and** via `update` status patch | `transfer.ts`, `unassign.ts`                                         |

Shared machinery already exists in `workflows/fetch.ts` (`fetchPromotionById`,
`fetchTransferById`, `fetchSeparationById`, `fetchOnboardingById`, `requireStatus`,
`assertUpdated`) — but it is four hand-written copies of the same shape, and the four `list.ts`
files are character-for-character clones modulo table + filter schema.

### State machines per type

```
Promotion / Transfer :  pending ──approve──▶ approved ──complete──▶ completed
                              └─reject──▶ rejected
Separation           :  pending ─┐
Onboarding           :  in_progress ─┴─▶ completed        (+ cancelled via update patch)
Assignment           :  open (to_date IS NULL) ──▶ closed (to_date set)   — no workflow guards
```

### Side effects on completion (the most important difference)

| Type       | At approve                                                                                                                                     | At complete                                                                                                                                                                    |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Promotion  | **patches `employee.department` in a tx** (`approve.ts` L38-42)                                                                                | patches `employee.department` **again** (`complete.ts` L21-27) — double application                                                                                            |
| Transfer   | publishes `TRANSFER_APPROVED` → `services/reconciliation.ts` closes open position assignments whose position's department == `from_department` | patches `employee.branch/department/company` in a tx                                                                                                                           |
| Separation | —                                                                                                                                              | no dedicated complete; publishing `SEPARATION_COMPLETED` happens inside `update.ts` when the patch sets `status: "completed"` → reconciliation closes **all** open assignments |
| Onboarding | —                                                                                                                                              | dedicated `complete.ts` **and** duplicated completion-detection + publish logic in `update.ts` (two code paths produce the same event)                                         |
| Assignment | —                                                                                                                                              | `transfer.ts`/`unassign.ts` close + open assignment rows; **none of the transition types ever create/close assignments positively**                                            |

Notable gaps and bugs this comparison surfaces:

1. **Promotion never touches position assignments.** It rewrites the free-text
   `employee.department` but leaves the employee's `hr_position_assignment` rows stale; transfer
   gets reconciliation only because its `approve` publishes an event.
2. **`promotion/approve.ts` does not publish `PROMOTION_APPROVED`**, although the event and its
   payload type are declared in `pubsub.ts`. Similarly `PROMOTION_REQUESTED`, `TRANSFER_REQUESTED`,
   and `SEPARATION_INITIATED` are declared but **never published anywhere** (only
   `transfer/approve.ts`, `onboarding/{create,complete,update}.ts`, `separation/update.ts` publish).
3. **`ONBOARDING_STARTED` / `ONBOARDING_COMPLETED` have no subscriber** — the only registered
   subscriptions (in `services/reconciliation.ts`, wired via `$prepareRuntime`) are
   `SEPARATION_COMPLETED` and `TRANSFER_APPROVED`.
4. **Completion path asymmetry**: promotion/transfer have dedicated `complete.ts` guarded by
   `requireStatus`; separation has none (any `update` patch can complete it); onboarding has both a
   guarded `complete.ts` and an unguarded `update` path that publishes the same event.
5. **Update policy asymmetry**: `UpdatePromotionSchema`/`UpdateTransferSchema` deliberately omit
   `status`; `UpdateSeparationSchema`/`UpdateOnboardingSchema` allow arbitrary status patches
   (including jumping straight to `completed` or back to `pending`).
6. **Cosmetic**: onboarding's delete lives in `remove.ts` while the other three use `delete.ts`.

## 3. Events compared

From `src/pubsub.ts` (`TRANSITION_EVENTS`, 8 topics) vs actual usage:

| Topic                             | Declared | Published                | Subscribed         |
| --------------------------------- | -------- | ------------------------ | ------------------ |
| `transition.onboarding_started`   | ✓        | ✓ (`create`)             | ✗                  |
| `transition.onboarding_completed` | ✓        | ✓ (`complete`, `update`) | ✗                  |
| `transition.promotion_requested`  | ✓        | ✗                        | ✗                  |
| `transition.promotion_approved`   | ✓        | ✗                        | ✗                  |
| `transition.transfer_requested`   | ✓        | ✗                        | ✗                  |
| `transition.transfer_approved`    | ✓        | ✓ (`approve`)            | ✓ (reconciliation) |
| `transition.separation_initiated` | ✓        | ✗                        | ✗                  |
| `transition.separation_completed` | ✓        | ✓ (`update`)             | ✓ (reconciliation) |

(`POSITION_EVENTS.ASSIGNED/UNASSIGNED/REASSIGNED` are consistently published by all three
assignment workflows and are the only transition-adjacent events with a symmetric
produce/consume story inside the module.)

## 4. Can they be unified?

**Short answer: yes for the four transition types (promotion, transfer, separation, onboarding);
no for position assignment — but assignment should become the target of a unified effects layer.**

### Why unification is justified

- **Table shape**: 4 of 5 tables are the same skeleton (id, employee_id, status, dates, reason,
  audit timestamps, approval columns). The only genuinely type-specific data is a handful of
  payload columns.
- **Workflow shape**: ~27 files in `transition/` are 4 copies of the same 8-action template with
  copy-paste drift (see the asymmetries above — the drift is already producing inconsistent
  behavior and dead events).
- **Status vocabularies**: 4 pg enums whose members mostly overlap; one
  `{pending, in_progress, approved, rejected, completed, cancelled}` enum with per-type allowed
  transitions covers all of them.
- **Side effects**: the current side effects are ad hoc and buggy (promotion double-patch, no
  assignment reconciliation for promotion). A single effects table fixes the _inconsistency_
  problem, not just the duplication problem.

### Recommended design

1. **One table** `hr_transition`: `id`, `employee_id`, `type`
   (`onboarding|promotion|transfer|separation`), `status` (single shared enum), `effective_date`,
   `from_*`/`to_*` nullable columns (department/branch/company — promotion uses only `to_department`,
   transfer uses all), `reason`, `notes`, `metadata` jsonb, `approved_at/by`, `rejected_at/by`,
   `rejection_reason`, `completed_at`, audit timestamps. Wide-nullable-columns (rather than a
   jsonb payload) keeps the typed columns, indexes, and Valibot-mapped camelCase conventions intact.
2. **One status enum** with a per-type transition map enforced by `requireStatus` (approve/reject
   only allowed for `promotion|transfer`; `in_progress` only for `onboarding|separation`).
3. **One generic workflow set** (`create/get/list/update/delete/approve/reject/complete`,
   parameterized by `type`) replacing ~27 files with ~8 — input validation stays per-type via
   Valibot discriminated unions on `type`, satisfying the convention that validation lives in
   `schemas/`.
4. **One effects registry** — the real win. Replace scattered inline patches with a declarative
   `(type, event) → effects` map, e.g.:
   - `transfer.approved` → publish event (reconciliation keeps closing stale assignments)
   - `transfer.completed` → patch employee branch/department/company
   - `promotion.completed` → patch employee department **and** open/close position assignments
   - `separation.completed` → close all open assignments (keep the subscriber)
   - `onboarding.completed` → publish only
     Effects run inside the same transaction as the status update, and every transition publishes
     its `requested/approved/completed` event — eliminating the dead-event list in §3.
5. **Do NOT merge `hr_position_assignment`** into this table. It is an interval record (the org
   system of record), not a request; it has no status machine. Instead, make transitions drive it:
   complete-time effects open/close assignment rows so the two models stop drifting apart. Today
   `hr.position.transfer` (imperative move) and `hr.transition.transfer` (approval workflow) are
   two unrelated features sharing a name — the effects layer is the place to bridge them
   deliberately (e.g. `transfer.completed` optionally creates the target assignment).

### Costs / caveats

- **Public surface change**: `transition.promotions/transfers/separations/onboardings` groups and
  `HrEventMap` topics are the module's public API; any host apps or the `docs` site referencing
  them need migration. (Internal reconciliation subscribers are the only current in-repo
  consumers, so the blast radius is contained.)
- **Data migration**: per repo convention there are no migration files — the change goes through
  Drizzle `pushSchema()` plus a backfill from the four legacy tables; this must be scripted once.
- **Filter/query differences**: promotions filter by department implicitly via payload; a unified
  table needs type+column indexes (`(type, status)`, `(employee_id, type)`).
- **Docs drift to fix alongside**: `.working-docs/bounded-contexts/hr.md` describes a `lifecycle`
  group with F&F and exit interviews (52 methods) and events `hr.employee_onboarded` /
  `hr.employee_separated` — none of which exist in code (`transition` group, different topic
  names). Any unification ADR should reconcile that document too.

### Suggested sequencing

1. **Fix bugs in place** (no schema change): promotion double-patch; publish or delete the 4 dead
   events; dedupe onboarding completion logic; align update-policy on status patching.
2. **Extract the generic transition kernel** (shared list/fetch/guard helpers) behind the existing
   four groups — pure refactor, zero surface change.
3. **Merge tables + workflows** into `hr_transition` with the effects registry (ADR +
   `pushSchema` + backfill).
4. **Bridge to assignments**: add positive assignment effects at `transfer/promotion.completed`.

## 5. Verdict

| Question                      | Answer                                                                                                           |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Same underlying pattern?      | Yes — 4 near-identical request tables + 1 interval table                                                         |
| Same workflow skeleton?       | Yes — 8-action CRUD+approval template, 4 copy-paste generations                                                  |
| Unified already?              | Partially — `fetch.ts` guards are shared; everything else is duplicated                                          |
| Unify the 4 transition types? | **Yes** — one table, one status enum, one workflow set, one effects registry                                     |
| Include position assignment?  | **No** — keep it separate as the org system of record; drive it from transition effects                          |
| Highest-value first step?     | Fix the side-effect inconsistencies (they are live bugs), then extract the shared kernel before any schema merge |
