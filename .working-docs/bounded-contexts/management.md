# Management Plane Context

> Package: `@aspen-os/management`. The control-plane module — Tenants (SaaS customer accounts), Service Providers, and Platform Users. Operates only against the control-plane DB.

## Relationship Type

Downstream of the Platform (Customer–Supplier). Hybrid pattern — private `#db` field (older pattern) with a getter for `tenants`, but `$prepareRuntime()` / `$cleanup()` are empty (newer pattern). `$dependencies: ["organization"]`.

## Structure (`packages/management/`)

- `ManagementPlane.create(config)` — factory returning a Module instance; `$config: ManagementPlaneConfig = undefined` (known WIP gap — the provisioning workflow expects a richer config with `tenantDbNamingScheme`, `defaultTenantDbHost`, `postgresAdminConnection`, `moduleSchemas`)
- `$name = "management"` (matches the `@aspen-os/management` package name, renamed from `management-plane`; proxy accessor `p.management`)
- `$initialize({ db, auth, pubsub })` — stores `db` only; `auth` and `pubsub` accepted but unused
- 3 workflow groups: `tenants` (getter — throws if `#db` is null), `serviceProviders`, `users` (readonly)
- 3 workflow-step files: `fetch-tenant`, `fetch-sp`, `fetch-user`
- 3 owned database tables (pushed via `$prepareInfra()` `control_plane_schemas`): `service_provider`, `service_provider_user`, `tenant`
- No shadow tables — `tenant_schemas` is empty (the `organization`/`user` better-auth mirrors are imported but not pushed to tenant DBs)
- 16 domain events: 8 tenant + 4 service_provider + 4 platform_user
- 3 ACL resources: `platformUser`, `serviceProvider`, `tenant`
- Audit entries written via the platform's `ctx.audit.write(...)` inline in each workflow (NOT via a shared `logAuditStep`) — the management plane does not own a separate `audit_log` table
- Has a build step (build script + `build` field in package.json)

## Exposed on the platform instance

```
p.management.tenants           { activate, assignServiceProvider, churn, get, list, onboard,
                                 reactivate, suspend, unassignServiceProvider, update }
p.management.serviceProviders  { activate, create, deactivate, get, getAssignedTenants,
                                 getUsers, list, update }
p.management.users             { assignRole, assignToServiceProvider, create, delete, get,
                                 list, update }
```

## Tenancy concepts owned by this context

- **Tenant**: a SaaS customer account at the platform layer, implemented as a better-auth **Organization** (the Tenant IS the better-auth `organization` row in the control-plane DB) with a companion `tenant` table for domain fields (status, plan, SP assignment, database connection params). Does NOT hold rich profile fields — those live on the aspen-os Organization companion.
- **Tenant Status**: `onboarding` → `active` → `suspended` ↔ `active` → `churned`. Coarse by design — internal install/training/handoff sub-steps are not tracked.
- **Organization (aspen-os module)**: the rich-profile companion entity, 1:1 with a Tenant (shares the better-auth org ID), living in the per-tenant database. Renamed conceptually to "Organization Profile" in this context to avoid collision. `name`/`slug`/`logo` are duplicated between the better-auth org row and this table — the provisioning workflow seeds both.
- **Service Provider**: an implementation/integration partner doing physical-world onboarding work. At most one active SP per Tenant (1:1 active assignment); an SP may serve many Tenants. Lives in the control-plane DB; not a Tenant subtype, not a reuse of `Connection`.
- **Platform Admin**: a user with `user.role = 'platform_admin'` and zero `member` rows. Works only against the control-plane DB; uses better-auth admin-impersonation (`signInAsUser`) to inspect tenant data.
- **Service Provider User**: a user with `user.role = 'sp_user'` and a `service_provider_user` join row (1:1 user→SP). Scope is the SP they belong to, not a tenant.
- **Platform User**: a user managed by this module — platform admins and SP users. Created/updated/deleted via the `users` workflow, which delegates to `AuthUnit.user`.
- **Report**: a read-only view over the control-plane DB — tenant usage, provisioning & lifecycle, audit & activity, and SP performance. Never crosses into per-tenant DBs.
- **Provisioning**: the `tenant.onboard` workflow — (1) create the better-auth Organization via `ctx.auth.service.api.createOrganization()`, (2) `dbUnit.provisionTenant(tenantId, dbOptions)` (isolated: `CREATE DATABASE` + `pushSchema()` against the new tenant DB; shared: no-op), (3) `dbUnit.seedTenantDb()` (isolated only) seeds the aspen-os Organization profile row, (4) record connection params + status in the `tenant` table, (5) audit entry, (6) publish `tenant:provisioned`. Sets status to `onboarding`.

## Roles

`platform_admin`, `sp_user`, `tenant_admin`, `tenant_user`

## Language

- Tenant, Tenant Status, Tenant ID, Tenant Resolver, Service Provider, Platform User, Platform Admin, Service Provider User, Audit Log, Provisioning, Control Plane, Tenant Database, Report
- Avoid: Organization (for Tenant — collides with the aspen-os Organization module entity), Integrator/Vendor/Partner (for Service Provider), Super Admin (for Platform Admin), Dashboard/Analytics (for Report)
