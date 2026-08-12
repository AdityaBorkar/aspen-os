# ADR-0009: Cross-module audit log with DB-record replayability

## Status

Accepted (Layer 1) — 2026-08-05. Layer 2 (blind-write capture) remains Proposed.

## Context

We need an `audit_log` capability that serves two distinct, equally important needs:

1. **Action audit** — *who* performed *what* action on *which* entity, per user
   request, for compliance and operational visibility. (Actions often happen
   *inside* workflows, but the unit of audit is the request/action, not the
   workflow itself.)
2. **DB record / state replay** — the actual row-state changes to DB records,
   recorded in commit order, so a record's history can be reconstructed and its
   current state replayed from the audit trail after the fact. **The replay
   target is the DB record and its state, not the workflow.** Workflows are one
   trigger of changes; they are not what we replay.

Both must be **accessible across all domain modules** (organization, tasks,
drive, hr, compliance, management) from one mechanism, not reinvented per
module.

### What exists today

- **`@aspen-os/platform` has an `AuditUnit`** (`packages/platform/src/server/audit/`)
  implementing Layer 1 (below). It writes to the platform's `audit_log` table
  (`audit/db-schema.ts`) with `seq bigserial`, `idempotency_key`, full-state
  columns, and `workflow_run_id` provenance. The unit is a core server unit
  (`$name = "audit"`), created in `BasePlatform.createCore()`, and pushed as a
  platform core schema via `DatabaseUnit.getSchemas()`.
- **`management`** writes audit entries via `ctx.audit.write(...)` inline
  in each workflow (e.g. `tenant.onboard.ts:126`, `tenant.suspend.ts:49`). It
  does NOT own a separate `audit_log` table or `logAuditStep` — it uses the
  platform `AuditUnit` directly. ~17 workflows write audit entries.
- **`compliance`** has an `AuditWorkflow` (`src/workflows/audit.ts`) that
  queries the platform `audit_log` via `ctx.audit.query(...)` for audit-trail
  and export. It does NOT have a module-local audit table or `audit-writer`
  service — the platform `AuditUnit` replaced both.

### Replayability gaps in the current code

The existing write path has six problems that make replay untrustworthy:

1. **No transactional atomicity.** The workflow engine
   (`workflows/engine.ts:232-261`) does not wrap a mutation step and its
   `"audit-and-notify"` step in one DB transaction. `ctx.audit.write(...)`
   does its own auto-commit `db.insert` *after* the mutation. If the audit
   step fails, the mutation is already committed → **audit gap**. Only
   shared-mode `runWithTenant` (`db/unit.ts:244-268`) provides a free ambient
   transaction; single and isolated modes do not. (Mitigated by
   `write(entry, tx)` / `withTransaction` — but most call sites don't pass a
   tx yet.)
2. **No deterministic ordering.** `performed_at` (defaultNow, ms resolution) is
   not monotonic under concurrent inserts and cannot order a replay. (Addressed
   by `seq bigserial` — already in the schema.)
3. **No idempotency.** The workflow engine dedups *steps* by
   `(runId, stepName)` (`engine.ts:56-70`), so an audit write keyed to a run is
   idempotent. A direct audit write is not — retries double-log. (Addressed by
   `idempotency_key` + partial unique index — already in the schema.)
4. **Incomplete state capture.** Many workflows log only `newState` for some
   actions (e.g. `tenant.activate.ts`), with no `previous_state`. From-scratch
   reconstruction of an entity requires the full timeline.
5. **Placement vs atomicity contradiction.** Writing to a control-plane table
   and "using `db.db` (context-aware)" contradict in isolated mode: `db.db`
   resolves to the *tenant* DB there, so a contextual write is not on the
   control plane. Central query loses atomicity; tenant DB keeps it.
6. **Capture completeness.** Deliberate logging cannot see uninstrumented
   (blind) writes by definition — this is the inherent limit of an
   application-level layer and the reason a DB-level layer is also needed
   (ADR-0010).

