# Management Plane Module — Scope of Work

> Scope of Work for the multi-tenant SaaS management module built on the `@aspen-os/framework`.
>
> This SOW was produced by a `/grill-with-docs` session. Architectural decisions are recorded in
> [ADR-0005](../../docs/adr/0005-multi-tenant-host-app-single-realm-auth.md) (multi-tenant host app,
> single-realm auth) and [ADR-0006](../../docs/adr/0006-database-per-tenant-isolation.md)
> (database-per-tenant isolation). Domain language is captured in
> [CONTEXT.md → Management Plane Domain](../../CONTEXT.md).

## Overview

The Management Plane is the control-plane module of a multi-tenant SaaS built on aspen-os. It manages
the lifecycle of **Tenants** (SaaS customer accounts), **Service Providers** (implementation partners
that do physical-world onboarding work), platform users (with the existing single-realm `AuthUnit`),
and reports over the control-plane. It also fully automates tenant provisioning: creating the
better-auth Organization, the per-tenant Postgres database, pushing all module schemas, seeding the
tenant's Organization profile, and assigning a Service Provider.

The module is registered into a **new multi-tenant host app** that replaces the single-tenant
Recruiter app. Auth is handled by the framework's existing `AuthUnit` (single better-auth instance)
using better-auth's **Organization plugin** for tenant membership. Each tenant's data lives in its
own Postgres database (database-per-tenant isolation); auth tables live only in the control-plane
database. The Management Plane module itself operates **only** on the control-plane DB — it never
queries per-tenant databases directly. Platform admins use better-auth admin-impersonation if they
need to inspect a tenant's data-plane data.

### Key Architectural Decisions

1. **Multi-tenant host app replaces Recruiter** (ADR-0005). One `Framework.create()` instance, one
   `AuthUnit`, one better-auth instance. The Recruiter app is migrated into the new host (or
   deprecated). Every existing module (organization, compliance, tasks, drive, hr) becomes
   tenant-scoped in the host.

2. **Database-per-tenant isolation** (ADR-0006). Each tenant gets its own Postgres database; auth
   stays in the shared control-plane DB. Isolation is physical — no `tenant_id` columns on
   data-plane tables, no RLS policies, no app-level `.where(tenantId)` filtering. The framework
   `DatabaseUnit` becomes tenant-aware (resolves the right per-tenant pool from the request's
   tenantId); the `run()` AsyncLocalStorage context gains `tenantId`.

3. **Single-realm auth via better-auth Organization plugin**. The `user` table does NOT gain a
   `tenant_id` column. Tenant membership is via the better-auth `member` table
   (userId × organizationId × member.role). `user.role` (text, per ADR-0001) holds the global
   category: `platform_admin`, `tenant_user`, or `sp_user`. SP users carry an `sp_id` FK on the user
   row. The active tenant for a request is `session.activeOrganizationId`.

4. **Tenant ≡ better-auth Organization**. The Tenant IS the better-auth `organization` row (carries
   `name`, `slug`, `logo`). A companion `tenant` table holds the extra domain fields (status, plan,
   SP assignment, connection params). The aspen-os `organization` module's Organization becomes a
   1:1 rich-profile companion in the per-tenant DB (holds `accentColor`, `website`, `industry`,
   `taxId`, etc. — NOT name/slug/logo).

5. **No `management` Postgres schema**. The SOW's original "schema name 'management'" line is
   revised away. Module tables live in the default schema of the control-plane DB, consistent with
   how other modules use the default schema.

6. **Platform admins never touch the data-plane**. The Management Plane module operates only on the
   control-plane DB. If a platform admin needs to inspect a tenant's data, they use better-auth's
   admin-impersonation (`signInAsUser`) to act as a tenant admin. No "act as tenant" mechanism is
   built into the module.

7. **Fully-automated provisioning**. The module creates the better-auth Organization, issues
   `CREATE DATABASE`, runs `pushSchema()` against the new tenant DB with all module schemas, seeds
   the aspen-os Organization profile row, records connection params, assigns the SP, and sets
   status to `onboarding`.

---

## 1. Tenant

The SaaS customer account. Implemented as a better-auth Organization (the Tenant IS the
`organization` row in the control-plane DB) plus a companion `tenant` table for extra domain
fields. Carries `name`/`slug`/`logo` on the better-auth org row (source of truth for display), plus
lifecycle/plan/SP-assignment on the companion.

