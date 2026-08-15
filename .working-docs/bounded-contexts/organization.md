# Organization Context

> Package: `@aspen-os/organization`. Domain module for the organization profile — the root business entity and its branches.

## Relationship Type

Downstream of the Platform (Customer–Supplier). Implements the `Module` interface; receives no unit deps via `$initialize(units)` (stateless — workflow groups are `readonly` properties).

## Structure (`packages/organization/`)

- `Organization.create(config)` — factory returning a Module instance; `$config: OrganizationConfig = { country: "INDIA" }`
- `$name = "organization"`, `$dependencies = ["masters"]`
- Stateless: `$initialize()` / `$prepareRuntime()` / `$cleanup()` are empty
- 2 workflow groups exposed as `readonly` properties: `organizations`, `branches`
- 2 database tables (all `tenant_schemas`): `organization`, `branch`
- 7 domain events published via PubSub (`OrganizationDomainEventMap`)
- 2 ACL resources: `organization`, `branch`
- Valibot validation schemas for all inputs
- `$prepareInfra()` returns declarative infra (db schemas, acl, events) — schema pushing handled centrally by the platform
- Has a build step (build script + `build` field in package.json)

## Exposed on the platform instance

```
p.organization.branches        { activate, archive, close, create, deactivate, get, list, restore, tree, update }
p.organization.organizations   { create, deleteLogo, get, update, updateBranding, uploadLogo }
```

Workflows are one file per action under `workflows/<entity>/<verb>.ts` (e.g. `org/branding/update.ts`, `branch/tree.ts`).

## Cross-context integration

- **Compliance** subscribes to `organization:branch_created` (trade license + fire safety certificate + annual obligation). The old `organization:connection_created` insurance flow was reworked to subscribe to `masters:contact_created` in the Masters module.
- **Management** depends on this module (`$dependencies: ["organization"]`); provisioning seeds the aspen-os Organization profile row 1:1 with a Tenant (shares the better-auth org ID).
- **Masters** (`@aspen-os/masters`) owns the polymorphic master data surface (contacts, addresses, bank accounts, connections, notes) that was extracted out of this module.

## Language

- Organization, Branch, Workflow, OrganizationConfig
- Avoid: Company (for Organization), Tenant (different concept — see Management), Location/Site (for Branch), Contact/Connection/Address/Bank Account/Note (moved to Masters)