### Other relevant facts

- `context.actorId` is typed but **never populated by the framework**, so audit
  cannot capture the acting user without app cooperation today. The `AuditUnit`
  falls back to `actorId = "system"`.
- `workflow_runs` / `workflow_steps` (`workflows/db-schema.ts`) persist inputs,
  outputs, errors, attempts, and timings per run/step with `tenant_id`. These
  are a workflow-execution trace, **not a DB-record replay trail** — they record
  what a workflow *did*, not the row-level state changes it *caused*. They may
  be linked to audit entries as optional provenance (which workflow caused this
  record change), but they are not a substitute for record-state replay.
- Shared-mode `runWithTenant` sets `SET LOCAL app.tenant_id` + `SET LOCAL ROLE
  tenant_role` and creates a tx-scoped drizzle instance — an audit insert via
  `db.db` inside it rides the same transaction for free.
- RLS auto-applies to any table with a `tenant_id` column
  (`db/unit.ts:387-402`, `discoverTenantTables`), so the `audit_log` table with
  `tenant_id` is tenant-isolated in shared mode automatically.
- The `AuditUnit` is already implemented and shipped (`packages/platform/src/server/audit/`).
  It is a core server unit with `$name = "audit"`, created in
  `BasePlatform.createCore()`. Its `audit_log` table is pushed as a platform
  core schema. The public surface matches the recommendations below:
  `write(entry, tx?)`, `withTransaction(entry, fn)`, `query(filters)`,
  `count(filters)`, `diff(before, after)`, `reconstructState(entityType, entityId)`.

## Approaches Considered

### A. Layering: application audit vs DB-level replay

| Approach | What it captures | Atomicity | Blind-write coverage | Infra cost |
|---|---|---|---|---|
| **A1 — Application audit unit (deliberate `p.audit.write`)** | Intended operations with actor/action/entity semantics | Achievable via tx coupling (§R1) | None | Low |
| **A2 — Trigger-based changelog** (post-`pushSchema()` `CREATE TRIGGER` + row snapshot table) | Actual row changes | Automatic (trigger fires in tx) | Full | Medium (per-table DDL) |
| **A3 — Drizzle row interceptor** (wrap tx/db wrapper to diff before/after) | Actual row changes | Automatic | Full | Low-medium, but error-prone |
| **A4 — Logical replication / WAL → outbox** | Statement-level changes | Automatic | Full | High |
| **A5 — Reuse `workflow_runs`/`workflow_steps`** | Run inputs/outputs/errors per step | Already durable | Workflow-path only | None (exists) |

> **A5 is not a replay mechanism for DB records.** It traces workflow
> execution, not row-state changes. It is listed only because it already
> exists; it can provide *provenance* (which workflow caused an audited change)
> but cannot reconstruct a record's state. The replay target is the DB record.

### B. Where the audit table lives

| Approach | single | shared | isolated |
|---|---|---|---|
| **B1 — Control-plane only** | central, atomic | central, atomic (rides `runWithTenant` tx) | **atomicity LOST** (different DB than mutation) |
| **B2 — Contextual `db.db` (tenant DB)** | central, atomic | central, atomic | atomic, but **no central query** |
| **B3 — Mode-aware** (control-plane in single/shared, tenant DB in isolated + fan-out query) | central, atomic | central, atomic | atomic, aggregated on read |

### C. How audit writes achieve atomicity with the mutation

| Approach | Mechanism | Trade-off |
|---|---|---|
| **C1 — `write(entry, tx)`** (pass explicit tx handle, like compliance `writeAuditEntry({ db })`) | Caller wraps mutation + audit in one `db.transaction()` | Simplest in-process; caller must remember to pass tx |
| **C2 — Outbox pattern** (audit outbox row in same tx, relay moves to `audit_log`) | Decouples audit insert from mutation tx | Adds outbox table + relay process; overkill in-process |
| **C3 — Workflow "transactional step group"** (engine wraps mutation step + audit step in one tx) | Transparent for workflow authors | Engine change; only covers workflow-path writes |