### 1.1 Tenant (better-auth Organization)

Managed via better-auth's Organization plugin API (`organization.create`, `organization.list`,
`organization.setActive`, `organization.inviteMember`, etc.). Schema and table are owned by
better-auth; the Management Plane module invokes the plugin's API rather than writing to the table
directly.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Name** | text | Display name of the tenant. |
| **Slug** | text (unique) | URL-friendly identifier. |
| **Logo** | text (nullable) | Logo URL or Storage reference. |
| **Metadata** | jsonb (nullable) | better-auth org metadata (extensible). |
| **Created At** | timestamptz | Record creation timestamp. |

### 1.2 Tenant Companion

| Field | Type | Description |
|---|---|---|
| **ID** | text (PK, FK → better-auth `organization.id`) | Shares the better-auth org ID. |
| **Status** | enum | `onboarding`, `active`, `suspended`, `churned`. Default `onboarding`. See §1.4. |
| **Plan** | text (nullable) | Subscription/plan identifier (e.g. `free`, `pro`, `enterprise`). |
| **Service Provider ID** | text (FK, nullable) | The active Service Provider assigned to this tenant. 1:1 active assignment per tenant. |
| **Signup At** | timestamptz | When the tenant signed up. |
| **Suspended At** | timestamptz (nullable) | When the tenant was last suspended. |
| **Suspended Reason** | text (nullable) | Voluntary/involuntary suspension reason. |
| **Churned At** | timestamptz (nullable) | When the tenant churned. |
| **Churn Reason** | text (nullable) | Why the tenant churned. |
| **Database Host** | text | Per-tenant DB connection host. |
| **Database Port** | integer | Per-tenant DB connection port. |
| **Database Name** | text | Per-tenant DB name. |
| **Database User** | text | Per-tenant DB user. |
| **Database Password** | text | Per-tenant DB password (stored encrypted at rest). |
| **Database SSL** | boolean | Whether the per-tenant DB connection uses SSL. |
| **Created At** | timestamptz | Record creation timestamp. |
| **Updated At** | timestamptz | Last modification timestamp. |

> Connection params may be split into a separate `tenant_database` table if multiple databases per
> tenant are ever needed. For now, inline columns on `tenant` are sufficient.

### 1.3 Operations

- `provision(input)` — full automated provisioning. See §5.
- `get(id)` — fetch a tenant (better-auth org + companion, joined).
- `list(filters?)` — list tenants with optional filters (status, plan, serviceProviderId, lifecycle
  stage). This is the "List of Organizations" UI from the original SOW.
- `updateProfile(id, { name?, slug?, logo? })` — update the display fields on the better-auth org
  row. `tenant_admin` role can update their OWN tenant's profile only.
- `updateCompanion(id, { plan?, status? })` — update domain fields on the companion row.
  `platform_admin` only.
- `assignServiceProvider(tenantId, spId)` — set the active SP FK on the tenant companion. Validates
  SP status is `active`. `platform_admin` only.
- `unassignServiceProvider(tenantId)` — clear the SP FK. `platform_admin` only.
- `suspend(tenantId, reason)` — transition status to `suspended`. `platform_admin` only.
- `reactivate(tenantId)` — transition from `suspended` back to `active`. `platform_admin` only.
- `churn(tenantId, reason)` — transition status to `churned`. `platform_admin` only.
- `activate(tenantId)` — transition from `onboarding` to `active` (go-live). `platform_admin` only.
- `getMembers(tenantId)` — list the tenant's user memberships (delegates to better-auth
  `organization.getFullOrganization`).
- `inviteMember(tenantId, email, memberRole)` — delegate to better-auth `organization.inviteMember`.
- `removeMember(tenantId, memberIdOrEmail)` — delegate to better-auth `organization.removeMember`.

### 1.4 Tenant Status Machine

```
   provision()        activate()         suspend()         churn()
   ──────────►        ─────────►         ─────────►        ─────────►
┌────────────┐     ┌────────┐         ┌──────────┐      ┌─────────┐
│ onboarding │────►│ active │────────►│ suspended │─────►│ churned │
└────────────┘     └────────┘         └──────────┘      └─────────┘
                        ▲                   │
                        │   reactivate()    │
                        └───────────────────┘
```

