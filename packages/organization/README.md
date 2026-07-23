# @aspen-os/organization

A domain module for the Aspen OS framework that manages organizational structure: organizations, branches, connections (clients/vendors/partners), addresses, bank accounts, and compliance documents.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Module API](#module-api)
- [Database Schema](#database-schema)
- [Workflows](#workflows)
  - [OrganizationWorkflow](#organizationworkflow)
  - [BranchWorkflow](#branchworkflow)
  - [ConnectionWorkflow](#connectionworkflow)
  - [AddressWorkflow](#addressworkflow)
  - [BankAccountWorkflow](#bankaccountworkflow)
- [Validation Schemas](#validation-schemas)
- [Events](#events)
- [Constants](#constants)

## Overview

The organization module is one of two fully implemented domain modules. It provides five workflows accessible on the platform instance via `platform.organization.<getter>`.

**Package**: `@aspen-os/organization`  
**Dependencies**: `@aspen-os/platform`, `@aspen-os/constants`, `drizzle-orm`, `valibot`  
**Module name**: `"organization"`  
**Tables**: 7 tables, 5 pg enums  
**Validation**: Valibot for all input schemas

## Installation

```bash
bun install  # workspace package, no separate install needed
```

## Quick Start

```ts
import { Platform } from "@aspen-os/platform/server"
import { OrganizationModule } from "@aspen-os/organization"

const organization = OrganizationModule.create({ country: "INDIA" })

const platform = Platform.create(config, { organization })

await platform.prepare()

// Access workflows via the module proxy
platform.organization.organization     // OrganizationWorkflow
platform.organization.branches         // BranchWorkflow
platform.organization.connections       // ConnectionWorkflow
platform.organization.addresses        // AddressWorkflow
platform.organization.bankAccounts     // BankAccountWorkflow
```

## Module API

```ts
type OrganizationModuleConfig = {
  country: "INDIA"
}

class OrganizationModule {
  static create(config: OrganizationModuleConfig): OrganizationModule
  readonly name: "organization"
  readonly db_schema: typeof dbSchema

  initialize(units: { db: DatabaseUnit; pubsub: PubSubUnit }): void
  destroy(): Promise<void>

  // Workflow getters (throw if accessed before initialize())
  get organization(): OrganizationWorkflow
  get branches(): BranchWorkflow
  get connections(): ConnectionWorkflow
  get addresses(): AddressWorkflow
  get bankAccounts(): BankAccountWorkflow
}
```

## Database Schema

### Enums

| Enum | Values |
|---|---|
| `organization_status` | `active`, `suspended`, `archived` |
| `branch_type` | `headquarters`, `office`, `warehouse`, `store`, `factory`, `remote`, `other` |
| `connection_type` | `client`, `vendor`, `partner`, `subsidiary`, `parent_company`, `investor`, `regulator`, `insurer`, `bank`, `other` |
| `connection_status` | `active`, `inactive`, `prospect`, `former` |
| `connection_note_type` | `general`, `call`, `email`, `meeting`, `contract_renewal`, `issue` |

### Tables

| Table | Description | Key Columns |
|---|---|---|
| `organization` | Root entity | `id`, `name`, `slug` (unique), `status`, `accentColor`, `locale`, `timezone` |
| `branch` | Physical/logical location (hierarchical, max 5 levels) | `id`, `name`, `code` (unique), `type`, `parentBranch`, `isActive`, `capacity` |
| `connection` | External business relationship | `id`, `name`, `type`, `status`, `createdBy`, `tags[]`, `annualRevenue` (numeric) |
| `connection_contact` | Person associated with a connection | `id`, `connectionId`, `name`, `email`, `phone`, `isPrimary` |
| `connection_note` | Interaction log entry on a connection | `id`, `connectionId`, `userId`, `type`, `content` (immutable, no `updatedAt`) |
| `address` | Postal address (reusable across entities) | `id`, `line1`, `country`, `isPrimary`, `label` |
| `bank_account` | Financial account record | `id`, `accountHolderName`, `accountNumber`, `bankName`, `currency`, `isPrimary`, `isActive` |

All IDs are `text` with `DEFAULT gen_random_uuid()::text`. All timestamps are `TIMESTAMPTZ` with `withTimezone: true`. No foreign keys are declared -- relations are implicit via `text` columns. The `updatedAt` column is manually set in workflows (no `$onUpdate` hook).

## Workflows

All workflow methods are synchronous DB operations that `parse()` input with Valibot before writing. None perform access-control checks -- authorization is expected at the consuming app's RPC layer.

### OrganizationWorkflow

Manages a **single** organization record (singleton-style). `get()` returns the first row by `LIMIT 1`. Methods take no `id` argument.

```ts
platform.organization.organization.get(): Promise<Organization | null>
platform.organization.organization.create(input: CreateOrganizationInput): Promise<Organization>
platform.organization.organization.update(patch: UpdateOrganizationInput): Promise<Organization>
platform.organization.organization.updateBranding(patch: UpdateBrandingInput): Promise<Organization>
platform.organization.organization.uploadLogo(storageKey: string): Promise<Organization>
platform.organization.organization.deleteLogo(): Promise<Organization>
```

- `create()` auto-generates a slug from `name` if not provided (lowercase, hyphenated, max 63 chars).
- `update()` checks slug uniqueness if changing.
- `updateBranding()` updates `accentColor`, `logo`, and/or `name`.

### BranchWorkflow

Manages branches with hierarchical nesting (max 5 levels) and a single-headquarters invariant.

```ts
platform.organization.branches.create(input: CreateBranchInput): Promise<Branch>
platform.organization.branches.update(id: string, patch: UpdateBranchInput): Promise<Branch>
platform.organization.branches.activate(id: string): Promise<Branch>
platform.organization.branches.deactivate(id: string): Promise<Branch>
platform.organization.branches.close(id: string, date: Date): Promise<Branch>
platform.organization.branches.archive(id: string): Promise<Branch>
platform.organization.branches.restore(id: string): Promise<Branch>
platform.organization.branches.list(filters?: BranchFilters): Promise<Branch[]>
platform.organization.branches.getById(id: string): Promise<Branch>
platform.organization.branches.getTree(): Promise<BranchTreeNode[]>
```

**Business rules enforced**:
- Single headquarters per organization (workflow-level check).
- Max 5-level hierarchy depth (workflow-level check via parent-chain traversal).
- No self-parent (rejected with error).
- No circular parent references (detected via recursive traversal).
- Unique branch codes (case-insensitive, uppercased on insert).
- Country code validated via `isValidCountryCode()` from `@aspen-os/constants`.
- `getTree()` returns only active branches (inactive/archived/closed excluded).

### ConnectionWorkflow

Manages connections plus nested contacts (1:N) and notes (1:N, immutable).

```ts
// Connection CRUD
platform.organization.connections.create(input: CreateConnectionInput): Promise<Connection>
platform.organization.connections.update(id: string, patch: UpdateConnectionInput): Promise<Connection>
platform.organization.connections.updateStatus(id: string, status: ConnectionStatus): Promise<{ connection, fromStatus, toStatus }>
platform.organization.connections.archive(id: string): Promise<Connection>
platform.organization.connections.restore(id: string): Promise<Connection>
platform.organization.connections.list(filters?: ConnectionFilters): Promise<Connection[]>
platform.organization.connections.getById(id: string): Promise<Connection>
platform.organization.connections.search(query: string, filters?): Promise<Connection[]>

// Contacts (1:N per connection)
platform.organization.connections.createContact(input: CreateConnectionContactInput): Promise<ConnectionContact>
platform.organization.connections.updateContact(id: string, patch: UpdateConnectionContactInput): Promise<ConnectionContact>
platform.organization.connections.deleteContact(id: string): Promise<void>
platform.organization.connections.setPrimaryContact(id: string): Promise<ConnectionContact>
platform.organization.connections.listContacts(connectionId: string): Promise<ConnectionContact[]>
platform.organization.connections.searchContacts(query: string, connectionId?: string): Promise<ConnectionContact[]>

// Notes (1:N per connection, immutable)
platform.organization.connections.addNote(input: CreateConnectionNoteInput): Promise<ConnectionNote>
platform.organization.connections.listNotes(connectionId: string, type?: string): Promise<ConnectionNote[]>
```

**Notable behaviors**:
- Primary contact unsetting is **scoped per connection** (correctly).
- `annualRevenue` and `contractValue` are `numeric` PG columns -- workflows convert JS `number` to string via `.toString()`.
- `listNotes` accepts `type?: string` (no Valibot validation on this path).
- Notes are immutable (no update method, no `updatedAt` column).

### AddressWorkflow

CRUD over the `address` table with a primary-address singleton invariant.

```ts
platform.organization.addresses.create(input: CreateAddressInput): Promise<Address>
platform.organization.addresses.update(id: string, patch: UpdateAddressInput): Promise<Address>
platform.organization.addresses.delete(id: string): Promise<void>
platform.organization.addresses.getById(id: string): Promise<Address>
platform.organization.addresses.list(filters?: AddressFilters): Promise<Address[]>
platform.organization.addresses.setPrimary(id: string): Promise<Address>
```

**Note**: `unsetPrimary()` is global (sets `is_primary=false` across **all** rows -- no scoping column exists on the `address` table).

### BankAccountWorkflow

Same shape as Address, plus activate/deactivate toggles.

```ts
platform.organization.bankAccounts.create(input: CreateBankAccountInput): Promise<BankAccount>
platform.organization.bankAccounts.update(id: string, patch: UpdateBankAccountInput): Promise<BankAccount>
platform.organization.bankAccounts.delete(id: string): Promise<void>
platform.organization.bankAccounts.getById(id: string): Promise<BankAccount>
platform.organization.bankAccounts.list(filters?: BankAccountFilters): Promise<BankAccount[]>
platform.organization.bankAccounts.setPrimary(id: string): Promise<BankAccount>
platform.organization.bankAccounts.activate(id: string): Promise<BankAccount>
platform.organization.bankAccounts.deactivate(id: string): Promise<BankAccount>
```

**Note**: Same global `unsetPrimary()` behavior as Address.

## Validation Schemas

All input validation uses **Valibot**. Each entity has `Create*Schema`, `Update*Schema`, and `*FiltersSchema` with corresponding `*Input` and `*Filters` types.

Shared validators in `schemas/utils.ts`:

| Validator | Rules |
|---|---|
| `NameSchema` | String, 1-255 chars |
| `SlugSchema` | String, 3-63 chars, `^[a-z0-9]+(-[a-z0-9]+)*$` |
| `BranchCodeSchema` | String, 2-20 chars, uppercase alphanumeric + hyphens |
| `CountryCodeSchema` | String matching `^[A-Z]{2}$` (ISO alpha-2 format) |
| `AccentColorSchema` | String matching 6-digit hex (`#RRGGBB`) |
| `LogoFileSchema` | `{ contentType, size }` -- png/jpeg/svg/webp, max 5MB |

Schemas are co-exported with their inferred types:

```ts
import type { CreateOrganizationInput, UpdateOrganizationInput } from "@aspen-os/organization"
import { CreateOrganizationSchema, UpdateOrganizationSchema } from "@aspen-os/organization"
```

## Events

The event map defines 11 events across 3 groups. These are **type-level contracts only** -- workflows do not currently publish events at runtime. The event map is available for consumers to subscribe to expected topics.

### Organization Events

| Event | Payload |
|---|---|
| `organization:updated` | `{ changes: Record<string, unknown>; organization: { id, name, slug } }` |
| `organization:branding_updated` | `{ accentColor?, logo?, name? }` |

### Branch Events

| Event | Payload |
|---|---|
| `branch:created` | `{ branch: { code, id, name, type } }` |
| `branch:updated` | `{ branch: { id, name }; changes: Record<string, unknown> }` |
| `branch:activated` | `{ branchId }` |
| `branch:deactivated` | `{ branchId }` |
| `branch:closed` | `{ branchId, date }` |

### Connection Events

| Event | Payload |
|---|---|
| `connection:created` | `{ connection: { id, name, type } }` |
| `connection:updated` | `{ changes: Record<string, unknown>; connection: { id, name } }` |
| `connection:status_changed` | `{ connectionId, fromStatus, toStatus }` |
| `connection:note_added` | `{ connectionId, note: { content, id, type } }` |

## Constants

Shared constants live in `@aspen-os/constants` (not in this package):

| Constant | Type | Values |
|---|---|---|
| `ORGANIZATION_STATUS` | `as const` object | `ACTIVE`, `ARCHIVED`, `SUSPENDED` |
| `BRANCH_TYPE` | `as const` object | `FACTORY`, `HEADQUARTERS`, `OFFICE`, `OTHER`, `REMOTE`, `STORE`, `WAREHOUSE` |
| `CONNECTION_TYPE` | `as const` object | `CLIENT`, `VENDOR`, `PARTNER`, `SUBSIDIARY`, `PARENT_COMPANY`, `INVESTOR`, `REGULATOR`, `INSURER`, `BANK`, `OTHER` |
| `CONNECTION_STATUS` | `as const` object | `ACTIVE`, `INACTIVE`, `PROSPECT`, `FORMER` |
| `CONNECTION_NOTE_TYPE` | `as const` object | `GENERAL`, `CALL`, `EMAIL`, `MEETING`, `CONTRACT_RENEWAL`, `ISSUE` |

All constant keys are `UPPER_SNAKE`, values are lowercase strings. Types are derived via indexed access: `type OrganizationStatus = (typeof ORGANIZATION_STATUS)[keyof typeof ORGANIZATION_STATUS]`.

## Package Structure

```
packages/organization/
  src/
    index.ts              # OrganizationModule class + type re-exports
    db-schema.ts          # 7 tables + 5 pg enums
    types.ts              # Type re-exports + BranchTreeNode interface
    event-map.ts          # Event constants + typed event interfaces + EventMap type
    schemas/
      index.ts            # Barrel re-exports
      enums.ts            # 5 valibot enum schemas
      utils.ts            # Shared validators (slug, name, code, etc.)
      organization.ts     # Create/Update/Branding schemas
      branch.ts           # Create/Update/Filters schemas
      connection.ts       # Connection + Contact + Note schemas
      address.ts          # Create/Update/Filters schemas
      bank-account.ts     # Create/Update/Filters schemas
      branding.ts         # (empty -- branding schema lives in organization.ts)
    workflows/
      organization.ts     # OrganizationWorkflow
      branch.ts           # BranchWorkflow (most complex -- hierarchy enforcement)
      connection.ts       # ConnectionWorkflow (largest surface)
      address.ts          # AddressWorkflow
      bank-account.ts     # BankAccountWorkflow
```
