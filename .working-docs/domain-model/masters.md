# Masters Domain Model

> Package: `@aspen-os/masters`. Polymorphic tenant master data — contacts, addresses, bank accounts, integration connections, entities, payment methods — plus tenant-wide units of measure, the cross-domain filter view store, and the tenant settings KV. All 9 tables are tenant schemas (`master_` prefix). Contacts absorbed the DMS address book and may also be global (owner-less) entries. Filter views absorbed tasks saved views, DMS file views, and workspace views. Settings absorbed the workspace `workspace_setting` surface plus the organization profile (`org.*` tenant-wide keys).

## Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MASTERS DOMAIN                                 │
│                                                                             │
│  Polymorphic scope: (entityType, entityId)                                  │
│  entityType ∈ { organization, branch, connection, contact, entity }         │
│                                                                             │
│  ┌────────────────┐     ┌────────────────┐     ┌─────────────────────┐      │
│  │  MasterContact │     │  MasterAddress │     │  MasterBankAccount  │      │
│  │  id            │     │  id            │     │  id                 │      │
│  │  name (+first/ │     │  label         │     │  accountHolderName  │      │
│  │    last split) │     │  line1, line2  │     │  accountNumber      │      │
│  │  email, phone  │     │  city, state   │     │  bankName, branch   │      │
│  │  title, company│     │  postalCode    │     │  routingNumber      │      │
│  │  type          │     │  country       │     │  swiftCode          │      │
│  │  linkedUserId  │     │  isPrimary     │     │  currency           │      │
│  │  createdBy     │     │  entityType    │     │  isActive/isPrimary │      │
│  │  isRemoved +   │     │  entityId      │     │  entityType/entityId│      │
│  │    reason/at   │     │  metadata      │     │  metadata           │      │
│  │  entityType?   │     └────────────────┘     └─────────────────────┘      │
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
│  │ MasterPaymentMethod │     │       MasterUnitOfMeasure             │     │
│  │  id                 │     │  id, name, code (uniq)                │     │
│  │  type (bank_account │     │  category (UOM_CATEGORY)              │     │
│  │    /card/upi/imps/  │     │  symbol, decimalPlaces                │     │
│  │    cheque)          │     │  isBaseUnit (one per category)        │     │
│  │  name, code         │     │  baseUnitId (self-FK, same category)  │     │
│  │  direction          │     │  conversionFactor (to base unit)      │     │
│  │  status, isActive   │     │  isActive, metadata                   │     │
│  │  isPrimary (per     │     │  NO entityType/entityId (tenant-wide) │     │
│  │    (entityType,     │     └────────────────────────────────────────┘     │
│  │     entityId,       │                                                 │
│  │     direction))     │                                                 │
│  │  bankAccountId (FK) │     MasterPaymentMethod.bankAccountId →         │
│  │  cardBrand/last4/   │       MasterBankAccount (logical)               │
│  │    expiry (masked)  │     MasterUnitOfMeasure.baseUnitId →            │
│  │  upiId, chequeSeries│       MasterUnitOfMeasure (self, same category) │
│  │  details, metadata  │     MasterEntity.organizationId → organization  │
│  │  entityType/entityId│                                                 │
│  └─────────────────────┘                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Aggregates

### Contact (Aggregate Root)

**Identity**: `id` (text, UUID, generated by the `uuidv7` column type)

**Invariants**: `type` is a `CONTACT_TYPE` value (defaults to `other`); primary contact is unique per `(entityType, entityId)`. Contacts may be owner-scoped (`entityType` + `entityId`) or global (both null — the DMS address-book entries). `name` may be omitted when both `firstName` and `lastName` are given (derived). DMS mapping: `companyName` → `company`, `designation` → `title`. Removed contacts stay as soft-deleted rows (`isRemoved`, `deletionReason`, `removedAt`) hidden from `list` by default.

**Lifecycle commands**: `create(input)`, `update(id, patch)`, `delete(id)` (hard), `remove(id, { reason })` (soft, revokes DMS shares via `masters:contact_removed`), `setPrimary(id)`, `list(entityType?, entityId?, filters?)`.

### Address (Aggregate Root)

**Identity**: `id` (text, UUID, generated by the `uuidv7` column type)

**Invariants**: `country` is an ISO 3166-1 alpha-2 code; primary address is unique per `(entityType, entityId)`.

**Lifecycle commands**: `create(input)`, `update(id, patch)`, `delete(id)`, `setPrimary(id)`, `list(entityType, entityId, filters?)`.

### Bank Account (Aggregate Root)

