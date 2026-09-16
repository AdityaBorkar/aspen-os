# Masters Domain Model

> Package: `@aspen-os/masters`. Polymorphic tenant master data — contacts, addresses, integration connections, entities, payment methods (inline bank details, no `bank_account` table), labels, org branches — plus tenant-wide units of measure (alias + version history) and tenant settings KV. 12 tables, all tenant schemas (`master_` prefix except `org_branch`). Contacts absorbed DMS address book; may be global (owner-less). Settings absorbed workspace `workspace_setting` surface + organization profile (`org.*` tenant-wide keys). Filter views live in `@aspen-os/workspace` (not here).

## Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MASTERS DOMAIN                                 │
│                                                                             │
│  Polymorphic scope: (entityType, entityId)                                  │
│  entityType ∈ { organization, branch, connection, contact, entity }         │
│                                                                             │
│  ┌────────────────┐     ┌────────────────┐                                  │
│  │  MasterContact │     │  MasterAddress │                                  │
│  │  id            │     │  id            │                                  │
│  │  name (+first/ │     │  label         │                                  │
│  │    last split) │     │  line1, line2  │                                  │
│  │  email, phone  │     │  city, state   │                                  │
│  │  title, company│     │  postalCode    │                                  │
│  │  type          │     │  country       │                                  │
│  │  linkedUserId  │     │  isPrimary     │                                  │
│  │  createdBy     │     │  entityType    │                                  │
│  │  isRemoved +   │     │  entityId      │                                  │
│  │    reason/at   │     │  metadata      │                                  │
│  │  entityType?   │     └────────────────┘                                  │
│  │  entityId?     │                                                        │
│  │  metadata      │                                                        │
│  └────────────────┘                                                        │
│                                                                             │
│  ┌────────────────┐     ┌─────────────────────┐                            │
│  │MasterConnection│     │   MasterEntity      │                            │
│  │  id            │     │  id                 │                            │
│  │  name          │     │  name, code (uniq)  │                            │
│  │  type          │     │  type (ENTITY_TYPE) │                            │
│  │  status        │     │  status             │                            │
│  │  baseUrl       │     │  industry, website  │                            │
│  │  description   │     │  phone, email       │                            │
│  │  credentialRef │     │  taxId              │                            │
│  │  lastTestedAt  │     │  registrationNumber │                            │
│  │  lastUsedAt    │     │  foundedDate        │                            │
│  │  entityType    │     │  timezone, locale   │                            │
│  │  entityId      │     │  organizationId (FK)│                            │
│  │  metadata      │     │  metadata           │                            │
│  └────────────────┘     └─────────────────────┘                            │
│       credentialRef →                                                      │
│       kvStore secret                                                       │
│       (encrypted)                                                          │
│                                                                             │
│  ┌─────────────────────┐     ┌────────────────────────────────────────┐     │
│  │ MasterPaymentMethod │     │       MasterUnitOfMeasure              │     │
│  │  id                 │     │  id, name, code (uniq CI)              │     │
│  │  type (bank_account │     │  category (UOM_CATEGORY+session)       │     │
│  │    /card/upi/imps/  │     │  symbol (uniq CI), decimalPlaces       │     │
│  │    cheque)          │     │  isBaseUnit (one per category)         │     │
│  │  name, code         │     │  baseUnitId (self-FK, same category)   │     │
│  │  direction          │     │  conversionFactor (to base unit)       │     │
│  │  status, isActive   │     │  status (draft/published/inactive)     │     │
│  │  isPrimary (per     │     │  isDefault (one per category)          │     │
│  │    (entityType,     │     │  isSystem (governed), isIndivisible    │     │
│  │     entityId,       │     │  isActive, metadata                    │     │
│  │     direction))     │     │  NO entityType/entityId (tenant-wide)  │     │
│  │  cardBrand/last4/   │     │  aliases → master_uom_alias (uniq)     │     │
│  │    expiry (masked)  │     │  versions → master_uom_version         │     │
│  │    expiry (masked)  │     └────────────────────────────────────────┘     │
│  │  upiId, chequeSeries│  ┌─────────────────────┐  ┌──────────────────┐      │
│  │  bank inline fields │  │ MasterLabel + join  │  │ OrgBranch +      │      │
│  │  (holder/acct/bank) │  │ label (scope-keyed) │  │ Setting (org.* / │      │
│  │  entityType/entityId│  │ entity_label (uniq) │  │  per-user keys)  │      │
│  └─────────────────────┘  └─────────────────────┘  └──────────────────┘      │
│                           MasterUnitOfMeasure.baseUnitId →                    │
│                             MasterUnitOfMeasure (self, same category)         │
│                           MasterEntity.organizationId → organization          │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Aggregates

