# Organization Context

> Package: `@aspen-os/organization`. Domain module for the organization profile — the root business entity and its branches, connections, addresses, and bank accounts.

## Relationship Type

Downstream of the Platform (Customer–Supplier). Implements the `Module` interface; receives no unit deps via `$initialize(units)` (stateless — workflow groups are `readonly` properties).

## Structure (`packages/organization/`)

- `Organization.create(config)` — factory returning a Module instance; `$config: OrganizationConfig = { country: "INDIA" }`
- `$name = "organization"`, `$dependencies = []`
- Stateless: `$initialize()` / `$prepareRuntime()` / `$cleanup()` are empty
- 5 workflow groups exposed as `readonly` properties: `organizations`, `branches`, `addresses`, `bankAccounts`, `connections`
- 7 database tables (all `tenant_schemas`): `organization`, `branch`, `connection`, `connection_contact`, `connection_note`, `address`, `bank_account`
- 11 domain events published via PubSub (`OrganizationDomainEventMap`)
- 5 ACL resources: `organization`, `branch`, `connection`, `address`, `bankAccount`
- Valibot validation schemas for all inputs
- `$prepareInfra()` returns declarative infra (db schemas, acl, events) — schema pushing handled centrally by the platform
- Has a build step (build script + `build` field in package.json)

## Exposed on the platform instance

```
p.organization.addresses       { create, delete, get, list, setPrimary, update }
p.organization.bankAccounts    { activate, create, deactivate, delete, get, list, setPrimary, update }
p.organization.branches        { activate, archive, close, create, deactivate, get, list, restore, tree, update }
p.organization.connections     { addNote, archive, create, createContact, deleteContact, get, list,
                                 listContacts, listNotes, restore, search, searchContacts,
                                 setPrimaryContact, update, updateContact, updateStatus }
p.organization.organizations   { create, deleteLogo, get, update, updateBranding, uploadLogo }
```

Workflows are one file per action under `workflows/<entity>/<verb>.ts` (e.g. `org/branding/update.ts`, `connection/contact/create.ts`, `branch/tree.ts`).

## Cross-context integration

- **Compliance** subscribes to `organization:branch_created` (trade license + fire safety certificate + annual obligation) and `organization:connection_created` (insurance policy document if the connection type is `insurer`).
- **Management** depends on this module (`$dependencies: ["organization"]`); provisioning seeds the aspen-os Organization profile row 1:1 with a Tenant (shares the better-auth org ID).

## Language

- Organization, Branch, Connection, Connection Contact, Connection Note, Address, Bank Account, Workflow, OrganizationConfig
- Avoid: Company (for Organization), Tenant (different concept — see Management), Location/Site (for Branch), Contact (for Connection — that's the person/entity distinction in the DMS context)