**Identity**: `id` (text, UUID, generated by the `uuidv7` column type)

**Invariants**: primary and active flags are scoped per `(entityType, entityId)`.

**Lifecycle commands**: `create(input)`, `update(id, patch)`, `delete(id)`, `setPrimary(id)`, `activate(id)` / `deactivate(id)`, `list(entityType, entityId, filters?)`.

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
- A tenant-level **owner**: it becomes a `master_entity_type` value (`entity`) so existing masters (contact/address/bank_account/payment_method) can scope to it. The optional `organizationId` links it to an `organization` profile row.

**Lifecycle commands**: `create(input)`, `update(id, patch)`, `delete(id)`, `setStatus(id, status)`, `list(filters?)`.

### Payment Method (Aggregate Root)

**Identity**: `id` (text, UUID, generated by the `uuidv7` column type)

**Invariants**:

- `type` is a `PAYMENT_METHOD_TYPE` value (`bank_account`/`card`/`upi`/`imps`/`cheque`); `direction` is `inbound`/`outbound`/`both`; `status` is `active`/`inactive`/`archived`.
- **Type-specific fields**: `card` requires `cardBrand`/`cardLast4`/`cardExpiryMonth`/`cardExpiryYear`; `upi` requires `upiId`; `bank_account`/`imps`/`cheque` require `bankAccountId`.
- **Masked card data only** — brand/last-4/expiry; no PAN, no CVV, no full card numbers (secrets policy applies to payment credentials too).
- **One primary per `(entityType, entityId, direction)`** — `setPrimary` unsets overlapping scopes (a `both` method claims both inbound and outbound).
- `bankAccountId` is a logical FK to `master_bank_account` (no DB constraint).

**Lifecycle commands**: `create(input)`, `update(id, patch)`, `delete(id)`, `setPrimary(id)`, `activate(id)` / `deactivate(id)`, `list(entityType, entityId, filters?)`.

### Unit of Measure (Aggregate Root, tenant-wide)

**Identity**: `id` (text, UUID, generated by the `uuidv7` column type)

**Invariants**:

- `code` is unique per tenant; `category` is a `UOM_CATEGORY` value (`length`/`mass`/`volume`/`count`/`time`/`area`/`temperature`/`data`/`other`).
- **Exactly one base unit per category** — a base unit has `baseUnitId = null` and `conversionFactor = null`; a new base unit is rejected while another exists in the category (the existing base must first be demoted).
- **Derived units reference the base unit of their own category** with a `conversionFactor > 0`; the referenced base must not be the unit itself.
- A UOM referenced as another's `baseUnitId` cannot be deleted.
- Not owner-scoped — tenant-wide reference data.

**Lifecycle commands**: `create(input)`, `update(id, patch)`, `delete(id)`, `activate(id)` / `deactivate(id)`, `list(filters?)`.

### Filter View (Aggregate Root)

**Identity**: `id` (text, UUID, generated by the `uuidv7` column type)

**Invariants**:

- `domain` is free-form `<module>:<entity>` text (`tasks:task`, `dms:file`, `notes:note`, `hr:employee`, `compliance:document`, `workspace:draft`, or app-defined) — never a FK; the module never queries other modules' tables.
- `conditions`/`sort` are typed `{ field, operator, value? }[]` / `{ field, direction }[]` jsonb (default `[]`).
- `viewType` is `list`/`board`/`calendar`/`timeline` (defaults to `list` — preserves tasks board layouts); `projectId` preserves tasks project scoping (`null` for other domains).
- `access` is user-set `personal` (owner-only) / `global` (org-wide within the tenant); `list` enforces `global OR owner` at SQL level, reads enforce `assertCanAccess`, mutations enforce owner-or-tenant-admin.
- **One default per `(ownerId, domain, projectId)`** — `create`/`update`/`setDefault` with `isDefault` unset the overlapping default first (null-`projectId` aware).
- Storage-only — no `apply`, no resolver registry; hosts read the stored conditions and query their own tables.

**Lifecycle commands**: `create(input)`, `get(id)`, `update(id, input)`, `delete(id)`, `duplicate(id)` (personal copy under the caller), `setDefault(id)`, `getDefault(ownerId, domain?, projectId?)`, `list(filters?)`.

### Setting (Aggregate Root, key-scoped)

**Identity**: `(key, user_id)` — unique per scope; `user_id` null means tenant-wide.

**Invariants**:

