# Masters Domain Model

> Package: `@aspen-os/masters`. Polymorphic tenant master data — contacts, addresses, bank accounts, integration connections, notes, entities, payment methods — plus tenant-wide units of measure. All 8 tables are tenant schemas (`master_` prefix).

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
│  │  name          │     │  label         │     │  accountHolderName  │      │
│  │  email, phone  │     │  line1, line2  │     │  accountNumber      │      │
│  │  title, company│     │  city, state   │     │  bankName, branch   │      │
│  │  type          │     │  postalCode    │     │  routingNumber      │      │
│  │  isPrimary     │     │  country       │     │  swiftCode          │      │
│  │  entityType    │     │  isPrimary     │     │  currency           │      │
│  │  entityId      │     │  entityType    │     │  isActive/isPrimary │      │
│  │  metadata      │     │  entityId      │     │  entityType/entityId│      │
│  └────────────────┘     │  metadata      │     │  metadata           │      │
│                         └────────────────┘     └─────────────────────┘      │
│                                                                             │
│  ┌────────────────┐     ┌────────────────┐     ┌─────────────────────┐      │
│  │MasterConnection│     │   MasterNote   │     │   MasterEntity      │      │
│  │  id            │     │  id            │     │  id                 │      │
│  │  name          │     │  content       │     │  name, code (uniq)  │      │
│  │  type          │     │  type          │     │  type (ENTITY_TYPE) │      │
│  │  status        │     │  userId        │     │  status             │      │
│  │  baseUrl       │     │  entityType    │     │  industry, website  │      │
│  │  description   │     │  entityId      │     │  phone, email       │      │
│  │  credentialRef │     └────────────────┘     │  taxId              │      │
│  │  lastTestedAt  │                            │  registrationNumber │      │
│  │  lastUsedAt    │     credentialRef →        │  foundedDate        │      │
│  │  entityType    │     kvStore secret         │  timezone, locale   │      │
│  │  entityId      │     (encrypted)            │  organizationId (FK)│      │
│  │  metadata      │                            │  metadata           │      │
│  └────────────────┘                            └─────────────────────┘      │
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

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)`)

**Invariants**: `type` is a `CONTACT_TYPE` value; primary contact is unique per `(entityType, entityId)`.

**Lifecycle commands**: `create(input)`, `update(id, patch)`, `delete(id)`, `setPrimary(id)`, `list(entityType, entityId, filters?)`.

### Address (Aggregate Root)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)`)

**Invariants**: `country` is an ISO 3166-1 alpha-2 code; primary address is unique per `(entityType, entityId)`.

**Lifecycle commands**: `create(input)`, `update(id, patch)`, `delete(id)`, `setPrimary(id)`, `list(entityType, entityId, filters?)`.

### Bank Account (Aggregate Root)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)`)

**Invariants**: primary and active flags are scoped per `(entityType, entityId)`.

**Lifecycle commands**: `create(input)`, `update(id, patch)`, `delete(id)`, `setPrimary(id)`, `activate(id)` / `deactivate(id)`, `list(entityType, entityId, filters?)`.

### Connection (Aggregate Root)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)`)

**Invariants**:

- `type` is an `INTEGRATION_TYPE` value (`api_key`/`oauth2`/`webhook`/`basic_auth`/`database`/`other`).
- `status` is a `CONNECTION_STATUS` value (`active`/`inactive`/`expired`/`revoked`).
- **No plaintext credentials in the DB** — `credentialRef` references an encrypted secret in the platform `kvStore`.
- Rotation writes a new kvStore secret and bumps `credentialRef` (deleting the old secret).

**Lifecycle commands**: `create(input)`, `update(id, patch)`, `delete(id)`, `activate(id)` / `deactivate(id)`, `test(id)`, `rotateCredential(id, credential)`, `list(entityType, entityId, filters?)`.

**Design note**: The old business-relationship `connection` model (vendors/clients/insurers with embedded contact fields) is removed. Business relationships are `Contact` records; `Connection` now models integration connections to external APIs/entities.

### Entity (Aggregate Root, Owner)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)`)

**Invariants**:

- `type` is an `ENTITY_TYPE` value (`customer`/`vendor`/`partner`/`hospital`/`clinic`/`laboratory`/`pharmacy`/`insurer`/`regulator`/`bank`/`staffing_agency`/`training_institute`/`government`/`other`).
- `status` is an `ENTITY_STATUS` value (`active`/`inactive`/`archived`) with transitions `active` ↔ `inactive`, and both → `archived` (terminal).
- `code`, when set, is unique per tenant.
- A tenant-level **owner**: it becomes a `master_entity_type` value (`entity`) so existing masters (contact/address/bank_account/note/payment_method) can scope to it. The optional `organizationId` links it to an `organization` profile row.