`onboarding` is an opaque single stage. Internal install/training/handoff sub-steps are NOT tracked
by the platform. `churned` is terminal.

---

## 2. Service Provider

A first-class platform entity — an implementation/integration partner that does physical-world
onboarding work for a Tenant (site setup, hardware install, training). Each Tenant has at most one
active SP at a time; an SP may serve many Tenants. The SP's staged work happens during the Tenant's
`onboarding` stage. Not a Tenant subtype, not a reuse of the aspen-os `organization` module's
`Connection`.

### 2.1 Service Provider

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Name** | text | Display name of the service provider. |
| **Slug** | text (unique) | URL-friendly identifier. |
| **Logo** | text (nullable) | Logo URL or Storage reference. |
| **Description** | text (nullable) | Free-text description of the SP's services. |
| **Email** | text (nullable) | Primary contact email. |
| **Phone** | text (nullable) | Primary contact phone. |
| **Website** | text (nullable) | SP website URL. |
| **Address** | text (nullable) | SP address (single text field, control-plane). |
| **Status** | enum | `active`, `inactive`. Default `active`. `inactive` SPs cannot be assigned to new tenants but remain visible for historical/reporting purposes. |
| **Created At** | timestamptz | Record creation timestamp. |
| **Updated At** | timestamptz | Last modification timestamp. |

### 2.2 Operations

- `create(input)` — register a new SP. `platform_admin` only.
- `get(id)` — fetch an SP.
- `list(filters?)` — list SPs with optional filters (status). This is the "List of Service
  Providers" UI from the original SOW.
- `update(id, patch)` — update SP fields. `platform_admin` only.
- `deactivate(id)` — set status to `inactive`. Prevents new assignments. `platform_admin` only.
- `activate(id)` — set status to `active`. `platform_admin` only.
- `getAssignedTenants(spId)` — list tenants currently assigned to this SP.
- `getUsers(spId)` — list SP users (users with `sp_id = spId`).

---

## 3. Users & Access Controls

Users are managed by the framework's existing `AuthUnit` (single better-auth instance, single
`user`/`session`/`account`/`verification` tables in the control-plane DB). The `user` table does
NOT have a `tenant_id` column — tenant membership is via better-auth's Organization plugin `member`
table. `user.role` (text, per ADR-0001) holds the global category; SP users carry an `sp_id` FK.

### 3.1 User Categories

| Category | `user.role` | `member` rows | `sp_id` | Scope |
|---|---|---|---|---|
| Platform Admin | `platform_admin` | zero | null | Control-plane only. Cross-tenant. Uses admin-impersonation to inspect tenant data. |
| Tenant User | `tenant_user` | one or more | null | Operates on their tenant's data-plane. Per-membership role on `member` (e.g. `tenant_admin`, `tenant_user`, or recruiter-specific roles). |
| Service Provider User | `sp_user` | zero | set | Belongs to an SP. Can view assigned tenants, update onboarding status, upload install/training artifacts. |

### 3.2 User Table Extensions

The framework's existing `user` table (per ADR-0001) gains ONE new column:

| Field | Type | Description |
|---|---|---|
| **Service Provider ID** | text (FK, nullable) | Set only for `sp_user` role. References `service_provider.id`. Null for `platform_admin` and `tenant_user`. |

No `tenant_id` column. No other changes to the auth tables — the Organization plugin adds the
`organization`/`member`/`invitation` tables.

### 3.3 Operations (Platform User Workflow)

- `create({ email, name, role, spId? })` — create a platform user. Validates: `spId` required iff
  `role === 'sp_user'`. `platform_admin` only.
- `get(id)` — fetch a platform user.
- `list(filters?)` — list platform users with optional filters (role, spId). `platform_admin` only.
- `update(id, { name?, role?, spId? })` — update a platform user. `platform_admin` only.
- `delete(id)` — delete a platform user. `platform_admin` only.
- `assignRole(id, role)` — change a user's global role. `platform_admin` only.
- `assignToServiceProvider(userId, spId)` — set `sp_id` and `role = 'sp_user'`. `platform_admin`
  only.

### 3.4 Access Control Matrix