### D. Action / entity enum vocabulary

| Approach | Integrity | Decoupling |
|---|---|---|
| **D1 — Open `text` columns + per-module `as const` constants** | None at DB level; typed in TS per module | Fully decoupled |
| **D2 — One global `pgEnum` in `@aspen-os/constants`** | DB-level | Couples every module to a committee-grown enum |
| **D3 — Per-module `pgEnum`** | DB-level per module | N enum types, can't query across modules uniformly |

## Recommendations

**Layer 1 is implemented.** The `AuditUnit` is built and shipped as described
below. Layer 2 (trigger-based blind-write capture) is deferred to ADR-0010.

### Layer 1 — Application audit unit (implemented)

**Approach A1 + B3 + C1 + D1.**

Add an `AuditUnit` to `@aspen-os/platform/server`, mirroring `LogUnit`:

- New directory `packages/platform/src/server/audit/`, unit class `AuditUnit`
  with `$name = "audit"`.
- Constructor-injected `{ db: DatabaseUnit }` (implemented).
- Added to `PlatformUnits` (`src/server/index.ts`), `BasePlatform.createCore` +
  proxy accessors, and `DatabaseUnit.getSchemas()` so the `audit_log` schema is
  pushed automatically.
- Reads `tenantId` and `actorId` from `context.getStore()` (the `LogUnit.query`
  pattern at `log/index.ts:197-199`).
- Public surface: `p.audit.write(entry, tx?)`, `p.audit.query(filters)`,
  `p.audit.count(filters)`, `p.audit.withTransaction(entry, fn)`,
  `p.audit.diff(before, after)`, `p.audit.reconstructState(entityType,
  entityId)`. (Note: implemented `withTransaction` takes an audit entry first
  and runs `fn` + write in one `db.transaction()`; `export()` is not
  implemented.)

**Placement (B3 — mode-aware, atomicity-first):**

- **single & shared:** control-plane table, write via `db.db` — atomic (rides
  the `runWithTenant` tx in shared mode) and centrally queryable.
- **isolated:** write to the **contextual tenant DB** (atomic with the
  mutation), with a `tenant_id` column. Provide `p.audit.queryAcross(filters)`
  that fans out to tenant DBs for the platform-admin cross-tenant view. Do
  **not** duplicate the audit table to the control plane in isolated mode —
  that would either lose atomicity or require 2PC. This is consistent with how
  ADR-0006 treats all tenant data.

**Atomicity (C1 — explicit tx handle):**

- `write(entry, tx?)` accepts an optional transaction handle; when provided,
  the insert uses it and commits with the mutation.
- `withTransaction(fn)` is a convenience wrapper that runs `fn` + the audit
  write in one `db.transaction()`.
- Additionally recommend **C3** as a follow-up: add an opt-in "transactional
  step group" to the workflow engine so a mutation step + its audit step
  commit together without manual tx plumbing. Until then, workflow-level
  audit is best-effort (gap on partial failure) and the documented contract
  is "pass a tx for atomicity."

**Vocabulary (D1 — open text + per-module constants):**

- `action` and `entity_type` are open `text`, not `pgEnum`. Each module
  contributes its own `as const` constants (typed via `ModuleInfra.events`-style
  typing) while the write/query mechanism stays singular. A small set of
  generic CRUD verbs (`create` / `update` / `delete`) lives in
  `@aspen-os/constants` so a generic replayer can classify operations; the
  module-specific verb (e.g. `tenant.suspended`) is preserved alongside in
  `action` and the generic class in `crud_action`.

**Replayability guarantees (addressing gaps 1–6):**

