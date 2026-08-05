# ADR-0010: Capturing blind writes — DB-level change logging (Layer 2)

## Status

Proposed — 2026-08-05

## Context

[ADR-0009](./0009-audit-log-capability.md) implemented **Layer 1**: a deliberate,
application-level `AuditUnit` (`p.audit`) that records *intended* operations
with actor/action/entity semantics. Layer 1 captures every change that goes
through `ctx.audit.write(...)` — but it **cannot see writes that bypass that
call** ("blind writes"). Anything that mutates a table without going through
an instrumented workflow/service is invisible to the audit trail:

- Raw SQL, ad-hoc drizzle queries, migrations, scripts, `db-studio`.
- Bugs where a code path forgets to call `ctx.audit.write`.
- Future modules that don't adopt the convention.

This ADR covers **Layer 2**: a DB-level mechanism that captures *actual* row
changes regardless of how they were issued, so the audit trail is complete and
blind writes are recoverable. It builds on Layer 1 for actor/action attribution
and shares the replay contract (`seq`-ordered, full-state, idempotent).

### What Layer 2 must solve that Layer 1 cannot

1. **Blind-write coverage** — every INSERT/UPDATE/DELETE on audited tables is
   captured, even if no application code cooperated.
2. **Atomicity by construction** — the change record is written in the same
   transaction as the mutation (it cannot fail separately, producing a gap).
3. **Full row snapshots** — `previous_state` + `new_state` for every change,
   not just the fields a caller happened to pass.
4. **DB-deterministic order** — the change record's sequence reflects real
   commit order at the DB, not application call order.
5. **No actor/action/entity semantics by default** — a blind write has no
   domain context. Layer 2 records *what changed*; Layer 1 supplies *who* and
   *why* via correlation (same transaction / request id / run id).

### Constraints from the existing platform

- **`pushSchema()` is the only schema mechanism.** `DatabaseUnit.pushSchemasTo`
  (`db/unit.ts:334-347`) uses `drizzle-kit/api`'s `pushSchema()` to apply DDL
  at `prepareInfra()` time. There are no migration files (ADR-0004). Any DDL
  Layer 2 needs (trigger functions, event tables) must be applied in the same
  push window, or via post-push `db.execute(sql\`...\`)` like RLS does today
  (`applyRlsPolicies`, `db/unit.ts:279-303`).
- **Three tenancy modes** (ADR-0007) with different DB topologies:
  - **single** — one DB; audit table already there from Layer 1.
  - **shared** — one DB, RLS via `SET LOCAL app.tenant_id` + `tenant_role`
    inside `runWithTenant` (`db/unit.ts:232-256`). Triggers run as the
    connecting user/role; `current_setting('app.tenant_id', true)` is available
    inside a trigger function and gives the tenant for the row.
  - **isolated** — DB-per-tenant; each tenant DB has its own `audit_log` (Layer
    1 placement). Triggers must be created in *every* tenant DB during
    `provisionTenant` / `$prepareTenant` (`db/unit.ts:162-230`), not just the
    control plane.
- **Layer 1 `audit_log` already exists** (`audit/db-schema.ts`) with the
  columns Layer 2 needs: `previous_state`, `new_state`, `changes`, `crud_action`,
  `seq`, `tenant_id`, `idempotency_key`, `metadata`. Layer 2 should **write
  into the same `audit_log` table** — not a separate `audit_changelog` — to
  keep one replay query, one retention policy, and one surface. Layer 2 rows
  are distinguishable by `crud_action` (always set) + a `metadata.source` flag
  (e.g. `"trigger"`) and by `actor_id = "system"` / `action = "blind_write"`.
- **Module schemas declare their tables** via `ModuleInfra.db` (ADR-0008). A
  module must opt its tables into DB-level capture (not every table needs it —
  e.g. `logs`, `workflow_steps`, the audit table itself must never be
  captured, or recursion/feedback results).

## Approaches Considered

### A. Trigger-based changelog (post-push DDL, same `audit_log` table)

