# Management Plane Domain Model

> Package: `@aspen-os/management`. The control-plane domain — Tenants, Service Providers, Platform Users, and the audit trail over them. 3 owned tables (all control-plane); no shadow tables.

## Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                  MANAGEMENT PLANE DOMAIN                             │
│                                                                     │
│  ┌──────────────────┐       ┌──────────────────────┐                │
│  │      Tenant       │──1:N──│   AuditLog           │                │
│  │  (companion)      │       │  (platform core —    │                │
│  │  id (PK)          │       │   not module-owned)  │                │
│  │  status (enum)    │       │  id (PK)             │                │
│  │  plan             │       │  entityType (text)   │                │
│  │  serviceProviderId│──N:1─→│  entityId            │                │
│  │  signupAt         │       │  action (text, 17)   │                │
│  │  databaseHost     │       │  actorId             │                │
│  │  databaseName     │       │  performedAt         │                │
│  │  databasePort     │       │  previousState (jsonb)│               │
│  │  databaseUser     │       │  newState (jsonb)     │               │
│  │  databasePassword │       │  changes (jsonb)      │               │
│  │  databaseSsl      │       │  metadata (jsonb)     │               │
│  │  suspendedAt      │       └──────────────────────┘                │
│  │  suspendedReason  │                                               │
│  │  churnedAt        │       ┌──────────────────────┐                │
│  │  churnReason      │       │  ServiceProvider      │                │
│  └────────┬──────────┘       │  id (PK)              │                │
│           │                  │  name                 │                │
│           │ 1:1              │  slug (uniq)          │                │
│           │                  │  status (enum)        │                │
│           ▼                  │  description          │                │
│  ┌──────────────────┐       │  email, phone         │                │
│  │  better-auth     │       │  address, website     │                │
│  │  Organization    │       │  logo                 │                │
│  │  (the Tenant)    │       └──────────┬───────────┘                │
│  │  id (PK)         │                  │ 1:N                        │
│  │  name / slug / logo │               ▼                            │
│  │  (control plane) │       ┌──────────────────────┐                │
│  └──────────────────┘       │  ServiceProviderUser  │                │
│                              │  id (PK)              │                │
│  ┌──────────────────┐       │  userId (FK→User)     │                │
│  │ aspen-os         │       │  serviceProviderId    │                │
│  │ Organization     │       │    (FK→ServiceProvider)│               │
│  │ (rich profile    │       │  (1:1 join, no spId    │               │
│  │  companion,      │       │   column on user)      │               │
│  │  per-tenant)     │       └──────────┬───────────┘                │
│  │ id = tenant id   │                  │ 1:N                        │
│  └──────────────────┘                  ▼                            │
│                                        ┌──────────────┐             │
│                                        │  User        │             │
│                                        │  (better-auth)│            │
│                                        └──────────────┘             │
│                                                                     │
│  Owned tables (control_plane):   tenant, service_provider,          │
│    service_provider_user                                            │
│  Shadow tables (tenant):   (none — tenant_schemas is empty)         │
│                                                                     │
│  Roles: platform_admin, sp_user, tenant_admin, tenant_user           │
│  Config: ManagementPlaneConfig = undefined (WIP)                    │
│  Deps: ["organization"]                                             │
└─────────────────────────────────────────────────────────────────────┘
```

## Aggregates

### Tenant (Aggregate Root)

**Identity**: `id` (text, PK — shares ID with the better-auth Organization row)

**Value objects**:

- `TenantStatus` — enum: `onboarding`, `active`, `suspended`, `churned`

**Invariants**:

- Status transitions: `onboarding` → `active` → `suspended` ↔ `active` → `churned` (enforced in workflow)
- `suspendedAt`/`suspendedReason` set when suspended; `churnedAt`/`churnReason` set when churned
- At most one active Service Provider assignment (`serviceProviderId`)
- Database connection params (`databaseHost`, `databaseName`, `databasePort`, `databaseUser`, `databasePassword`, `databaseSsl`) record the per-tenant DB connection
- `onboarding` is an opaque single stage — internal install/training/handoff sub-steps are NOT tracked

**Lifecycle commands** (via `p.management.tenants`): `onboard(input)` (provisions a new tenant — creates the better-auth org, calls `dbUnit.provisionTenant()` which creates the DB + pushes schemas in isolated mode, seeds the profile via `dbUnit.seedTenantDb()`, records the tenant row, writes an audit entry, publishes `tenant:provisioned`), `get(id)` (joins `organization` + `tenant` tables), `list(filters?)`, `update(id, { profile?, companion? })`, `activate(id)`, `suspend(id, reason)`, `reactivate(id)`, `churn(id, reason)`, `assignServiceProvider(tenantId, spId)`, `unassignServiceProvider(tenantId)`.

**Relationships**: 1:1 with better-auth Organization (shares ID); N:1 with ServiceProvider (`serviceProviderId`).

### Service Provider (Aggregate Root)

**Identity**: `id` (text, PK, `default uuidv7()`)

**Value objects**: `SpStatus` — enum: `active`, `inactive`.

**Invariants**: `slug` must be unique; status can be toggled active/inactive; at most one active SP per tenant; an SP may serve many Tenants.

**Lifecycle commands** (via `p.management.serviceProviders`): `create(input)`, `get(id)`, `list(filters?)`, `update(id, patch)`, `activate(id)`, `deactivate(id)`, `getAssignedTenants(spId)`, `getUsers(spId)`.

**Relationships**: Has many `ServiceProviderUser` (1:N); has many `Tenant` (1:N).

### Platform User (Aggregate Root)

**Identity**: `id` (text, PK — the better-auth `user` table ID)

**Invariants**:

- SP membership is via a `service_provider_user` join row (1:1 user→SP), not an `spId` column on `user`
- If `role = 'sp_user'`, a `service_provider_user` row must exist; if `role != 'sp_user'`, none
- Created/deleted via `AuthUnit.user` API (better-auth); the SP link is managed on `service_provider_user` in the control-plane DB

**Lifecycle commands** (via `p.management.users`): `create(input)` (delegates to `auth.user.create()`, inserts a `service_provider_user` row if SP user), `get(id)`, `list(filters?)` (leftJoin `service_provider_user` to surface `spId` = `serviceProviderId`), `update(id, patch)`, `delete(id)` (delegates to `auth.user.remove()`, cascades the `service_provider_user` row), `assignRole(id, role)` (delegates to `auth.user.role.assign()`), `assignToServiceProvider(userId, spId)` (sets `role='sp_user'` + inserts the join row).

### Audit Log (Entity — append-only, Platform Core)

**Identity**: `id` (uuid, PK, `$defaultFn(() => uuidv7())`)

**Invariants**:

- Append-only (no updates/deletes)
- Lives in the platform's `audit_log` table (NOT a management-owned table)
- `entityType` is one of: `tenant`, `serviceProvider`, `platformUser`
- `action` is one of 17 defined audit actions (e.g. `tenant_provisioned`, `sp_created`, `platform_user_updated`, `role_assigned`) — `as const` constants in `management/src/utils/constants.ts`
- Written inline in each management workflow via `ctx.audit.write(...)` (NOT via a shared `logAuditStep`)
- Polymorphic: `entityType` + `entityId` references any management entity

## Domain Events — 16

### Tenant Events (8)

| Event                    | Payload                            | Trigger                                                         |
| ------------------------ | ---------------------------------- | --------------------------------------------------------------- |
| `tenant:provisioned`     | `{ tenantId, serviceProviderId? }` | Tenant provisioned (DB created, schemas pushed, profile seeded) |
| `tenant:activated`       | `{ tenantId }`                     | Tenant activated (from onboarding/suspended)                    |
| `tenant:suspended`       | `{ tenantId, reason }`             | Tenant suspended                                                |
| `tenant:reactivated`     | `{ tenantId }`                     | Tenant reactivated from suspended                               |
| `tenant:churned`         | `{ tenantId, reason }`             | Tenant churned (offboarded)                                     |
| `tenant:profile_updated` | `{ tenantId, changes }`            | Tenant profile updated                                          |
| `tenant:sp_assigned`     | `{ tenantId, serviceProviderId }`  | Service Provider assigned to tenant                             |
| `tenant:sp_unassigned`   | `{ tenantId }`                     | Service Provider unassigned from tenant                         |

### Service Provider Events (4)

| Event                          | Payload                                      | Trigger                      |
| ------------------------------ | -------------------------------------------- | ---------------------------- |
| `service_provider:created`     | `{ serviceProvider: { id, name, slug } }`    | Service Provider created     |
| `service_provider:updated`     | `{ serviceProvider: { id, name }, changes }` | Service Provider updated     |
| `service_provider:deactivated` | `{ serviceProviderId }`                      | Service Provider deactivated |
| `service_provider:activated`   | `{ serviceProviderId }`                      | Service Provider activated   |

### Platform User Events (4)

| Event                         | Payload                         | Trigger                        |
| ----------------------------- | ------------------------------- | ------------------------------ |
| `platform_user:created`       | `{ user: { id, email, role } }` | Platform user created          |
| `platform_user:updated`       | `{ userId, changes }`           | Platform user updated          |
| `platform_user:deleted`       | `{ userId }`                    | Platform user deleted          |
| `platform_user:role_assigned` | `{ userId, role }`              | Role assigned to platform user |

## Command-Query Separation

### Commands (Write Side)

| Context          | Command                | Method                                                      |
| ---------------- | ---------------------- | ----------------------------------------------------------- |
| Management Plane | Onboard tenant         | `p.management.tenants.onboard()`                            |
| Management Plane | Update tenant          | `p.management.tenants.update()`                             |
| Management Plane | Activate tenant        | `p.management.tenants.activate()`                           |
| Management Plane | Suspend tenant         | `p.management.tenants.suspend()`                            |
| Management Plane | Churn tenant           | `p.management.tenants.churn()`                              |
| Management Plane | Assign SP to tenant    | `p.management.tenants.assignServiceProvider()`              |
| Management Plane | Create SP              | `p.management.serviceProviders.create()`                    |
| Management Plane | Update SP              | `p.management.serviceProviders.update()`                    |
| Management Plane | Activate/deactivate SP | `p.management.serviceProviders.activate()` / `deactivate()` |
| Management Plane | Create platform user   | `p.management.users.create()`                               |
| Management Plane | Update platform user   | `p.management.users.update()`                               |
| Management Plane | Delete platform user   | `p.management.users.delete()`                               |
| Management Plane | Assign role            | `p.management.users.assignRole()`                           |
| Management Plane | Assign user to SP      | `p.management.users.assignToServiceProvider()`              |

### Queries (Read Side)

| Context          | Query                   | Method                                               |
| ---------------- | ----------------------- | ---------------------------------------------------- |
| Management Plane | Get tenant              | `p.management.tenants.get()`                         |
| Management Plane | List tenants            | `p.management.tenants.list()`                        |
| Management Plane | Get SP                  | `p.management.serviceProviders.get()`                |
| Management Plane | List SPs                | `p.management.serviceProviders.list()`               |
| Management Plane | Get SP assigned tenants | `p.management.serviceProviders.getAssignedTenants()` |
| Management Plane | Get SP users            | `p.management.serviceProviders.getUsers()`           |
| Management Plane | Get platform user       | `p.management.users.get()`                           |
| Management Plane | List platform users     | `p.management.users.list()`                          |

## Invariants & Business Rules

1. **SP slug uniqueness** — enforced by DB unique constraint on `service_provider.slug`.
2. **SP user resolved via `service_provider_user` table** — a join table (1:1 from user to SP via FK), replacing the earlier `user.spId` column design. Role `'sp_user'` requires a matching `service_provider_user` row; enforced in workflow.
3. **Tenant status transitions** — `onboarding` → `active` → `suspended` ↔ `active` → `churned` (enforced in workflow).
4. **Audit log append-only** — no updates or deletes; written via platform `ctx.audit.write(...)` inline in each workflow (the platform's `audit_log` table, not a module-local table).
5. **Tenant-Organization ID sharing** — tenant companion table ID = better-auth organization ID (1:1 relationship).
6. **Provisioning idempotency** — `CREATE DATABASE` catches "already exists" errors and continues.
7. **Control-plane only** — platform admins and all reports work ONLY against the control-plane DB; reports never cross into per-tenant DBs.