1. **Atomicity** — `write(entry, tx?)` + `withTransaction` (above). Module
   workflow writers call `ctx.audit.write(entry)` inline, optionally passing a
   transaction handle for atomicity.
2. **Deterministic ordering** — add a `seq bigserial` column; replay reads
   `ORDER BY seq`. `performed_at` stays for human display. In isolated mode
   each tenant DB has its own `seq`; a global merge uses `tenant_id` + `seq` +
   `performed_at` as a tiebreak.
3. **Idempotency** — `write` accepts an optional `idempotencyKey`; the table
   gets `idempotency_key text` with a partial unique index
   `UNIQUE (tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL`.
   Retries with the same key no-op. Workflows pass
   `idempotencyKey: \`${runId}:${stepName}\``.
4. **Full-state capture** — the `write` contract requires both states for
   mutations: `previous_state` for updates/deletes, `new_state` for
   creates/updates (null for delete). `diff(before, after)` produces the
   `changes: Record<string,{new,old}>` shape.
5. **Placement** — mode-aware per B3 (above).
6. **Capture completeness** — maximize coverage of the *intended* path by
   making audit a first-class step in every mutating code path (workflows,
   services, direct writes), so authors don't forget to record a record change.
   True blind-write replay is Layer 2's job; a periodic drift-detection job
   (out of scope here) can *flag* unrecorded record changes but not replay
   them.

**What "replay" means with Layer 1 — replaying DB records, not workflows:**

The replay target is the **DB record and its state**. Given a record
(`entity_type` + `entity_id`), Layer 1 reconstructs its history and current
state by replaying the audited changes in `seq` order:

- **Record state reconstruction:** read
  `audit_log WHERE entity_type = ? AND entity_id = ? ORDER BY seq`; start from
  the first `new_state` (create), apply each subsequent `new_state` (update), and
  stop at the last delete (`new_state = null`). The result is the record's
  current state as of the last audited change. Requires full-state capture (§4)
  and complete logging (§6 caveat).
- **Record timeline / history:** the same query yields the ordered sequence of
  states and field-level `changes` for an audit-trail UI (who changed this
  record, when, from what to what).

`workflow_run_id` on an audit entry is **optional provenance only** — it
answers "which workflow run caused this record change?" for drill-down. It is
not a replay handle; we do not replay workflows. `workflow_runs`/`workflow_steps`
are a workflow-execution trace, orthogonal to record-state replay.

**Honest boundary:** Layer 1 replays *audited* record changes. It cannot
reconstruct a record's state from changes that bypassed `p.audit.write` (blind
writes). This is the explicit boundary between Layer 1 and Layer 2.

### Layer 2 — DB-level record replay (gated, follow-up ADR)

**Approach A2 preferred.**

- **A2 (when blind-write/byte-level record replay is actually needed):**
  trigger-based `audit_changelog` with full row snapshots for selected tables,
  applied post-`pushSchema()`. Captures actual row changes at the DB level
  (create/update/delete with before+after state), so a record's history can be
  reconstructed even for blind writes. Best atomicity (triggers fire in-tx) and
  full blind-write coverage; cost is per-table DDL maintenance. This is the true
  record-state replay mechanism — Layer 1 is its application-level counterpart.
- **A5 (provenance only, not replay):** `workflow_run_id` linking audit entries
  to `workflow_runs`/`workflow_steps` answers "which run caused this change?"
  but does not replay record state. Optional, not a Layer 2 mechanism.
- **A3 (rejected):** drizzle row interceptor — error-prone to intercept every
  write correctly.
- **A4 (rejected):** logical replication/WAL — most faithful but heavy infra;
  revisit only if external streaming is required.

A follow-up ADR will decide A2 scope (which tables, snapshot granularity) once a
concrete blind-write replay requirement is demonstrated. Layer 2 depends on
Layer 1 for actor/action/entity attribution — CDC alone cannot tell *who* did
*what*; Layer 1 supplies that context to the record-change stream.