### Contact (Aggregate Root)

**Identity**: `id` (text, UUID, generated by the `uuidv7` column type)

**Invariants**: `type` is a `CONTACT_TYPE` value (defaults to `other`); primary contact is unique per `(entityType, entityId)`. Contacts may be owner-scoped (`entityType` + `entityId`) or global (both null — the DMS address-book entries). `name` may be omitted when both `firstName` and `lastName` are given (derived). DMS mapping: `companyName` → `company`, `designation` → `title`. Removed contacts stay as soft-deleted rows (`isRemoved`, `deletionReason`, `removedAt`) hidden from `list` by default.

**Lifecycle commands**: `create(input)`, `update(id, patch)`, `delete(id)` (hard), `remove(id, { reason })` (soft, revokes DMS shares via `masters.contact_removed`), `setPrimary(id)`, `list(entityType?, entityId?, filters?)`.

### Address (Aggregate Root)

**Identity**: `id` (text, UUID, generated by the `uuidv7` column type)

**Invariants**: `country` is an ISO 3166-1 alpha-2 code; primary address is unique per `(entityType, entityId)`.

**Lifecycle commands**: `create(input)`, `update(id, patch)`, `delete(id)`, `setPrimary(id)`, `list(entityType, entityId, filters?)`.

### Connection (Aggregate Root)

**Identity**: `id` (text, UUID, generated by the `uuidv7` column type)

**Invariants**:

- `type` is an `INTEGRATION_TYPE` value (`api_key`/`oauth2`/`webhook`/`basic_auth`/`database`/`other`).
- `status` is a `CONNECTION_STATUS` value (`active`/`inactive`/`expired`/`revoked`).
- **No plaintext credentials in the DB** — `credentialRef` references an encrypted secret in the platform `kvStore`.
- Rotation writes a new kvStore secret and bumps `credentialRef` (deleting the old secret).

**Lifecycle commands**: `create(input)`, `update(id, patch)`, `delete(id)`, `activate(id)` / `deactivate(id)`, `test(id)`, `rotateCredential(id, credential)`, `list(entityType, entityId, filters?)`.

**Design note**: The old business-relationship `connection` model (vendors/clients/insurers with embedded contact fields) is removed. Business relationships are `Contact` records; `Connection` now models integration connections to external APIs/entities.

### Entity (Aggregate Root, Owner)

**Identity**: `id` (text, UUID, generated by the `uuidv7` column type)

**Invariants**:

- `type` is an `ENTITY_TYPE` value (`customer`/`vendor`/`partner`/`hospital`/`clinic`/`laboratory`/`pharmacy`/`insurer`/`regulator`/`bank`/`staffing_agency`/`training_institute`/`government`/`other`).
- `status` is an `ENTITY_STATUS` value (`active`/`inactive`/`archived`) with transitions `active` ↔ `inactive`, and both → `archived` (terminal).
- `code`, when set, is unique per tenant.
- A tenant-level **owner**: it becomes a `master_entity_type` value (`entity`) so existing masters (contact/address/payment_method) can scope to it. The optional `organizationId` links it to an `organization` profile row.

**Lifecycle commands**: `create(input)`, `update(id, patch)`, `delete(id)`, `setStatus(id, status)`, `list(filters?)`.

### Payment Method (Aggregate Root)

**Identity**: `id` (text, UUID, generated by the `uuidv7` column type)

**Invariants**:

- `type` is a `PAYMENT_METHOD_TYPE` value (`bank_account`/`card`/`upi`/`imps`/`cheque`); `direction` is `inbound`/`outbound`/`both`; `status` is `active`/`inactive`/`archived`.
- **Type-specific inline fields**: `card` carries `cardBrand`/`cardLast4`/`cardExpiryMonth`/`cardExpiryYear`; `upi` carries `upiId`; bank-backed methods carry `accountHolderName`/`accountNumber`/`bankName`/`branchName`/`accountType`/`chequeSeries` inline — there is no `master_bank_account` table.
- **Masked card data only** — brand/last-4/expiry; no PAN, no CVV, no full card numbers (secrets policy applies to payment credentials too).
- **One primary per `(entityType, entityId, direction)`** — `setPrimary` unsets overlapping scopes (a `both` method claims both inbound and outbound).