A Postgres `AFTER INSERT OR UPDATE OR DELETE` trigger on each opted-in table
calls a `SECURITY DEFINER` function that inserts a row into `audit_log` with
the full `previous_state`/`new_state` snapshots and `crud_action` derived from
the `TG_OP`.

**Pros:** atomic by construction (trigger fires in-tx); full blind-write
coverage; DB-deterministic order; no application code changes; reuses the
existing `audit_log` table; `seq bigserial` gives per-table commit order
for free; `current_setting('app.tenant_id', true)` works inside the trigger
in shared mode for tenant attribution.

**Cons:** per-table DDL maintenance; triggers must be created in every
tenant DB in isolated mode (during `provisionTenant`/`$prepareTenant`);
snapshotting large/toast rows on every write has a write-cost; `jsonb`
snapshot is lossy for types without a JSON cast (handled with `to_jsonb(NEW)`);
need an opt-in table registry so not every table is captured; recursion guard
(disable the trigger on `audit_log` itself, or check `TG_TABLE_NAME`).

**Integration points:**
- A new `ModuleInfra.db.audited_tables?: string[]` (or a separate
  `ModuleInfra.audit.triggers`) so modules declare which tables to capture.
  `BasePlatform.$prepareInfra` merges the list and calls a new
  `DatabaseUnit.applyAuditTriggers(db, tables)` after `pushSchema`, mirroring
  `applyRlsPolicies` (`base-platform.ts:132-136`).
- `applyAuditTriggers` creates one generic PL/pgSQL function
  `audit.capture_change()` and a per-table trigger `audit_<table>_chg`
  via `db.execute(sql\`...\`)`, exactly like `applyRlsPolicies` does for RLS
  policies (`db/unit.ts:293-301`).
- In isolated mode, triggers are applied in `provisionTenant`
  (`db/unit.ts:212-217`, right after `pushSchemasTo(tenantDb, ...)`) and in
  `$prepareTenant` for already-existing tenants.

### B. Logical replication / WAL (pgoutput → outbox)

Create a logical replication slot consuming `pgoutput` and decoding row
changes into the `audit_log` table (or a separate outbox relayed later).

**Pros:** most faithful statement/replay stream; captures everything
including `TRUNCATE`; decoupled from the transaction (no trigger overhead on
the write path); survives even DDL that drops triggers; natural for
streaming to an external system.

**Cons:** heavy infra — replication slot management, a always-on consumer
process, slot backlog/retention monitoring; `wal_level = logical` must be
set on the server (ops change); per-tenant slots in isolated mode multiply
the ops cost; the decoded change has no `tenant_id` default from
`current_setting` (must be inferred from the database identity in isolated
mode, or absent in shared mode unless the row carries `tenant_id`);
ordering across slots is not trivial; no built-in actor attribution (Layer
1 must correlate by `xid`/`commit_ts`/`request_id` if present on the row).