### Framework fix (prerequisite)

Populate `context.actorId` from the authenticated session in
`AuthUnit`/RPC middleware so `ctx.actorId` and thus `audit_log.actor_id` are
correct across modules without app cooperation. Today it is typed but never
set.

### Recommended schema (Layer 1)

```
audit_log
  id              uuid        PK $defaultFn(() => uuidv7())  -- note: deviates from the text+uuidv7() convention; runtime default via JS function
  tenant_id       text        notNull default 'default'   -- ADR-0007
  seq             bigserial                                 -- deterministic replay order (R2)
  action          text        notNull                      -- module-specific verb
  crud_action     text        nullable                      -- create|update|delete  (R4)
  actor_id        text        notNull                      -- context.actorId ?? "system"
  entity_type     text        notNull
  entity_id       text        notNull
  previous_state  jsonb       nullable                      -- full row before (R4)
  new_state       jsonb       nullable                      -- full row after  (R4)
  changes         jsonb       nullable                      -- Record<string,{new,old}> diff (R4)
  metadata        jsonb       nullable                      -- ip, notes, etc.
  idempotency_key text        nullable                      -- dedup on retry (R3)
  workflow_run_id text        nullable                      -- optional provenance: which run caused this record change (not a replay handle)
  request_id      text        nullable                      -- cross-cutting correlation
  trace_id        text        nullable
  performed_at    timestamptz notNull defaultNow()
```

Indexes:

- `UNIQUE (tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL` (R3)
- `(entity_type, entity_id, seq)` — **record state reconstruction & timeline**
  (the primary replay query)
- `(workflow_run_id)` — provenance drill-down (optional; not a replay index)
- `(actor_id)`, `(action)`, `(performed_at)` —
  query/export (mirrors management's existing indexes)

## Consequences

**Positive:**
- One audit mechanism across all modules; new modules get audit for free.
- `p.audit` available via the same proxy-accessor pattern as `p.logs`, `p.db`.
- Centralized read/export surface (only compliance had one today).
- Tenant-correctness falls out of `db.db` + `tenant_id` for free; RLS
  auto-applies in shared mode.
- Deterministic, idempotent, full-state replay of audited DB record changes.
- Module action/entity vocabularies stay flexible via open-string columns.

**Negative:**
- Open `text` action/entity columns lose DB-level enum integrity (mitigated by
  TS-level typing per module).
- Mode-aware placement means "one centrally-queryable table" is true in
  single/shared only; isolated needs fan-out aggregation.
- The shared audit table can grow large; partitioning/retention policy is out
  of scope here but will be needed.
- Existing management/compliance audit tables become redundant on
  consolidation (migration or coexistence decision deferred).
- Layer 1 cannot replay blind writes — the honest boundary with Layer 2
  (record-state replay for uninstrumented writes requires DB-level capture).

## Alternatives Rejected

1. **Keep per-module audit tables** (current pattern) with a shared convenience
   API — leaves N duplicated schemas, N read/export surfaces, no cross-module
   queryability, and the six replayability gaps unsolved per-module.
2. **Single shared constants module for all action/entity enums** (D2) —
   couples every module to a global enum grown by committee; open-string +
   per-module typing is more decoupled. Shared constants still hold the generic
   CRUD verbs.
3. **Framework-level CDC first, deliberate API second** (A2/A4 as primary) —
   heavier, and without Layer 1 there is no actor/action/entity semantic to
   attach to row changes. CDC also doesn't solve actor attribution.
4. **Outbox pattern for atomicity** (C2) — adds an outbox table + relay process
   for a benefit that `write(entry, tx)` + `db.transaction()` already provides
   in-process. Revisit only if the audit table moves to a separate database.
5. **Drizzle row interceptor** (A3) — transparent but error-prone to intercept
   every drizzle write correctly; rejected in favor of triggers (A2) for the
   DB-level layer.