**Lifecycle commands**: `create(input)`, `update(id, patch)`, `delete(id)`, `setPrimary(id)`, `activate(id)` / `deactivate(id)`, `list(entityType, entityId, filters?)`.

### Unit of Measure (Aggregate Root, tenant-wide)

**Identity**: `id` (text, UUID, generated by the `uuidv7` column type)

**Invariants**:

- `code` unique per tenant (case-insensitive); `name`/`symbol` also unique case-insensitive; `symbol` colliding with another unit's alias rejected. `category` is `UOM_CATEGORY` value (`length`/`mass`/`volume`/`count`/`time`/`area`/`temperature`/`data`/`session`/`other`).
- **Exactly one base unit per category** — a base unit has `baseUnitId = null` and `conversionFactor = null`; a new base unit is rejected while another exists in the category (the existing base must first be demoted).
- **Derived units reference the base unit of their own category** with a `conversionFactor > 0`; the referenced base must not be the unit itself.
- A UOM referenced as another's `baseUnitId` cannot be deleted.
- **Status lifecycle `draft`, `published`, `inactive`** — `publish` requires `symbol`, active flag, and (for derived) existing category base + `baseUnitId` + factor; `retire` sets `inactive` + `is_active false` and closes open versions. Retiring blocks system units, category defaults, already-inactive rows.
- **One default per category** — `setDefault` requires active published unit (or base) and clears previous default via `assignCategoryDefault`; retired units can never be default.
- **System units are governed** — `is_system` rows (from `seed`) reject structural edits (category/base/factor/code/symbol/default); only precision, active flag, name, metadata editable.
- **Indivisible units take whole quantities only** — `convert` throws when either side would split (`is_indivisible` + non-integer); math is `base = qty × fromFactor`, `converted = roundHalfUp(base ÷ toFactor, toPrecision)` (`utils/uom-math.ts`).
- **Conversion same-category, active-only** — cross-category conversion forbidden; retired/inactive units convert never.
- **Renaming published unit preserves old code as alias** — `master_uom_alias` row (`alias` unique); factor/precision changes append `master_uom_version` row (`effective_from` date, `reason`, supersedes open versions).
- Not owner-scoped — tenant-wide reference data.

**Lifecycle commands**: `create(input)`, `update(id, patch)`, `delete(id)`, `get(id)`, `list(filters?)`, `convert({ fromUomId, toUomId?, quantity })`, `publish(id)`, `retire(id, { reason? })`, `setDefault(id)`, `seed()` (idempotent system-unit bootstrap + per-row versions + defaults), `versions(id)` (desc by `effective_from`, limit 100).

### Label (Aggregate Root, scope-keyed)

**Identity**: `id` (text, UUID, generated by the `uuidv7` column type)

**Invariants**:

- Optional `(scopeType, scopeId)` pair; null pair = global label. Name unique per scope via `uq_master_label_scope_name` nulls-not-distinct.
- Application is a `master_entity_label` join row unique per `(entityType, entityId, labelId)`; `apply`/`remove` idempotent at the join level.

**Lifecycle commands**: `create(input)`, `get(id)`, `update(id, patch)`, `delete(id)`, `apply({ labelId, entityType, entityId })`, `remove({ labelId, entityType, entityId })`, `list(filters?)`, `listByLabel(labelId)`.

### Org Branch (Aggregate Root)

**Identity**: `id` (text, UUID, generated by the `uuidv7` column type)

**Invariants**:

- `code` unique per tenant; `type` is `ORG_BRANCH_TYPE` (`headquarters`/`office`/`warehouse`/`store`/`factory`/`remote`/`other`); optional `parent_org_branch` soft FK forms tree (max depth enforced in workflow).
- Lives in masters as `org_branch` (no `master_` prefix) — organization module's former branch surface.

**Lifecycle commands**: `create(input)`, `get(id)`, `update(id, patch)`, `list(filters?)`, `tree()`.

### Setting (Aggregate Root, key-scoped)

**Identity**: `(key, user_id)` — unique per scope; `user_id` null means tenant-wide.

**Invariants**:

- Keys under the `org.` prefix are tenant-wide (`org.id`, `org.branding`, `org.logo`); every other key is scoped to the acting user (`user_id = actorId`, authentication required).
- Well-known `org.*` keys get shape validation (`org.id`/`org.logo` are strings, `org.branding` is `{ accentColor?, name? }`); all other keys store any JSON value.

**Lifecycle commands**: `get(key)`, `set(key, value)` (upsert, audit-logged).