**Integration points:** a new `AuditReplicationConsumer` unit started in
`$prepareRuntime`; `RunOptions`/context unchanged; in isolated mode one slot
per tenant DB. Considerably more moving parts than the platform currently
has (no background workers, no replication config — see AGENTS.md "no
CI/CD, no Docker for the platform").

### C. Drizzle query interceptor (wrap `db.db` / `runWithTenant`)

Wrap the context-aware db Proxy (`createDbWrapper`, `db/unit.ts:389-402`) or
`runWithTenant` to intercept every drizzle `insert`/`update`/`delete`,
fetch `before`, apply, fetch `after`, and write an audit row.

**Pros:** pure framework code, no DB DDL; per-query diffing is easy; works
across all modes since it sits on the context wrapper.

**Cons:** **error-prone and incomplete by design** — drizzle's query builder
is not easily interceptable in full (raw `db.execute(sql\`...\`)`, batch
inserts, `ON CONFLICT`, `.returning()` composites, `values()` shapes all
vary); a generic wrapper cannot reliably extract the row set being changed;
interception is on the *client* side, so it misses everything that doesn't
go through the wrapper (raw pool queries, `db-studio`, other clients, the
trigger itself); doubles the query count (before-select per write); no
atomicity guarantee (the audit insert is a separate statement unless
wrapped in an explicit tx, which most call sites don't open). This is the
weakest option for *blind* writes specifically — it only catches writes
that already go through the instrumented client, which is the opposite of
the goal.

### D. Application-level outbox (write `audit_log` row in-tx via a tx hook)

Instead of triggers, require every mutating code path to open a transaction
and write an audit row in it. This is essentially Layer 1's atomicity
guarantee (C1 in ADR-0009) done everywhere via `p.audit.withTransaction` or a
"transactional step group" (C3 in ADR-0009).

**Pros:** no DB DDL; full actor/action semantics from the call site.

**Cons:** **does not solve blind writes** — it only covers code that
cooperates. A forgotten `withTransaction` is exactly the blind write Layer 2
exists to catch. This is a Layer 1 strengthening, not a Layer 2 mechanism.
(Already noted as C1/C3 in ADR-0009; orthogonal to this ADR.)

### E. Periodic drift detection (reconcile `audit_log` vs. table state)

A scheduled job compares the audited state (reconstructed via
`reconstructState`) against the actual table state and flags rows that
diverge.

**Pros:** no write-path overhead; cheap; catches *that* a blind write
happened.

**Cons:** **detection, not replay** — it cannot reconstruct *what* the
blind write changed (only that the record now differs from the audited
state); needs full-state capture to compare; not a capture mechanism at all.
Useful as a *complement* to A, not a substitute.

## Recommendations

### Primary: A — Trigger-based capture into the shared `audit_log`

**Why A over B:** the platform has zero replication infrastructure today
(no slots, no `wal_level=logical`, no background consumers — AGENTS.md).
Triggers need only post-push `db.execute(sql\`...\`)`, which is already the
established pattern for RLS (`applyRlsPolicies`). A is atomic by
construction, covers blind writes at the DB level, reuses the existing
`audit_log` table and its `seq`, and costs one generic function + N small
per-table triggers. B's fidelity is higher but its ops cost is
disproportionate unless external streaming is a hard requirement.

**Why not C/D:** C doesn't catch blind writes (it instruments the client,
not the DB); D is Layer 1 work, not Layer 2.

### Design of A (guide, no code)

**1. Opt-in table registry via `ModuleInfra`.**
Add an `audited_tables` list to module infra (e.g.
`ModuleInfra.audit.triggers: string[]` or `ModuleInfra.db.audited_tables`).
Modules declare which of *their* tables should be trigger-captured. The
platform core declares its own (e.g. none of `logs`/`workflow_runs`/
`audit_log`/`kv_store`; possibly `storage` metadata). Tables without a
`tenant_id` (e.g. auth tables, `service_provider`, `tenant`) can still be
captured — they just won't get an auto-tenant; the trigger sets
`tenant_id` from `current_setting('app.tenant_id', true)` when available,
else `'default'` (the column default already does this).

**2. One generic trigger function, per-table triggers.**
Create a single `SECURITY DEFINER` function `audit.capture_change()` that
reads `TG_OP`, `TG_TABLE_NAME`, `TG_TABLE_SCHEMA`, and the `NEW`/`OLD`
records, and inserts into `audit_log`:

- `crud_action` ← `'create' | 'update' | 'delete'` from `TG_OP` (map
  `INSERT→create`, `UPDATE→update`, `DELETE→delete`).
- `action` ← `'<table>_<op>'` (e.g. `tenant.update`) — a synthetic but
  classifiable verb, since the trigger has no domain action name.
- `entity_type` ← `TG_TABLE_NAME`, `entity_id` ← `NEW.id`/`OLD.id` (or the
  PK column, read from the table's PK; for composite PKs, a composite key).
- `previous_state` ← `to_jsonb(OLD)`, `new_state` ← `to_jsonb(NEW)` (NULL on
  DELETE / INSERT respectively).
- `tenant_id` ← `COALESCE(current_setting('app.tenant_id', true), 'default')`
  (matches the column default; in isolated mode the trigger is in the tenant
  DB so the row belongs to that tenant regardless).
- `actor_id` ← `'system'` (triggers have no actor; Layer 1 correlation
  supplies the actor — see §5), `metadata` ←
  `{"source": "trigger", "txid": txid_current(), "op": TG_OP}`.
- `idempotency_key` ← `NULL` (each row change is unique by `seq`; the
  `UNIQUE(tenant_id, idempotency_key)` index allows unlimited NULLs).

Per-table triggers are `CREATE TRIGGER audit_<table>_chg AFTER INSERT OR
UPDATE OR DELETE ON <table> FOR EACH ROW EXECUTE FUNCTION
audit.capture_change()`. Use `AFTER ... FOR EACH ROW` so `NEW`/`OLD` are
available and the change is captured only on commit-bound success (AFTER
fires before COMMIT, still in-tx → atomic).

**3. Recursion / feedback guard.**
The trigger function must not fire on `audit_log` itself (no trigger is
created on it) and should short-circuit if `TG_TABLE_NAME = 'audit_log'`.
Also guard against nested trigger depth if a captured write causes another
captured write (e.g. an `updatedAt` trigger) — keep the function side-effect
free apart from the single insert.

**4. Apply triggers in the existing push window, per mode.**
Mirror `applyRlsPolicies` exactly:

- A new `DatabaseUnit.applyAuditTriggers(db, tables)` that creates the
  function (idempotently, `CREATE FUNCTION ... LANGUAGE plpgsql AS $$ ... $$`)
  and loops the opted-in tables creating triggers (`DROP TRIGGER IF EXISTS`
  then `CREATE TRIGGER`), exactly like the RLS loop at `db/unit.ts:292-301`.
- **single & shared:** call it from `BasePlatform.$prepareInfra` after
  `prepareWithModules` + `applyRlsPolicies` (`base-platform.ts:132-136`),
  against `this.units.db.controlPlaneDb`.
- **isolated:** call it inside `provisionTenant` right after
  `pushSchemasTo(tenantDb, allTenantSchemas)` (`db/unit.ts:212-217`), and in
  `$prepareTenant` for existing tenant DBs (`create-isolated-tenant.ts:120-134`).

**5. Correlation with Layer 1 (actor/action attribution).**
A trigger row has no actor or domain action. To attribute it:

- **Same-transaction correlation:** Layer 1's `write` and the trigger both
  run in the same transaction when `ctx.audit.write(entry, tx)` is used. The
  trigger row's `metadata.txid` (from `txid_current()`) equals the Layer 1
  row's `txid`; a post-query join or a `metadata.workflow_run_id` written by
  Layer 1 (if the write also sets it) lets the UI show the actor. Concretely:
  have Layer 1's `write` also store `metadata.txid` (from `txid_current()`
  via a raw `SELECT` or a drizzle `sql` expression) so both rows share it.
- **Request correlation:** `request_id`/`trace_id` are not visible to a
  trigger unless set as a GUC (`SET LOCAL app.request_id = ...` in
  `runWithTenant`/`runInContext`). If we set request GUCs in context, the
  trigger can read `current_setting('app.request_id', true)` and populate
  `request_id`/`trace_id` on the trigger row — making correlation automatic
  and giving blind writes a request id for free. **Recommendation:** set
  `app.request_id` / `app.trace_id` as session GUCs in `runInContext` and
  `runWithTenant` (cheap, leverages the existing `SET LOCAL` plumbing),
  and have both Layer 1 `write` and the trigger read them. This makes the
  trigger row joinable to the Layer 1 row by `(tenant_id, request_id, seq)`
  even for blind writes that happened in the same request as an audited
  workflow.
- For genuinely uncorrelated blind writes (a script, `db-studio`), the
  trigger row stands alone with `actor_id = 'system'`, `metadata.source =
  'trigger'`, `request_id = NULL` — which is the honest representation.

**6. Replay semantics (shared with Layer 1).**
Because both layers write to the same `audit_log` ordered by `seq`,
`reconstructState(entityType, entityId)` (already implemented on
`AuditUnit`) naturally incorporates trigger rows: it replays every change
to that entity in `seq` order, applying `new_state`/`previous_state`
regardless of source. Trigger rows have full snapshots, so they *improve*
reconstruction fidelity. The `metadata.source` flag lets a viewer
distinguish deliberate vs. blind writes if needed.

**7. Opt-in, not default-on.**
Capturing every table is expensive and noisy. Start with the tables that
matter for compliance/replay (the management-plane's `tenant`,
`service_provider`, `user`; domain modules' primary entities). The
`audited_tables` infra declaration keeps it explicit and per-module.

### Complement: E — drift detection (optional, later)

A periodic job comparing `reconstructState` output to actual row state
flags *untriggered* drift (e.g. a table that isn't in `audited_tables` but
was changed). This doesn't replay the change, but it surfaces gaps in the
opt-in registry so the team can decide whether to add the table to
`audited_tables`. Cheap to add once Layer 1 + A are in place; recommend
only after A is stable.

### When to revisit B (logical replication)

Defer B until there is a concrete need for: (a) streaming changes to an
external system (search index, data warehouse, event bus), (b) surviving
trigger-dropping DDL, or (c) `TRUNCATE` capture. At that point B becomes a
*consumer* of the same `audit_log` contract (or a parallel stream joined
to it), not a replacement for A — and the ops investment (slots, `wal_level`,
consumers) is justified by the external-streaming requirement, not by
blind-write capture alone.

## Consequences

**Positive (A):**
- Blind writes on opted-in tables are captured with full snapshots, in
  commit order, atomically with the mutation.
- One replay path (`audit_log` + `seq`) serves both layers;
  `reconstructState` and the entity-timeline query work unchanged.
- No new infra beyond post-push DDL (already the RLS pattern).
- Per-module opt-in keeps cost predictable.

**Negative (A):**
- Per-table trigger DDL must be maintained and applied per tenant DB in
  isolated mode (ops surface grows with table count × tenant count).
- Write-path cost: one `jsonb` snapshot insert per changed row (acceptable
  for audited tables; this is why opt-in matters).
- `jsonb` snapshots are lossy for non-JSON-castable types; `to_jsonb`
  covers the common cases (text, numeric, timestamptz, arrays) but exotic
  types may need a custom cast.
- Trigger rows have no actor; correlation with Layer 1 depends on
  `txid`/`request_id` GUCs being set — a small new convention to adopt.
- Ordering across tables in shared mode is per-table `seq` (each
  `bigserial` is global to the table, so cross-table order is still
  deterministic globally since it's one `audit_log` table — `seq` is a
  single sequence on that table). Good.

## Alternatives Rejected

1. **B (logical replication) as primary** — rejected for now: the platform
   has no replication infra and the ops cost is disproportionate to the
   blind-write goal. Revisit when external streaming is required.
2. **C (drizzle interceptor)** — rejected: it instruments the client, not
   the DB, so it misses exactly the blind writes Layer 2 exists to catch,
   and is unreliable across drizzle's query shapes.
3. **D (application outbox)** — rejected as Layer 2: it is a Layer 1
   atomicity strengthening (C1/C3 in ADR-0009), not a blind-write capture
   mechanism.
4. **E (drift detection) as primary** — rejected: detection is not replay;
   it cannot reconstruct the blind change. Kept as a complement to A.
5. **Separate `audit_changelog` table** — rejected: keeping two capture
   paths in two tables doubles retention, query, and replay surface for no
   benefit. Both layers write one `audit_log`, distinguished by
  `metadata.source`.

## Relationship to ADR-0009

This ADR implements the "Layer 2 — DB-level record replay" section of
ADR-0009, which deferred the choice between trigger/interceptor/WAL. It
picks the trigger approach (A2 in ADR-0009's notation), reuses the
existing `audit_log` table rather than introducing `audit_changelog`,
and depends on Layer 1's `AuditUnit` for actor/action attribution and
the shared replay/query surface. ADR-0009's §5 placement decision
(control-plane in single/shared, tenant DB in isolated) is inherited
unchanged — triggers are created wherever the `audit_log` table lives.
