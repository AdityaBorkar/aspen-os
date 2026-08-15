# Masters Context

> Package: `@aspen-os/masters`. Domain module for polymorphic tenant master data — contacts, addresses, bank accounts, integration connections, and notes.

## Relationship Type

Downstream of the Platform (Customer–Supplier). Implements the `Module` interface; receives the `kvStore` unit via `$initialize(units)` for secret storage (workflow groups other than `connections` are stateless `readonly` properties).

## Structure (`packages/masters/`)

- `Masters.create(config?)` — factory returning a Module instance; `$config: MastersModuleConfig = undefined`
- `$name = "masters"`, `$dependencies = []`
- `$initialize({ db, kvStore })` stores the kvStore unit; `$prepareRuntime()` / `$cleanup()` are empty
- 5 workflow groups: `contacts`, `addresses`, `bankAccounts`, `notes` (stateless `readonly` properties) and `connections` (getter bound to the kvStore unit for `create`/`rotateCredential`)
- 5 database tables (all `tenant_schemas`, `master_` prefix): `master_contact`, `master_address`, `master_bank_account`, `master_connection`, `master_note`
- 16 domain events published via PubSub (`MastersEventMap`)
- 5 ACL resources: `contact`, `address`, `bankAccount`, `connection`, `note`
- Valibot validation schemas for all inputs
- `$prepareInfra()` returns declarative infra (db schemas, acl, events) — schema pushing handled centrally by the platform
- Has a build step (build script + `build` field in package.json)

## Exposed on the platform instance

```
p.masters.addresses       { create, delete, get, list, setPrimary, update }
p.masters.bankAccounts    { activate, create, deactivate, delete, get, list, setPrimary, update }
p.masters.connections     { activate, create, deactivate, delete, get, list, rotateCredential,
                            test, update }
p.masters.contacts        { create, delete, get, list, setPrimary, update }
p.masters.notes           { add, list, remove }
```

All entities are polymorphic: create/list require `entityType` (`organization` | `branch` | `connection` | `contact`) + `entityId`. Workflows are one file per action under `workflows/<entity>/<verb>.ts`; reusable fetch steps live in `workflow-steps/`.

## Cross-context integration

- **Compliance** subscribes to `masters:contact_created` and creates an `insurance_policy` compliance document when `contact.type === "insurer"` and `entityType === "organization"` (replaces the old `organization:connection_created` subscription).
- **Organization** depends on this module (`$dependencies: ["masters"]`) for the master-data surface that was extracted out of it.

## Language

- Contact, Address, Bank Account, Connection (integration), Note, `(entityType, entityId)` scope, `credentialRef`, rotateCredential
- Avoid: Connection for business relationships (that is now a `Contact` with a `CONTACT_TYPE`); Vendors/Clients/Insurers as entities (they are `Contact` values).