## Domain Events — 32

| Event                                               | Payload                                                                | Trigger                                                 |
| --------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------- |
| `masters.contact_created`                           | `{ contact: { id, name, type }, entityType }`                          | Contact created                                         |
| `masters.contact_updated`                           | `{ contact: { id, name }, changes, entityType }`                       | Contact updated                                         |
| `masters.contact_removed`                           | `{ contactId, entityId, entityType, reason }`                          | Contact soft-removed (`remove`); DMS revokes its shares |
| `masters.address_created`                           | `{ address: { id, country, label }, entityId, entityType }`            | Address created                                         |
| `masters.address_updated`                           | `{ address: { id }, changes, entityId, entityType }`                   | Address updated                                         |
| `masters.address_removed`                           | `{ addressId, entityId, entityType }`                                  | Address removed                                         |
| `masters.connection_created`                        | `{ connection: { id, name, type }, entityId, entityType }`             | Connection created                                      |
| `masters.connection_updated`                        | `{ connection: { id, name }, changes, entityId, entityType }`          | Connection updated                                      |
| `masters.connection_status_changed`                 | `{ connectionId, fromStatus, toStatus }`                               | Connection status changed                               |
| `masters.connection_credential_rotated`             | `{ connectionId }`                                                     | Connection credential rotated                           |
| `masters.connection_removed`                        | `{ connectionId, entityId, entityType }`                               | Connection removed                                      |
| `masters.entity_created` / `_removed`               | `{ entity: { id, name, type } }`                                       | Entity created / removed                                |
| `masters.entity_updated`                            | `{ entity: { id, name, type }, changes }`                              | Entity updated                                          |
| `masters.unit_of_measure_created` / `_removed`      | `{ unitOfMeasure: { id, code, category } }`                            | UOM created / removed                                   |
| `masters.unit_of_measure_updated`                   | `{ unitOfMeasure: { id, code, category }, changes }`                   | UOM updated (incl. `publish` → `{ status: published }`) |
| `masters.unit_of_measure_retired`                   | `{ unitOfMeasure: { id, code, category }, reason }`                    | UOM retired (`retire`)                                  |
| `masters.unit_of_measure_default_set`               | `{ unitOfMeasure: { id, code, category }, previousDefaultId }`         | UOM category default reassigned                         |
| `masters.payment_method_created` / `_removed`       | `{ paymentMethod: { id, name, type }, entityType, entityId }`          | Payment method created / removed                        |
| `masters.payment_method_updated`                    | `{ paymentMethod: { id, name, type }, entityType, entityId, changes }` | Payment method updated                                  |
| `masters.payment_method_activated` / `_deactivated` | `{ paymentMethodId, entityType, entityId }`                            | Payment method activated / deactivated                  |
| `masters.payment_method_primary_set`                | `{ paymentMethodId, entityType, entityId, direction }`                 | Payment method primary set                              |
| `masters.label_created`                             | `{ label: { id, name, color, scopeType, scopeId } }`                   | Label created                                           |
| `masters.label_updated`                             | `{ label: { id, name }, changes }`                                     | Label updated                                           |
| `masters.label_removed`                             | `{ labelId }`                                                          | Label deleted                                           |
| `masters.label_applied` / `_removed_from_entity`    | `{ labelId, entityType, entityId }`                                    | Label applied / unapplied                               |
| `masters.org_branch_created`                        | `{ orgBranch: { id, name, code, type } }`                              | Org branch created                                      |
| `masters.org_branch_updated`                        | `{ orgBranch: { id, name }, changes }`                                 | Org branch updated                                      |

## Command-Query Separation

### Commands (Write Side)