Defined via `createAccessControl` + `ac.newRole()` at the host app level, passed to better-auth via
the `admin({ ac, roles })` plugin (consistent with the existing `AuthUnit` pattern).

**Resources & operations**:

| Resource | Operations |
|---|---|
| `tenant` | `create`, `read`, `update`, `delete`, `suspend`, `provision`, `assignSp`, `activate`, `churn`, `reactivate` |
| `serviceProvider` | `create`, `read`, `update`, `delete`, `deactivate`, `activate` |
| `platformUser` | `create`, `read`, `update`, `delete`, `assignRole`, `assignToSp` |
| `report` | `read` |

**Roles**:

| Role | `tenant` | `serviceProvider` | `platformUser` | `report` |
|---|---|---|---|---|
| `platform_admin` | all ops | all ops | all ops | `read` |
| `sp_user` | `read` (assigned tenants only) | `read` (own SP only) | — | `read` (SP performance reports for own SP) |
| `tenant_admin` | `read` + `update` (own tenant profile only) | `read` (assigned SP only) | — | — |

`sp_user` and `tenant_admin` scopes are row-level (filtered to assigned/own rows), enforced in the
workflow layer, not just the access-control statement.

---

## 4. Reports

Read-only views produced by the Management Plane over the control-plane DB. All reports are
control-plane queries — they never cross into per-tenant DBs.

### 4.1 Report Categories

1. **Tenant usage metrics** — per-tenant counts of users (member rows), modules enabled, storage
   consumed (aggregated from per-tenant DBs via a scheduled sync, OR left as a future concern if
   cross-DB aggregation is out of scope), API calls (if logged), active sessions. Operational SaaS
   metrics.
2. **Provisioning & lifecycle reports** — tenants grouped by lifecycle stage
   (`onboarding`/`active`/`suspended`/`churned`), assigned SP, time-in-onboarding (duration from
   `signup_at` to `activate()`), churn reasons.
3. **Audit & activity reports** — append-only audit trail of platform operations: who
   created/suspended/churned a tenant, SP assignments, role changes, platform admin actions.
   Backed by an `audit_log` table (see §6).
4. **SP performance reports** — tenants assigned per SP, average onboarding duration, completion
   rates (count of `active` tenants previously assigned to an SP / total assigned).

### 4.2 Operations (Report Workflow)

- `tenantUsage(filters?)` — tenant usage metrics.
- `lifecycleReport(filters?)` — provisioning & lifecycle report.
- `auditReport(filters?)` — audit & activity report (filterable by actor, action, entityType,
  date range).
- `spPerformance(spId?)` — SP performance report (single SP or all).

---

## 5. Provisioning Workflow

Fully automated, run by the Management Plane module. Creates a new Tenant end-to-end.

### 5.1 Steps

1. **Create the better-auth Organization** — invoke `organization.create({ name, slug, logo })`.
   This creates the `organization` row (the Tenant identity) in the control-plane DB. Capture the
   returned org ID.
2. **Issue `CREATE DATABASE`** — connect to the Postgres server (using a tenant-creator role or the
   control-plane connection's superuser privileges) and execute `CREATE DATABASE tenant_<id>` (or a
   configurable naming scheme).
3. **Run `pushSchema()` against the new tenant DB** — instantiate a drizzle client for the new
   database and run `pushSchema(allModuleSchemas, db)` to apply all module schemas (organization,
   compliance, tasks, drive, hr). This mirrors `DatabaseUnit.$prepare()` but targets the new tenant
   DB.
4. **Seed the aspen-os Organization profile row** — insert a row into the per-tenant DB's
   `organization` table (the rich-profile companion) with ID = the better-auth org ID, sharing the
   name/slug from the better-auth org (denormalized for the per-tenant DB's convenience, with the
   control-plane better-auth org as source of truth).
5. **Record connection params** — insert the companion `tenant` row in the control-plane DB with
   the per-tenant DB connection params, status = `onboarding`, signup_at = now.
6. **Assign a Service Provider** (optional) — if an SP was specified in the provisioning input, set
   the `service_provider_id` FK on the tenant companion. Validates SP status is `active`.
7. **Emit `tenant:provisioned` event** — publish via PubSub for any subscribers (e.g., a future
   billing module, notification service).