- Keys under the `org.` prefix are tenant-wide (`org.id`, `org.branding`, `org.logo`); every other key is scoped to the acting user (`user_id = actorId`, authentication required).
- Well-known `org.*` keys get shape validation (`org.id`/`org.logo` are strings, `org.branding` is `{ accentColor?, name? }`); all other keys store any JSON value.

**Lifecycle commands**: `get(key)`, `set(key, value)` (upsert, audit-logged).

## Domain Events — 27

| Event                                                | Payload                                                                | Trigger                                                 |
| ---------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------- |
| `masters:contact_created`                            | `{ contact: { id, name, type }, entityType }`                          | Contact created                                         |
| `masters:contact_updated`                            | `{ contact: { id, name }, changes, entityType }`                       | Contact updated                                         |
| `masters:contact_removed`                            | `{ contactId, entityId, entityType, reason }`                          | Contact soft-removed (`remove`); DMS revokes its shares |
| `masters:address_created`                            | `{ address: { id, country, label }, entityId, entityType }`            | Address created                                         |
| `masters:address_updated`                            | `{ address: { id }, changes, entityId, entityType }`                   | Address updated                                         |
| `masters:address_removed`                            | `{ addressId, entityId, entityType }`                                  | Address removed                                         |
| `masters:bank_account_created`                       | `{ bankAccount: { id, bankName, currency }, entityId, entityType }`    | Bank account created                                    |
| `masters:bank_account_updated`                       | `{ bankAccount: { id }, changes, entityId, entityType }`               | Bank account updated                                    |
| `masters:bank_account_activated`                     | `{ bankAccountId }`                                                    | Bank account activated                                  |
| `masters:bank_account_deactivated`                   | `{ bankAccountId }`                                                    | Bank account deactivated                                |
| `masters:connection_created`                         | `{ connection: { id, name, type }, entityId, entityType }`             | Connection created                                      |
| `masters:connection_updated`                         | `{ connection: { id, name }, changes, entityId, entityType }`          | Connection updated                                      |
| `masters:connection_status_changed`                  | `{ connectionId, fromStatus, toStatus }`                               | Connection status changed                               |
| `masters:connection_credential_rotated`              | `{ connectionId }`                                                     | Connection credential rotated                           |
| `masters:connection_removed`                         | `{ connectionId, entityId, entityType }`                               | Connection removed                                      |
| `masters:entity_created` / `_removed`                | `{ entity: { id, name, type } }`                                       | Entity created / removed                                |
| `masters:entity_updated`                             | `{ entity: { id, name, type }, changes }`                              | Entity updated                                          |
| `masters:unit_of_measure_created` / `_removed`       | `{ unitOfMeasure: { id, code, category } }`                            | UOM created / removed                                   |
| `masters:unit_of_measure_updated`                    | `{ unitOfMeasure: { id, code, category }, changes }`                   | UOM updated                                             |
| `masters:unit_of_measure_activated` / `_deactivated` | `{ unitOfMeasureId }`                                                  | UOM activated / deactivated                             |
| `masters:payment_method_created` / `_removed`        | `{ paymentMethod: { id, name, type }, entityType, entityId }`          | Payment method created / removed                        |
| `masters:payment_method_updated`                     | `{ paymentMethod: { id, name, type }, entityType, entityId, changes }` | Payment method updated                                  |
| `masters:payment_method_activated` / `_deactivated`  | `{ paymentMethodId, entityType, entityId }`                            | Payment method activated / deactivated                  |
| `masters:payment_method_primary_set`                 | `{ paymentMethodId, entityType, entityId, direction }`                 | Payment method primary set                              |
| `masters:filter_view_created`                        | `{ filterViewId, access, domain, ownerId }`                            | Filter view created                                     |
| `masters:filter_view_updated`                        | `{ filterViewId }`                                                     | Filter view updated / default set                       |
| `masters:filter_view_duplicated`                     | `{ filterViewId, duplicateId }`                                        | Filter view duplicated                                  |
| `masters:filter_view_deleted`                        | `{ filterViewId }`                                                     | Filter view deleted                                     |

## Command-Query Separation

### Commands (Write Side)

