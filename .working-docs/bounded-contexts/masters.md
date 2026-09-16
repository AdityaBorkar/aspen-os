# Masters Context

> Package: `@aspen-os/masters`. Polymorphic tenant master data — contacts, addresses, integration connections, entities, payment methods (inline bank details, no `bank_account` table), labels, org branches — plus tenant-wide units of measure (alias + version history) and tenant settings KV (organization profile + per-user settings).

## Relationship Type

Downstream of the Platform (Customer–Supplier). Implements the `Module` interface; receives the `kvStore` unit via `$initialize(units)` for secret storage (workflow groups other than `connections` are stateless `readonly` properties).

## Structure (`packages/masters/`)

- `Masters.create(config?)` — factory returning a Module instance; `$config: MastersModuleConfig = undefined`
- `$name = "masters"`, `$dependencies = []`
- `$initialize({ db, kvStore })` stores kvStore unit; `$prepareRuntime()` / `$cleanup()` empty
- 9 workflow groups: `addresses`, `contacts`, `entities`, `labels`, `orgBranches`, `paymentMethods`, `settings`, `unitsOfMeasure` (stateless `readonly` properties) and `connections` (getter bound to kvStore unit for `create`/`rotateCredential`)
- 12 database tables (all `tenant_schemas`; `master_` prefix except `org_branch`): `master_contact`, `master_address`, `master_connection`, `master_entity`, `master_payment_method`, `master_unit_of_measure`, `master_uom_alias`, `master_uom_version`, `master_label`, `master_entity_label`, `master_setting`, plus `org_branch`
- 32 domain events published via PubSub (`MastersEventMap`) — settings changes are audit-logged, not published
- 9 ACL resources: `contact`, `address`, `connection`, `entity`, `paymentMethod`, `unitOfMeasure`, `label`, `orgBranch`, `setting`
- Valibot validation schemas for all inputs
- `$prepareInfra()` returns declarative infra (db schemas, acl, events) — schema pushing handled centrally by the platform
- Has a build step (build script + `build` field in package.json)

## Exposed on the platform instance

```
p.masters.addresses       { create, delete, get, list, update }
p.masters.connections     { check, create, delete, get, list, rotateCredential,
                            update }
p.masters.contacts        { create, delete, get, list, remove, update }
p.masters.entities        { create, delete, get, list, update }
p.masters.paymentMethods  { activate, create, deactivate, delete, get, list, setPrimary, update }
p.masters.labels          { apply, create, delete, get, list, listByLabel, remove, update }
p.masters.orgBranches     { create, get, list, tree, update }
p.masters.settings        { get, set }
p.masters.unitsOfMeasure  { convert, create, delete, get, list, publish, retire,
                            seed, setDefault, update, versions }
```

Polymorphic entities (`addresses`, `connections`, `paymentMethods`) require `entityType` (`organization` | `branch` | `connection` | `contact` | `entity`) + `entityId` on create/list. `contacts` accept an optional scope — omit both for global address-book entries (absorbed from DMS); `entities` and `unitsOfMeasure` are tenant-level — no scope pair. Bank details are inline fields on the payment method (`accountHolderName`/`accountNumber`/`bankName`/`branchName`/`accountType`/`chequeSeries`; card data masked-only) — there is no `master_bank_account` table. `settings` is the tenant settings KV: keys under the `org.` prefix (`org.id`, `org.branding`, `org.logo`) are tenant-wide rows (`user_id` null); every other key is scoped to the acting user (absorbed the workspace `workspace_setting` surface). Workflows are one file per action under `workflows/<entity>/<verb>.ts`; reusable fetch steps and business-rule steps live in `workflow-steps/`.

## Cross-context integration

- **Compliance** subscribes to `masters.contact_created` and creates an `insurance_policy` compliance document when `contact.type === "insurer"` and `entityType === "organization"` (organization-scoped only; global contacts are ignored — replaces the old `organization.connection_created` subscription).
- **DMS** subscribes to `masters.contact_removed` (contact-share bridge) and revokes every DMS share granted to the removed contact, invalidating contact `shareToken`s.
- **Notes** (removal): the note concept moved to `@aspen-os/notes` — scoped annotation notes migrate with `scopeType = masters:<entityType>`.
- **Accounting / Inventory** (future, stubs) are the intended consumers of `paymentMethod` / `unitOfMeasure`.
- **Filter views** now live in `@aspen-os/workspace` (`p.workspace.filterViews`, `workspace_filter_view`) — the single saved-filter store for all domains.

## Language

- Contact, Address, Connection (integration), Entity, Payment Method (inline bank details), Unit of Measure, `(entityType, entityId)` scope, `(entityType, entityId, direction)` primary scope, `credentialRef`, rotateCredential, base unit, conversionFactor, UOM status (`draft`/`published`/`inactive`), category default, system unit, indivisible unit, alias, version, `convert`/`publish`/`retire`/`seed`/`setDefault`, `SESSION` category, Label (scope-keyed, `apply`/`remove`), OrgBranch (`org_branch`, `tree`), Setting (`org.*` tenant-wide, other keys per-user)
- Avoid: Connection for business relationships (that is now a `Contact` with a `CONTACT_TYPE`); Vendors/Clients/Insurers as entities (they are `Contact` values); PAN/CVV or full card numbers for payment methods (masked `cardLast4` only); "UOM sets per owner" (units of measure are tenant-wide); Notes (that is now `@aspen-os/notes`); Filter View (now `@aspen-os/workspace`); Saved View / File View (those are now `Filter View` in workspace)
