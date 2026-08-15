# Organization Domain Model

> Package: `@aspen-os/organization`. The organization profile and its branches, connections, addresses, and bank accounts. All 7 tables are tenant schemas.

## Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ORGANIZATION DOMAIN                              │
│                                                                     │
│  ┌──────────────┐   1:N ┌──────────┐                                │
│  │ Organization │──────→│  Branch  │  (hierarchical, max 5 levels)  │
│  │  id          │       │  id      │                                │
│  │  name        │       │  name    │                                │
│  │  slug (uniq) │       │  code(uniq)│                              │
│  │  status      │       │  type    │  headquarters|office|warehouse │
│  │  email       │       │  isActive│  |store|factory|remote|other   │
│  │  phone       │       │  parentBranch│  (self FK)                 │
│  │  website     │       └──────────┘                                │
│  │  logo        │                                                    │
│  │  accentColor │                                                    │
│  │  locale      │                                                    │
│  │  timezone    │                                                    │
│  │  metadata    │                                                    │
│  └──────────────┘                                                    │
│                                                                     │
│  ┌──────────────┐       ┌──────────────┐                            │
│  │  Connection  │       │   Address    │                            │
│  │  id          │       │  id          │                            │
│  │  name        │       │  line1       │                            │
│  │  type        │       │  line2       │                            │
│  │  status      │       │  city        │                            │
│  │  contactInfo │       │  state       │                            │
│  │  metadata    │       │  postalCode  │                            │
│  └──────────────┘       │  country     │                            │
│         │               │  isPrimary   │                            │
│         ├──1:N──┌──────────────────┐   │  label      │              │
│         │       │ ConnectionContact│   └──────────────┘              │
│         │       │  id              │                                │
│         │       │  connectionId(FK)│                                │
│         │       │  name, email     │                                │
│         │       │  phone, title    │                                │
│         │       │  isPrimary       │                                │
│         │       └──────────────────┘                                │
│         │                                                           │
│         └──1:N──┌──────────────────┐                                │
│                 │ ConnectionNote   │                                │
│                 │  id              │                                │
│                 │  connectionId(FK)│                                │
│                 │  userId          │                                │
│                 │  type            │  general|call|email|meeting     │
│                 │  content         │  |contract_renewal|issue        │
│                 └──────────────────┘                                │
│                                                                     │
│  ┌──────────────┐                                                   │
│  │ BankAccount  │                                                   │
│  │  id          │                                                   │
│  │  accountHolderName │                                             │
│  │  accountNumber     │                                             │
│  │  bankName          │                                             │
│  │  routingNumber     │                                             │
│  │  swiftCode         │                                             │
│  │  currency          │                                             │
│  │  isPrimary         │                                             │
│  └──────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Aggregates

### Organization (Aggregate Root)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)` — the `uuidv7` JS function)

**Invariants**:

- Slug must be unique
- Status must be one of: `active`, `suspended`, `archived`

**Lifecycle commands**: `create(input)`, `update(id, input)`, `updateBranding(id, { logo?, accentColor? })`, `uploadLogo(id, file)`, `deleteLogo(id)`, `delete(id)`.

**Relationships**: Has many `Branch` (1:N); has many `Address` (1:N, reusable); has many `BankAccount` (1:N).

### Branch (Aggregate Root)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)`)

**Invariants**:

- Code must be unique
- Exactly one headquarters branch per organization (enforced in workflow)
- Hierarchical nesting max 5 levels deep
- No circular parent references

**Lifecycle commands**: `create(input)`, `update(id, input)`, `activate(id)` / `deactivate(id)`, `close(id)`, `archive(id)` / `restore(id)`, `tree()`.

**Relationships**: Belongs to `Organization` (N:1); self-referential `parentBranch` FK for hierarchy.

### Connection (Aggregate Root)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)`)

