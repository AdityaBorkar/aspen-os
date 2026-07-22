# 0005 — Multi-tenant host app with single-realm auth

> **Revised by [ADR-0007](./0007-framework-tenancy-abstraction.md)**: The framework now supports
> three tenancy modes as a config-time choice (single, shared, isolated). This ADR's
> description of a multi-tenant host app with single-realm auth remains valid for the
> `isolated` mode specifically. The `tenant_id` column requirement described below is revised
> — see ADR-0007 for the updated schema approach (always present, not added per-query).

The Management Plane is implemented as a module registered into a new multi-tenant host app that replaces the single-tenant Recruiter app. One `Framework.create()` instance, one `AuthUnit`, one better-auth instance, one set of auth tables — serving both platform admins and tenant end-users in a single `user` table.

We rejected two alternatives:

- **Separate management-portal app** (own Framework + own AuthUnit for platform admins; tenant apps stay single-tenant): cleaner per-app but leaves the SaaS without a unified multi-tenant data plane and forces cross-app coordination for every tenant operation.
- **Module in the existing Recruiter app**: would force the recruiter app to become multi-tenant incrementally while keeping its single-tenant schema — worst of both worlds.

We also explicitly rejected **multi-realm auth** (extending the framework `AuthUnit` to support multiple better-auth realms — one per tenant, or platform-vs-tenant realms). It would have required deep, hard-to-reverse changes to `AuthUnit`, `AuthConfig`, the `admin()` plugin wiring, and the `run()` AsyncLocalStorage context, with no clear payoff over a single realm with `tenant_id` discrimination.

## Consequences

This is a platform rewrite, not a module addition:

- Every existing module table (`organization`, `branch`, `task`, `drive_file`, all 44 HR tables, etc.) gains a `tenant_id` column. Per ADR-0007, this column is always present with `DEFAULT 'default'` — not added per-query. In `isolated` mode, it's redundant per database. In `shared` mode, RLS policies filter by it.
- Workflow queries do NOT need explicit `.where(tenantId)` scoping — isolation is handled by the framework (RLS policies or database-per-tenant), not by app-level filtering.
- The framework `run()` context gains `tenantId` (resolved from the authenticated user's active organization, or from a platform admin's selected/impersonated tenant). See ADR-0007 for the `run(tenantId, fn)` signature.
- The `user` table does NOT gain a `tenant_id` column. Tenant membership is via better-auth's `member` table. See ADR-0006 for the membership model.
- The Recruiter app is migrated into the new host (or deprecated in favor of it).
- The isolation mechanism is now a config-time choice — see ADR-0007.

The Management Plane module's own tables (`tenant`, `service_provider`, etc.) live in the default schema of the control-plane database — no separate `management` schema (consistent with how other modules use the default schema). The SOW's "schema name 'management'" line is revised away.
