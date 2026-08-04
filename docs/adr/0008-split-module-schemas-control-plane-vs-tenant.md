# ADR-0008: Split ModuleInfra DB Schemas into Control-Plane vs Tenant

## Status

Accepted — 2026-07-25

## Context

Currently `ModuleInfra.db` has a single `schemas` field — a flat `Record<string, unknown>` of Drizzle table definitions. During `prepareInfra()`, the platform merges all module schemas and pushes them to the control-plane database. In isolated-tenant mode, the same merged set is also pushed to each tenant database via `createTenant()`.

This means **all module tables exist in both the control-plane DB and every tenant DB**, even when tables like `tenant`, `service_provider`, and `audit_log` (from the management-plane module) are clearly control-plane-only, and tables like `task`, `employee`, `drive_file` are clearly tenant-only.

In isolated-tenant mode this is a correctness issue: tenant management data should not be duplicated into tenant databases, and tenant business data should not exist in the control-plane database.

## Decision

Split `ModuleInfra.db.schemas` into two fields:

```ts
db: {
  control_plane_schemas: Record<string, unknown>;
  tenant_schemas: Record<string, unknown>;
}
```

Modules declare which of their tables belong to the control plane and which belong to tenants. The platform routes them appropriately based on tenancy mode:

| Mode | control_plane_schemas | tenant_schemas |
|---|---|---|
| **Single** | → single DB | → single DB |
| **Shared** | → shared DB | → shared DB (RLS applied after) |
| **Isolated** | → control-plane DB only | → each tenant DB only |

Platform core schemas (auth, log, storage, kvStore, workflow) always go to the control-plane DB, unchanged.

## Consequences

**Positive:**
- Correct schema placement in isolated-tenant mode — no cross-contamination
- Modules self-document which tables are admin/management vs business/tenant
- `createTenant()` only pushes tenant-relevant schemas to new tenant DBs
- Clear mental model for module authors

**Negative:**
- Every module's `$prepareInfra()` must change
- `DatabaseUnit` API changes (`prepareWithModules` signature)
- All three platform class `$prepareInfra()` methods must update their merge logic
- Breaking change for any external code depending on `ModuleInfra.db.schemas`

## Alternatives Considered

1. **Convention-based (table name prefix)** — infer split from table name prefix (e.g., `management_*` → control plane). Rejected: fragile, implicit, doesn't generalize.

2. **Keep single field, add metadata** — add a `db.metadata` field marking each schema's placement. Rejected: more complex, duplicates information.

3. **Module-level `tenant: boolean` flag** — a single flag saying whether ALL of a module's schemas are tenant or control-plane. Rejected: too coarse; management-plane has both kinds in theory.