### 5.2 Provisioning Input

| Field | Type | Description |
|---|---|---|
| **Name** | text | Tenant display name. |
| **Slug** | text (unique) | URL-friendly identifier. |
| **Logo** | text (nullable) | Logo URL or Storage reference. |
| **Plan** | text (nullable) | Subscription plan. |
| **Service Provider ID** | text (FK, nullable) | SP to assign. |
| **Database Host** | text (nullable) | Override default per-tenant DB host. |
| **Database Port** | integer (nullable) | Override default port. |
| **Database Name** | text (nullable) | Override default naming scheme. |
| **Database User** | text (nullable) | Override default DB user. |
| **Database Password** | text (nullable) | Override default DB password. |
| **Database SSL** | boolean (nullable) | Override default SSL setting. |

### 5.3 Syncronous vs. Async

The provisioning flow MAY run synchronously (blocking the API call until complete) or be published
as a `tenant:provision` pubsub job with a subscriber handling the full flow asynchronously (the
tenant row is created in a `provisioning` status and moves to `onboarding` on completion). The
async approach decouples the API response from the (slow) DB creation + schema push and supports
retries. Decision deferred to implementation; both are valid.

---

## 6. Audit Log

An append-only record of platform operations, backing the audit & activity reports (§4.1.3).

### 6.1 Audit Entry

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Action** | enum | `tenant_provisioned`, `tenant_activated`, `tenant_suspended`, `tenant_reactivated`, `tenant_churned`, `tenant_profile_updated`, `sp_assigned`, `sp_unassigned`, `sp_created`, `sp_updated`, `sp_deactivated`, `sp_activated`, `platform_user_created`, `platform_user_updated`, `platform_user_deleted`, `role_assigned`, `sp_assigned_to_user`. |
| **Actor ID** | text (FK) | The platform admin who performed the action. |
| **Entity Type** | text | `tenant`, `serviceProvider`, `platformUser`. |
| **Entity ID** | text | The affected entity's ID. |
| **Previous State** | jsonb (nullable) | State before the action (for status transitions, role changes). |
| **New State** | jsonb (nullable) | State after the action. |
| **Changes** | jsonb (nullable) | Field-level diff for updates. |
| **Performed At** | timestamptz | When the action was performed. |
| **Metadata** | jsonb (nullable) | Extensible. |

---

## 7. Module Structure

Follows the standard aspen-os domain module pattern (see `organization`, `compliance`, `tasks`,
`drive` for reference).

```
packages/management-plane/
  src/
    index.ts              # ManagementPlaneModule.create(config), $initialize(units), getters
    db-schema.ts          # drizzle schema namespace: tenant, service_provider, audit_log
    types.ts              # ManagementPlaneConfig, input types, filters
    event-map.ts          # ManagementPlaneEventMap (tenant:provisioned, tenant:activated, etc.)
    constants.ts          # TENANT_STATUS, SP_STATUS, AUDIT_ACTIONS, ROLES
    schemas/              # valibot input schemas for create/update/filter
    workflows/
      tenant-workflow.ts          # provision, get, list, updateProfile, suspend, churn, etc.
      service-provider-workflow.ts # create, get, list, update, deactivate, activate
      platform-user-workflow.ts    # create, get, list, update, delete, assignRole, assignToSp
      report-workflow.ts           # tenantUsage, lifecycleReport, auditReport, spPerformance
      provisioning-workflow.ts     # the automated provisioning flow (§5)
  package.json           # @aspen-os/management-plane, deps on framework + constants
  SOW.md                 # this file
```

- **`$name`**: `"management-plane"` (kebab-case).
- **`$initialize(units)`** signature: `{ db, auth, pubsub }`. The module needs `auth` to invoke
  better-auth's Organization plugin API, `db` for the control-plane tables, and `pubsub` for
  events.
- **`$prepare()`**: pushes the module's schema (`tenant`, `service_provider`, `audit_log`) to the
  control-plane DB. Does NOT touch per-tenant DBs (those are provisioned by the
  `ProvisioningWorkflow`).
- **`db_schema`** export: the drizzle schema namespace for `tenant`, `service_provider`,
  `audit_log`.
