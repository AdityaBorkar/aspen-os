# Masters Domain Model

> Package: `@aspen-os/masters`. Polymorphic tenant master data — contacts, addresses, bank accounts, integration connections, and notes. All 5 tables are tenant schemas (`master_` prefix).

## Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MASTERS DOMAIN                                  │
│                                                                         │
│  Polymorphic scope: (entityType, entityId)                              │
│  entityType ∈ { organization, branch, connection, contact }            │
│                                                                         │
│  ┌────────────────┐     ┌────────────────┐     ┌─────────────────────┐ │
│  │  MasterContact │     │  MasterAddress │     │  MasterBankAccount  │ │
│  │  id            │     │  id            │     │  id                 │ │
│  │  name          │     │  label         │     │  accountHolderName  │ │
│  │  email, phone  │     │  line1, line2  │     │  accountNumber      │ │
│  │  title, company│     │  city, state   │     │  bankName, branch   │ │
│  │  type          │     │  postalCode    │     │  routingNumber      │ │
│  │  isPrimary     │     │  country       │     │  swiftCode          │ │
│  │  entityType    │     │  isPrimary     │     │  currency           │ │
│  │  entityId      │     │  entityType    │     │  isActive/isPrimary │ │
│  │  metadata      │     │  entityId      │     │  entityType/entityId│ │
│  └────────────────┘     │  metadata      │     │  metadata           │ │
│                         └────────────────┘     └─────────────────────┘ │
│                                                                         │
│  ┌────────────────┐     ┌────────────────┐                              │
│  │MasterConnection│     │   MasterNote   │                              │
│  │  id            │     │  id            │                              │
│  │  name          │     │  content       │                              │
│  │  type          │     │  type          │  general|call|email|meeting  │
│  │  status        │     │  userId        │  |contract_renewal|issue     │
│  │  baseUrl       │     │  entityType    │                              │
│  │  description   │     │  entityId      │                              │
│  │  credentialRef │     └────────────────┘                              │
│  │  lastTestedAt  │                                                    │
│  │  lastUsedAt    │     credentialRef → kvStore secret (encrypted)     │
│  │  entityType    │                                                    │
│  │  entityId      │                                                    │
│  │  metadata      │                                                    │
│  └────────────────┘                                                    │
└─────────────────────────────────────────────────────────────────────────┘
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

### Note (Aggregate Root)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)`)

**Lifecycle commands**: `add(input)`, `remove(id)`, `list(entityType, entityId, type?)`.

## Domain Events — 16

| Event                                         | Payload                                                                                      | Trigger                       |
| --------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------- |
| `masters:contact_created`                     | `{ contact: { id, name, type }, entityType }`                                                | Contact created               |
| `masters:contact_updated`                     | `{ contact: { id, name }, changes, entityType }`                                             | Contact updated               |
| `masters:contact_removed`                     | `{ contactId, entityId, entityType }`                                                        | Contact removed               |
| `masters:address_created`                     | `{ address: { id, country, label }, entityId, entityType }`                                  | Address created               |
| `masters:address_updated`                     | `{ address: { id }, changes, entityId, entityType }`                                         | Address updated               |
| `masters:address_removed`                     | `{ addressId }`                                                                              | Address removed               |
| `masters:bank_account_created`                | `{ bankAccount: { id, bankName, currency }, entityId, entityType }`                          | Bank account created          |
| `masters:bank_account_updated`                | `{ bankAccount: { id }, changes, entityId, entityType }`                                     | Bank account updated          |
| `masters:bank_account_activated`              | `{ bankAccountId }`                                                                          | Bank account activated        |
| `masters:bank_account_deactivated`            | `{ bankAccountId }`                                                                          | Bank account deactivated      |
| `masters:connection_created`                  | `{ connection: { id, name, type }, entityId, entityType }`                                   | Connection created            |
| `masters:connection_updated`                  | `{ connection: { id, name }, changes }`                                                      | Connection updated            |
| `masters:connection_status_changed`           | `{ connectionId, fromStatus, toStatus }`                                                     | Connection status changed     |
| `masters:connection_credential_rotated`       | `{ connectionId }`                                                                           | Connection credential rotated |
| `masters:connection_removed`                  | `{ connectionId, entityId, entityType }`                                                     | Connection removed            |
| `masters:note_added` / `masters:note_removed` | `{ entityId, entityType, note: { id, content, type } }` / `{ entityId, entityType, noteId }` | Note added / removed          |

## Command-Query Separation

### Commands (Write Side)

| Context      | Command           | Method                                     |
| ------------ | ----------------- | ------------------------------------------ |
| Contact      | Create contact    | `p.masters.contacts.create()`              |
| Contact      | Set primary       | `p.masters.contacts.setPrimary()`          |
| Address      | Create address    | `p.masters.addresses.create()`             |
| Bank Account | Create account    | `p.masters.bankAccounts.create()`          |
| Connection   | Create connection | `p.masters.connections.create()`           |
| Connection   | Test endpoint     | `p.masters.connections.test()`             |
| Connection   | Rotate credential | `p.masters.connections.rotateCredential()` |
| Note         | Add note          | `p.masters.notes.add()`                    |

### Queries (Read Side)

| Context      | Query            | Method                                                        |
| ------------ | ---------------- | ------------------------------------------------------------- |
| Contact      | List contacts    | `p.masters.contacts.list(entityType, entityId, filters?)`     |
| Address      | List addresses   | `p.masters.addresses.list(entityType, entityId, filters?)`    |
| Bank Account | List accounts    | `p.masters.bankAccounts.list(entityType, entityId, filters?)` |
| Connection   | List connections | `p.masters.connections.list(entityType, entityId, filters?)`  |
| Note         | List notes       | `p.masters.notes.list(entityType, entityId, type?)`           |

## Invariants & Business Rules

6. **Polymorphic scoping** — every row carries `entityType` (`master_entity_type`) + `entityId`; all list queries filter on the pair.
7. **One primary per scope** — `setPrimary` (contacts/addresses/bankAccounts) unsets the existing primary within the `(entityType, entityId)` scope.
8. **No plaintext credentials** — `master_connection.credentialRef` points at an encrypted kvStore secret; `rotateCredential` replaces the secret and bumps the ref.
9. **Uppercase country codes** — `master_address.country` is stored as ISO 3166-1 alpha-2 uppercase.