| Context         | Command                | Method                                                             |
| --------------- | ---------------------- | ------------------------------------------------------------------ |
| Contact         | Create contact         | `p.masters.contacts.create()`                                      |
| Contact         | Remove contact         | `p.masters.contacts.remove()` (soft, reason; revokes DMS shares)   |
| Contact         | Set primary            | `p.masters.contacts.setPrimary()`                                  |
| Address         | Create address         | `p.masters.addresses.create()`                                     |
| Connection      | Create connection      | `p.masters.connections.create()`                                   |
| Connection      | Test endpoint          | `p.masters.connections.test()`                                     |
| Connection      | Rotate credential      | `p.masters.connections.rotateCredential()`                         |
| Entity          | Create entity          | `p.masters.entities.create()`                                      |
| Entity          | Set status             | `p.masters.entities.setStatus()`                                   |
| Payment Method  | Create payment method  | `p.masters.paymentMethods.create()`                                |
| Payment Method  | Set primary            | `p.masters.paymentMethods.setPrimary()`                            |
| Unit of Measure | Create unit of measure | `p.masters.unitsOfMeasure.create()`                                |
| Unit of Measure | Publish unit           | `p.masters.unitsOfMeasure.publish()` (draft → published)           |
| Unit of Measure | Retire unit            | `p.masters.unitsOfMeasure.retire()` (→ inactive)                   |
| Unit of Measure | Set category default   | `p.masters.unitsOfMeasure.setDefault()`                            |
| Unit of Measure | Convert quantity       | `p.masters.unitsOfMeasure.convert()` (read-only math)              |
| Unit of Measure | Seed system units      | `p.masters.unitsOfMeasure.seed()`                                  |
| Label           | Create / apply label   | `p.masters.labels.create()` / `apply()`                            |
| Org Branch      | Create branch          | `p.masters.orgBranches.create()`                                   |
| Setting         | Get setting            | `p.masters.settings.get(key)` (`org.*` tenant-wide, else per-user) |
| Setting         | Set setting            | `p.masters.settings.set(key, value)` (upsert, audit-logged)        |

### Queries (Read Side)

| Context         | Query                 | Method                                                                                                                |
| --------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Contact         | List contacts         | `p.masters.contacts.list(entityType?, entityId?, filters?)` (omit scope for global search; removed hidden by default) |
| Address         | List addresses        | `p.masters.addresses.list(entityType, entityId, filters?)`                                                            |
| Connection      | List connections      | `p.masters.connections.list(entityType, entityId, filters?)`                                                          |
| Entity          | List entities         | `p.masters.entities.list(filters?)`                                                                                   |
| Payment Method  | List payment methods  | `p.masters.paymentMethods.list(entityType, entityId, filters?)`                                                       |
| Unit of Measure | List units of measure | `p.masters.unitsOfMeasure.list(filters?)`                                                                             |
| Unit of Measure | List versions         | `p.masters.unitsOfMeasure.versions(id)`                                                                               |
| Label           | List labels           | `p.masters.labels.list(filters?)` / `listByLabel(labelId)`                                                            |
| Org Branch      | List / tree branches  | `p.masters.orgBranches.list()` / `tree()`                                                                             |
| Setting         | Get setting           | `p.masters.settings.get(key)` (returns the value or null)                                                             |

## Invariants & Business Rules

1. **Polymorphic scoping** — polymorphic rows carry `entityType` (`master_entity_type`) + `entityId`; all list queries filter on the pair. Exception: contacts may be global (both null — the DMS address-book entries) and `contacts.list` accepts an omitted scope for tenant-wide search. `unitOfMeasure` is tenant-wide (no pair).
2. **One primary per scope** — `setPrimary` (payment methods) unsets the existing primary within the `(entityType, entityId, direction)` scope (a `both` method claims both scopes).
3. **No plaintext credentials** — `master_connection.credentialRef` points at an encrypted kvStore secret; `rotateCredential` replaces the secret and bumps the ref.
4. **Uppercase country codes** — `master_address.country` is stored as ISO 3166-1 alpha-2 uppercase.
5. **Entity status transitions** — `active` ↔ `inactive`, and both → `archived` (terminal).
6. **UOM base-unit invariant** — exactly one base unit per category; base units have `baseUnitId`/`conversionFactor` null; derived units reference the base of their own category with `conversionFactor > 0`; referenced-as-base units cannot be deleted.
7. **UOM lifecycle** — `draft`, `published`, `inactive`; one default per category; system units governed; indivisible units whole-quantity only; conversions same-category active-only; renames alias old code; factor changes version.
8. **Payment method type fields** — type-specific required fields validated on create/update; card data is masked-only.
9. **Contact soft-remove** — `remove` requires a reason, sets `is_removed`/`deletionReason`/`removedAt`, publishes `masters.contact_removed` (DMS revokes contact shares); `delete` is a hard delete.
10. **Labels are scope-keyed** — `(scopeType, scopeId)` null pair = global; name unique per scope; application is a join row unique per `(entityType, entityId, labelId)`.
11. **Settings scope is key-prefixed** — `org.*` keys are tenant-wide single rows (`user_id` null, unique per key via nulls-not-distinct); all other keys are unique per `(user_id, key)`. `set` upserts and audit-logs; there are no settings events.
