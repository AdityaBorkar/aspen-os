# Organization Context

> Package: `@aspen-os/organization`. Domain module for branches — the tenant's locations. The organization profile itself lives in `@aspen-os/masters` settings (`org.*` keys).

## Relationship Type

Downstream of the Platform (Customer–Supplier). Implements the `Module` interface; receives no unit deps via `$initialize(units)` (stateless — the workflow group is a `readonly` property).

## Structure (`packages/organization/`)

- `Organization.create(config)` — factory returning a Module instance; `$config: OrganizationConfig = { country: "INDIA" }`
- `$name = "organization"`, `$dependencies = []` — no module deps
- Stateless: `$initialize()` / `$prepareRuntime()` / `$cleanup()` are empty
- 1 workflow group exposed as a `readonly` property: `branches`
- 1 database table (`tenant_schemas`): `branch`
- 2 domain events published via PubSub (`OrganizationDomainEventMap`)
- 1 ACL resource: `branch`
- Valibot validation schemas for all inputs
- `$prepareInfra()` returns declarative infra (db schemas, acl, events) — schema pushing handled centrally by the platform
- Has a build step (build script + `build` field in package.json)

## Exposed on the platform instance

```
p.organization.branches        { create, get, list, tree, update }
```

Workflows are one file per action under `workflows/<entity>/<verb>.ts` (e.g. `branch/tree.ts`).

## Cross-context integration

- **Compliance** subscribes to `organization:branch_created` (trade license + fire safety certificate + annual obligation). The old `organization:connection_created` insurance flow was reworked to subscribe to `masters:contact_created` in the Masters module.
- **Management** provisions tenants against the better-auth org ID; the organization profile (name, slug, logo, branding) is stored as `org.*` settings in Masters.
- **Masters** (`@aspen-os/masters`) owns the polymorphic master data surface (contacts, addresses, bank accounts, connections, notes) that was extracted out of this module, plus the `org.*` tenant settings.

## Language

- Branch, Workflow, OrganizationConfig
- Avoid: Company (for Organization), Tenant (different concept — see Management), Location/Site (for Branch), Contact/Connection/Address/Bank Account/Note (moved to Masters)