- **`event-map.ts`**: events include `tenant:provisioned`, `tenant:activated`,
  `tenant:suspended`, `tenant:reactivated`, `tenant:churned`, `tenant:profile_updated`,
  `tenant:sp_assigned`, `tenant:sp_unassigned`, `service_provider:created`,
  `service_provider:updated`, `service_provider:deactivated`, `service_provider:activated`,
  `platform_user:created`, `platform_user:updated`, `platform_user:deleted`,
  `platform_user:role_assigned`.

---

## 8. Dependencies & Integration

### 8.1 Units Used

| Unit | Used for |
|---|---|
| `db` | Control-plane DB access (tenant, service_provider, audit_log tables). Per-tenant DB access is via a drizzle client created by the `ProvisioningWorkflow`, NOT the framework's `db` unit. |
| `auth` | Invoking better-auth's Organization plugin API (`organization.create`, `organization.inviteMember`, etc.) and the admin-impersonation API. User/role management delegates to the existing `AuthUnit` workflows. |
| `pubsub` | Publishing `tenant:*`, `service_provider:*`, `platform_user:*` events. |

### 8.2 Framework Kernel Changes (out of scope for this module, required by the host app)

These changes are required by ADR-0005/0006 but are framework kernel work, not Management Plane
module work:

- `DatabaseUnit` becomes tenant-aware (resolves per-tenant connection pool from `tenantId`).
- `run()` AsyncLocalStorage context gains `tenantId`.
- The host app wires better-auth's Organization plugin into `AuthUnit` (adds `organization()` to
  the better-auth plugin list, configures the Organization plugin options).
- The `user` table gains the `sp_id` FK column.

### 8.3 Module Config

```ts
type ManagementPlaneConfig = {
  // Postgres connection params for issuing CREATE DATABASE (tenant-creator role)
  postgresAdminConnection: { host, port, user, password, database }
  // Default per-tenant DB connection params (overridable per provisioning request)
  defaultTenantDbHost: string
  defaultTenantDbPort: number
  defaultTenantDbUser: string
  defaultTenantDbPassword: string
  defaultTenantDbSsl: boolean
  // Per-tenant DB naming scheme (e.g. `tenant_${id}`)
  tenantDbNamingScheme: (tenantId: string) => string
  // Module schemas to push during provisioning (organization, compliance, tasks, drive, hr)
  moduleSchemas: Record<string, DrizzleSchema>
}
```

---

## 9. SOW Revisions from Original

The original SOW bullets, with their resolutions:

| Original bullet | Resolution |
|---|---|
| "SaaS Management Module that manages the multi-tenant setup" | Confirmed — the Management Plane module. |
| "drizzle schema with a schema name 'management' with better-auth tables for admin access" | **Revised**: no `management` Postgres schema (default schema, like other modules). Auth tables stay in the control-plane DB's default schema (single realm). No separate "better-auth tables for admin access" — the existing auth tables are reused. |
| "Better Auth setup for management portal" | **Revised**: use the framework's existing `AuthUnit` (single better-auth instance). No separate auth setup. Add better-auth's Organization plugin for tenant membership. |
| "Users — Users with Access Controls" | Confirmed — §3. Four categories, 3 roles, 4 resources, access-control matrix in §3.4. |
| "List of Service Providers" | Confirmed — §2. First-class entity, identity + contact + status fields. |
| "List of Organizations — Name, Logo, Users" | **Revised wording**: "List of Tenants" (the SOW's "Organizations" was loose wording for Tenants). Name/Logo live on the better-auth org row; Users are the tenant's members. §1. |
| "Reports" (empty bullet) | Confirmed — §4. Four categories: tenant usage, provisioning/lifecycle, audit/activity, SP performance. |

Additional decisions captured during grilling but not in the original SOW:
- **Service Provider** is an implementation/integration partner doing physical-world onboarding work
  (Round 3-6). 1:1 active per Tenant. Stages live on the Tenant, not the assignment. `onboarding`
  is opaque (no internal sub-steps).
- **Database-per-tenant isolation** (ADR-0006). Auth in control-plane DB only.
- **Platform admins never touch the data-plane**; use admin-impersonation if needed.
- **Fully-automated provisioning** (§5).
- **Tenant ≡ better-auth Organization**; aspen-os `organization` module's Organization is a 1:1
  rich-profile companion in the per-tenant DB.