**Lifecycle commands**: `create(input)`, `update(id, patch)`, `delete(id)`, `setStatus(id, status)`, `list(filters?)`.

### Note (Aggregate Root)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)`)

**Lifecycle commands**: `add(input)`, `remove(id)`, `list(entityType, entityId, type?)`.

### Payment Method (Aggregate Root)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)`)

**Invariants**:

- `type` is a `PAYMENT_METHOD_TYPE` value (`bank_account`/`card`/`upi`/`imps`/`cheque`); `direction` is `inbound`/`outbound`/`both`; `status` is `active`/`inactive`/`archived`.
- **Type-specific fields**: `card` requires `cardBrand`/`cardLast4`/`cardExpiryMonth`/`cardExpiryYear`; `upi` requires `upiId`; `bank_account`/`imps`/`cheque` require `bankAccountId`.
- **Masked card data only** — brand/last-4/expiry; no PAN, no CVV, no full card numbers (secrets policy applies to payment credentials too).
- **One primary per `(entityType, entityId, direction)`** — `setPrimary` unsets overlapping scopes (a `both` method claims both inbound and outbound).
- `bankAccountId` is a logical FK to `master_bank_account` (no DB constraint).

**Lifecycle commands**: `create(input)`, `update(id, patch)`, `delete(id)`, `setPrimary(id)`, `activate(id)` / `deactivate(id)`, `list(entityType, entityId, filters?)`.

### Unit of Measure (Aggregate Root, tenant-wide)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)`)

**Invariants**:

- `code` is unique per tenant; `category` is a `UOM_CATEGORY` value (`length`/`mass`/`volume`/`count`/`time`/`area`/`temperature`/`data`/`other`).
- **Exactly one base unit per category** — a base unit has `baseUnitId = null` and `conversionFactor = null`; a new base unit is rejected while another exists in the category (the existing base must first be demoted).
- **Derived units reference the base unit of their own category** with a `conversionFactor > 0`; the referenced base must not be the unit itself.
- A UOM referenced as another's `baseUnitId` cannot be deleted.
- Not owner-scoped — tenant-wide reference data.

**Lifecycle commands**: `create(input)`, `update(id, patch)`, `delete(id)`, `activate(id)` / `deactivate(id)`, `list(filters?)`.

## Domain Events — 31

| Event                                                | Payload                                                                                      | Trigger                                |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------- |
| `masters:contact_created`                            | `{ contact: { id, name, type }, entityType }`                                                | Contact created                        |
| `masters:contact_updated`                            | `{ contact: { id, name }, changes, entityType }`                                             | Contact updated                        |
| `masters:contact_removed`                            | `{ contactId, entityId, entityType }`                                                        | Contact removed                        |
| `masters:address_created`                            | `{ address: { id, country, label }, entityId, entityType }`                                  | Address created                        |
| `masters:address_updated`                            | `{ address: { id }, changes, entityId, entityType }`                                         | Address updated                        |
| `masters:address_removed`                            | `{ addressId }`                                                                              | Address removed                        |
| `masters:bank_account_created`                       | `{ bankAccount: { id, bankName, currency }, entityId, entityType }`                          | Bank account created                   |
| `masters:bank_account_updated`                       | `{ bankAccount: { id }, changes, entityId, entityType }`                                     | Bank account updated                   |
| `masters:bank_account_activated`                     | `{ bankAccountId }`                                                                          | Bank account activated                 |
| `masters:bank_account_deactivated`                   | `{ bankAccountId }`                                                                          | Bank account deactivated               |
| `masters:connection_created`                         | `{ connection: { id, name, type }, entityId, entityType }`                                   | Connection created                     |
| `masters:connection_updated`                         | `{ connection: { id, name }, changes }`                                                      | Connection updated                     |
| `masters:connection_status_changed`                  | `{ connectionId, fromStatus, toStatus }`                                                     | Connection status changed              |
| `masters:connection_credential_rotated`              | `{ connectionId }`                                                                           | Connection credential rotated          |
| `masters:connection_removed`                         | `{ connectionId, entityId, entityType }`                                                     | Connection removed                     |
| `masters:note_added` / `masters:note_removed`        | `{ entityId, entityType, note: { id, content, type } }` / `{ entityId, entityType, noteId }` | Note added / removed                   |
| `masters:entity_created` / `_removed`                | `{ entity: { id, name, type } }`                                                             | Entity created / removed               |
| `masters:entity_updated`                             | `{ entity: { id, name, type }, changes }`                                                    | Entity updated                         |
| `masters:unit_of_measure_created` / `_removed`       | `{ unitOfMeasure: { id, code, category } }`                                                  | UOM created / removed                  |
| `masters:unit_of_measure_updated`                    | `{ unitOfMeasure: { id, code, category }, changes }`                                         | UOM updated                            |
| `masters:unit_of_measure_activated` / `_deactivated` | `{ unitOfMeasureId }`                                                                        | UOM activated / deactivated            |
| `masters:payment_method_created` / `_removed`        | `{ paymentMethod: { id, name, type }, entityType, entityId }`                                | Payment method created / removed       |
| `masters:payment_method_updated`                     | `{ paymentMethod: { id, name, type }, entityType, entityId, changes }`                       | Payment method updated                 |
| `masters:payment_method_activated` / `_deactivated`  | `{ paymentMethodId, entityType, entityId }`                                                  | Payment method activated / deactivated |
| `masters:payment_method_primary_set`                 | `{ paymentMethodId, entityType, entityId, direction }`                                       | Payment method primary set             |