| Context         | Command                | Method                                                             |
| --------------- | ---------------------- | ------------------------------------------------------------------ |
| Contact         | Create contact         | `p.masters.contacts.create()`                                      |
| Contact         | Remove contact         | `p.masters.contacts.remove()` (soft, reason; revokes DMS shares)   |
| Contact         | Set primary            | `p.masters.contacts.setPrimary()`                                  |
| Address         | Create address         | `p.masters.addresses.create()`                                     |
| Bank Account    | Create account         | `p.masters.bankAccounts.create()`                                  |
| Connection      | Create connection      | `p.masters.connections.create()`                                   |
| Connection      | Test endpoint          | `p.masters.connections.test()`                                     |
| Connection      | Rotate credential      | `p.masters.connections.rotateCredential()`                         |
| Entity          | Create entity          | `p.masters.entities.create()`                                      |
| Entity          | Set status             | `p.masters.entities.setStatus()`                                   |
| Payment Method  | Create payment method  | `p.masters.paymentMethods.create()`                                |
| Payment Method  | Set primary            | `p.masters.paymentMethods.setPrimary()`                            |
| Unit of Measure | Create unit of measure | `p.masters.unitsOfMeasure.create()`                                |
| Unit of Measure | Activate / deactivate  | `p.masters.unitsOfMeasure.activate()/deactivate()`                 |
| Filter View     | Create filter view     | `p.masters.filterViews.create()`                                   |
| Filter View     | Duplicate filter view  | `p.masters.filterViews.duplicate()` (personal copy)                |
| Filter View     | Set default view       | `p.masters.filterViews.setDefault()`                               |
| Setting         | Get setting            | `p.masters.settings.get(key)` (`org.*` tenant-wide, else per-user) |
| Setting         | Set setting            | `p.masters.settings.set(key, value)` (upsert, audit-logged)        |

### Queries (Read Side)

| Context         | Query                 | Method                                                                                                                |
| --------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Contact         | List contacts         | `p.masters.contacts.list(entityType?, entityId?, filters?)` (omit scope for global search; removed hidden by default) |
| Address         | List addresses        | `p.masters.addresses.list(entityType, entityId, filters?)`                                                            |
| Bank Account    | List accounts         | `p.masters.bankAccounts.list(entityType, entityId, filters?)`                                                         |
| Connection      | List connections      | `p.masters.connections.list(entityType, entityId, filters?)`                                                          |
| Entity          | List entities         | `p.masters.entities.list(filters?)`                                                                                   |
| Payment Method  | List payment methods  | `p.masters.paymentMethods.list(entityType, entityId, filters?)`                                                       |
| Unit of Measure | List units of measure | `p.masters.unitsOfMeasure.list(filters?)`                                                                             |
| Filter View     | Get filter view       | `p.masters.filterViews.get(id)` (access-checked)                                                                      |
| Filter View     | List filter views     | `p.masters.filterViews.list(filters?)` (`global OR owner` at SQL level)                                               |
| Filter View     | Get default view      | `p.masters.filterViews.getDefault(ownerId, domain?, projectId?)`                                                      |
| Setting         | Get setting           | `p.masters.settings.get(key)` (returns the value or null)                                                             |

## Invariants & Business Rules

1. **Polymorphic scoping** — polymorphic rows carry `entityType` (`master_entity_type`) + `entityId`; all list queries filter on the pair. Exception: contacts may be global (both null — the DMS address-book entries) and `contacts.list` accepts an omitted scope for tenant-wide search. `unitOfMeasure` is tenant-wide (no pair).
2. **One primary per scope** — `setPrimary` (contacts/addresses/bankAccounts) unsets the existing primary within the `(entityType, entityId)` scope; payment methods scope additionally by `direction` (a `both` method claims both scopes).
3. **No plaintext credentials** — `master_connection.credentialRef` points at an encrypted kvStore secret; `rotateCredential` replaces the secret and bumps the ref.
4. **Uppercase country codes** — `master_address.country` is stored as ISO 3166-1 alpha-2 uppercase.
5. **Entity status transitions** — `active` ↔ `inactive`, and both → `archived` (terminal).
6. **UOM base-unit invariant** — exactly one base unit per category; base units have `baseUnitId`/`conversionFactor` null; derived units reference the base of their own category with `conversionFactor > 0`; referenced-as-base units cannot be deleted.
7. **Payment method type fields** — type-specific required fields validated on create/update; card data is masked-only.
8. **Contact soft-remove** — `remove` requires a reason, sets `is_removed`/`deletionReason`/`removedAt`, publishes `masters:contact_removed` (DMS revokes contact shares); `delete` is a hard delete.
9. **Filter view defaults** — one default per `(ownerId, domain, projectId)`; `projectId` is null outside tasks scoping. Access is user-set (`personal`/`global`); only the owner or a tenant admin may mutate.
10. **Settings scope is key-prefixed** — `org.*` keys are tenant-wide single rows (`user_id` null, unique per key via nulls-not-distinct); all other keys are unique per `(user_id, key)`. `set` upserts and audit-logs; there are no settings events.
