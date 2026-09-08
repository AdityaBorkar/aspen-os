# Masters Context

> Package: `@aspen-os/masters`. Domain module for polymorphic tenant master data — contacts, addresses, bank accounts, integration connections, entities, and payment methods — plus tenant-wide units of measure and the tenant settings KV (organization profile + per-user settings).

## Relationship Type

Downstream of the Platform (Customer–Supplier). Implements the `Module` interface; receives the `kvStore` unit via `$initialize(units)` for secret storage (workflow groups other than `connections` are stateless `readonly` properties).

## Structure (`packages/masters/`)

- `Masters.create(config?)` — factory returning a Module instance; `$config: MastersModuleConfig = undefined`
- `$name = "masters"`, `$dependencies = []`
- `$initialize({ db, kvStore })` stores the kvStore unit; `$prepareRuntime()` / `$cleanup()` are empty
- 7 workflow groups: `contacts`, `addresses`, `bankAccounts`, `entities`, `paymentMethods`, `unitsOfMeasure` (stateless `readonly` properties) and `connections` (getter bound to the kvStore unit for `create`/`rotateCredential`), plus `settings` (stateless `readonly` property for the tenant settings KV)
- 8 database tables (all `tenant_schemas`, `master_` prefix): `master_contact`, `master_address`, `master_bank_account`, `master_connection`, `master_entity`, `master_payment_method`, `master_unit_of_measure`, `master_setting`
- 23 domain events published via PubSub (`MastersEventMap`) — settings changes are audit-logged, not published
- 8 ACL resources: `contact`, `address`, `bankAccount`, `connection`, `entity`, `paymentMethod`, `unitOfMeasure`, `setting`
- Valibot validation schemas for all inputs
- `$prepareInfra()` returns declarative infra (db schemas, acl, events) — schema pushing handled centrally by the platform
- Has a build step (build script + `build` field in package.json)

## Exposed on the platform instance

```
p.masters.addresses       { create, delete, get, list, setPrimary, update }
p.masters.bankAccounts    { activate, create, deactivate, delete, get, list, setPrimary, update }
p.masters.connections     { activate, create, deactivate, delete, get, list, rotateCredential,
                            test, update }
p.masters.contacts        { create, delete, get, list, remove, setPrimary, update }
p.masters.entities        { create, delete, get, list, setStatus, update }
p.masters.paymentMethods  { activate, create, deactivate, delete, get, list, setPrimary, update }
p.masters.settings        { get, set }
p.masters.unitsOfMeasure  { activate, create, deactivate, delete, get, list, update }
```

Polymorphic entities (`addresses`, `bankAccounts`, `connections`, `paymentMethods`) require `entityType` (`organization` | `branch` | `connection` | `contact` | `entity`) + `entityId` on create/list. `contacts` accept an optional scope — omit both for global address-book entries (absorbed from DMS); `entities` and `unitsOfMeasure` are tenant-level — no scope pair. `settings` is the tenant settings KV: keys under the `org.` prefix (`org.id`, `org.branding`, `org.logo`) are tenant-wide rows (`user_id` null); every other key is scoped to the acting user (absorbed the workspace `workspace_setting` surface). Workflows are one file per action under `workflows/<entity>/<verb>.ts`; reusable fetch steps and business-rule steps live in `workflow-steps/`.

## Cross-context integration

- **Compliance** subscribes to `masters:contact_created` and creates an `insurance_policy` compliance document when `contact.type === "insurer"` and `entityType === "organization"` (organization-scoped only; global contacts are ignored — replaces the old `organization:connection_created` subscription).
- **DMS** subscribes to `masters:contact_removed` (contact-share bridge) and revokes every DMS share granted to the removed contact, invalidating contact `shareToken`s.
- **Organization** depends on this module (`$dependencies: ["masters"]`) for the master-data surface that was extracted out of it.
- **Notes** (removal): the note concept moved to `@aspen-os/notes` — scoped annotation notes migrate with `scopeType = masters:<entityType>`.
- **Accounting / Inventory** (future, stubs) are the intended consumers of `paymentMethod` / `unitOfMeasure`.
- **Filter views** now live in `@aspen-os/workspace` (`p.workspace.filterViews`, `workspace_filter_view`) — the single saved-filter store for all domains.

## Language

- Contact, Address, Bank Account, Connection (integration), Entity, Payment Method, Unit of Measure, `(entityType, entityId)` scope, `(entityType, entityId, direction)` primary scope, `credentialRef`, rotateCredential, base unit, conversionFactor, Setting (`org.*` tenant-wide, other keys per-user)
- Avoid: Connection for business relationships (that is now a `Contact` with a `CONTACT_TYPE`); Vendors/Clients/Insurers as entities (they are `Contact` values); PAN/CVV or full card numbers for payment methods (masked `cardLast4` only); "UOM sets per owner" (units of measure are tenant-wide); Notes (that is now `@aspen-os/notes`); Filter View (now `@aspen-os/workspace`); Saved View / File View (those are now `Filter View` in workspace)