**Invariants**: Status transitions are controlled (e.g., can't un-archive).

**Lifecycle commands**: `create(input)`, `update(id, input)`, `updateStatus(id, status)`, `archive(id)` / `restore(id)`, `search(query)`, `createContact(connectionId, input)`, `updateContact(contactId, input)`, `deleteContact(contactId)`, `setPrimaryContact(connectionId, contactId)`, `addNote(connectionId, input)`, `listNotes(connectionId)`, `listContacts(connectionId)`.

**Relationships**: Has many `ConnectionContact` (1:N, cascade delete); has many `ConnectionNote` (1:N, cascade delete).

### Address (Aggregate Root)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)`)

**Lifecycle commands**: `create(input)`, `update(id, input)`, `delete(id)`, `setPrimary(id)`, `list(filters?)`.

### Bank Account (Aggregate Root)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)`)

**Lifecycle commands**: `create(input)`, `update(id, input)`, `delete(id)`, `setPrimary(id)`, `activate(id)` / `deactivate(id)`, `list(filters?)`.

## Domain Events — 11

| Event                           | Payload                                         | Trigger                   |
| ------------------------------- | ----------------------------------------------- | ------------------------- |
| `organization:updated`          | `{ changes, organization: { id, name, slug } }` | Organization updated      |
| `organization:branding_updated` | `{ logo?, accentColor?, name? }`                | Branding changed          |
| `branch:created`                | `{ branch: { code, id, name, type } }`          | Branch created            |
| `branch:updated`                | `{ branch: { id, name }, changes }`             | Branch updated            |
| `branch:activated`              | `{ branchId }`                                  | Branch activated          |
| `branch:deactivated`            | `{ branchId }`                                  | Branch deactivated        |
| `branch:closed`                 | `{ branchId, date }`                            | Branch closed             |
| `connection:created`            | `{ connection: { id, name, type } }`            | Connection created        |
| `connection:updated`            | `{ connection: { id, name }, changes }`         | Connection updated        |
| `connection:status_changed`     | `{ connectionId, fromStatus, toStatus }`        | Connection status changed |
| `connection:note_added`         | `{ connectionId, note: { content, id, type } }` | Note added to connection  |

## Command-Query Separation

### Commands (Write Side)

| Context      | Command           | Method                                          |
| ------------ | ----------------- | ----------------------------------------------- |
| Organization | Create org        | `p.organization.organizations.create()`         |
| Organization | Update org        | `p.organization.organizations.update()`         |
| Organization | Update branding   | `p.organization.organizations.updateBranding()` |
| Branch       | Create branch     | `p.organization.branches.create()`              |
| Branch       | Archive branch    | `p.organization.branches.archive()`             |
| Connection   | Create connection | `p.organization.connections.create()`           |
| Connection   | Add contact       | `p.organization.connections.createContact()`    |
| Address      | Create address    | `p.organization.addresses.create()`             |
| Bank Account | Create account    | `p.organization.bankAccounts.create()`          |

### Queries (Read Side)

| Context      | Query          | Method                                      |
| ------------ | -------------- | ------------------------------------------- |
| Organization | Get org        | `p.organization.organizations.get()`        |
| Branch       | List branches  | `p.organization.branches.list()`            |
| Branch       | Get tree       | `p.organization.branches.tree()`            |
| Connection   | Search         | `p.organization.connections.search()`       |
| Connection   | List contacts  | `p.organization.connections.listContacts()` |
| Address      | List addresses | `p.organization.addresses.list()`           |
| Bank Account | List accounts  | `p.organization.bankAccounts.list()`        |

## Invariants & Business Rules

11. **Slug uniqueness** — enforced by DB unique constraint on `organization.slug`.
12. **Branch code uniqueness** — enforced by DB unique constraint on `branch.code`.
13. **Single headquarters** — exactly one branch of type `headquarters` per organization (enforced in workflow).
14. **Branch hierarchy depth** — max 5 levels deep (enforced in workflow).
15. **No circular branch parents** — detected via recursive traversal in workflow.