## Command-Query Separation

### Commands (Write Side)

| Context         | Command                | Method                                             |
| --------------- | ---------------------- | -------------------------------------------------- |
| Contact         | Create contact         | `p.masters.contacts.create()`                      |
| Contact         | Set primary            | `p.masters.contacts.setPrimary()`                  |
| Address         | Create address         | `p.masters.addresses.create()`                     |
| Bank Account    | Create account         | `p.masters.bankAccounts.create()`                  |
| Connection      | Create connection      | `p.masters.connections.create()`                   |
| Connection      | Test endpoint          | `p.masters.connections.test()`                     |
| Connection      | Rotate credential      | `p.masters.connections.rotateCredential()`         |
| Entity          | Create entity          | `p.masters.entities.create()`                      |
| Entity          | Set status             | `p.masters.entities.setStatus()`                   |
| Note            | Add note               | `p.masters.notes.add()`                            |
| Payment Method  | Create payment method  | `p.masters.paymentMethods.create()`                |
| Payment Method  | Set primary            | `p.masters.paymentMethods.setPrimary()`            |
| Unit of Measure | Create unit of measure | `p.masters.unitsOfMeasure.create()`                |
| Unit of Measure | Activate / deactivate  | `p.masters.unitsOfMeasure.activate()/deactivate()` |

### Queries (Read Side)

| Context         | Query                 | Method                                                          |
| --------------- | --------------------- | --------------------------------------------------------------- |
| Contact         | List contacts         | `p.masters.contacts.list(entityType, entityId, filters?)`       |
| Address         | List addresses        | `p.masters.addresses.list(entityType, entityId, filters?)`      |
| Bank Account    | List accounts         | `p.masters.bankAccounts.list(entityType, entityId, filters?)`   |
| Connection      | List connections      | `p.masters.connections.list(entityType, entityId, filters?)`    |
| Entity          | List entities         | `p.masters.entities.list(filters?)`                             |
| Note            | List notes            | `p.masters.notes.list(entityType, entityId, type?)`             |
| Payment Method  | List payment methods  | `p.masters.paymentMethods.list(entityType, entityId, filters?)` |
| Unit of Measure | List units of measure | `p.masters.unitsOfMeasure.list(filters?)`                       |

## Invariants & Business Rules

1. **Polymorphic scoping** — polymorphic rows carry `entityType` (`master_entity_type`) + `entityId`; all list queries filter on the pair. `unitOfMeasure` is tenant-wide (no pair).
2. **One primary per scope** — `setPrimary` (contacts/addresses/bankAccounts) unsets the existing primary within the `(entityType, entityId)` scope; payment methods scope additionally by `direction` (a `both` method claims both scopes).
3. **No plaintext credentials** — `master_connection.credentialRef` points at an encrypted kvStore secret; `rotateCredential` replaces the secret and bumps the ref.
4. **Uppercase country codes** — `master_address.country` is stored as ISO 3166-1 alpha-2 uppercase.
5. **Entity status transitions** — `active` ↔ `inactive`, and both → `archived` (terminal).
6. **UOM base-unit invariant** — exactly one base unit per category; base units have `baseUnitId`/`conversionFactor` null; derived units reference the base of their own category with `conversionFactor > 0`; referenced-as-base units cannot be deleted.
7. **Payment method type fields** — type-specific required fields validated on create/update; card data is masked-only.
