# 0006 — Database-per-tenant isolation with control-plane auth

> **Revised by [ADR-0007](./0007-framework-tenancy-abstraction.md)**: Database-per-tenant is now
> one of three selectable tenancy modes (`isolated`), not the only option. The framework
> supports `single`, `shared`, and `isolated` modes as a config-time choice. This ADR
> describes the `isolated` mode specifically. The rejection of app-level `tenant_id` filtering
> and RLS below was the decision for the management-plane host app; ADR-0007 makes RLS a
> first-class supported mode for other apps.

Each tenant's data lives in its own Postgres database. Authentication tables (`user`, `session`, `account`, `verification`) live only in the control-plane database — they are NOT replicated into per-tenant databases. Every user (platform admin + tenant end-user) authenticates against the control-plane DB; after auth, the user's `tenant_id` claim determines which per-tenant database to use for data-plane queries.

We rejected two alternatives:

- **App-level `tenant_id` filtering** (every query `.where(eq(t.tenantId, ctx.tenantId))`): transparent and drizzle-idiomatic, but one missed `.where()` is a cross-tenant data leak. Relies on developer discipline and code review for a security guarantee.
- **Postgres Row-Level Security**: bulletproof at the DB level, but drizzle-orm has no RLS DSL (policies are raw SQL outside `pushSchema()`), harder to debug, and platform-admin cross-tenant queries need a `BYPASSRLS` escape hatch.

Database-per-tenant gives physical isolation: a tenant cannot reach another tenant's data because it is in a different database. No `.where()`, no RLS policies, no leak surface.

## Consequences

- The framework `DatabaseUnit` becomes tenant-aware: it holds a control-plane connection (for auth + platform tables) AND a lazily-created pool per tenant database. `run()` resolves the right drizzle instance from the request's `tenantId`.
- The framework `run()` AsyncLocalStorage context gains `tenantId` (resolved from the authenticated user's active tenant — see membership model below; for platform admins, an explicitly selected/impersonated tenant).
- The `AuthUnit` stays a singleton over the control-plane DB — no multi-realm, no per-request adapter swapping. Auth is unified.
- **Membership model**: tenant membership is via better-auth's Organization plugin `member` table (userId × organizationId × member.role). The `user` table does NOT have a `tenant_id` column. `user.role` (text, per ADR-0001) holds the global category: `platform_admin`, `tenant_user`, or `sp_user`. Platform admins have zero `member` rows. SP users have an `sp_id` FK on the `user` row pointing to their Service Provider (and zero tenant `member` rows). The active tenant for a request is `session.activeOrganizationId` (better-auth's mechanism).
- Existing module tables (organization, branch, task, drive_file, employee, all HR tables, etc.) do NOT gain a `tenant_id` column — isolation is by database, not by row. They remain structurally single-tenant; the tenant is implied by which database the query runs against.
- Tenant databases must be provisioned (created, schema pushed, optionally seeded) — this is a Management Plane module responsibility, likely via a workflow that issues `CREATE DATABASE`, runs `pushSchema()` against the new DB, and records the connection params in the control-plane `tenant` table.
- Per-tenant connection params (host, port, db name, user, password) are stored in the control-plane `tenant` table (or a `tenant_database` companion table).
- Platform admins do NOT touch the data-plane directly. The Management Plane module operates only on the control-plane DB. If a platform admin needs to inspect a tenant's data, they use better-auth's admin-impersonation (`signInAsUser`) to act as a tenant admin. No "act as tenant" mechanism is needed in the module itself.
- Operational cost: N+1 databases to back up, monitor, and migrate. Schema migrations run per-tenant.
