# @aspen-os/organization

A domain module for the Aspen OS framework that manages the **organization profile** and its hierarchical **branches**.

> Contacts, addresses, bank accounts, integration connections, and notes were extracted into the **Masters** module (`@aspen-os/masters`) as polymorphic tenant master data. This module depends on `masters` and owns only the org profile and branches.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Module API](#module-api)
- [Database Schema](#database-schema)
- [Workflows](#workflows)
  - [OrganizationWorkflow](#organizationworkflow)
  - [BranchWorkflow](#branchworkflow)
- [Validation Schemas](#validation-schemas)
- [Events](#events)
- [Constants](#constants)

## Overview

The organization module provides two workflow groups accessible on the platform instance via `platform.organization.<getter>`.

**Package**: `@aspen-os/organization`  
**Dependencies**: `@aspen-os/platform`, `@aspen-os/constants`, `@aspen-os/masters` (module dependency), `drizzle-orm`, `valibot`  
**Module name**: `"organization"`  
**Tables**: 2 tables, 2 pg enums  
**Validation**: Valibot for all input schemas

## Installation

```bash
bun install  # workspace package, no separate install needed
```

## Quick Start

```ts
import { SingleTenantPlatform } from "@aspen-os/platform/server";
import { Organization } from "@aspen-os/organization";

const organization = Organization.create({ country: "INDIA" });

const platform = SingleTenantPlatform.create(config, [masters, organization]);

// Access workflows via the module proxy
platform.organization.organizations; // OrganizationWorkflow
platform.organization.branches; // BranchWorkflow
```

## Module API

```ts
type OrganizationConfig = {
  country: "INDIA";
};

class Organization {
  static create(config: OrganizationConfig): Organization;
  readonly $name = "organization";
  readonly $dependencies = ["masters"] as const;

  $initialize(units): void;
  $prepareRuntime(): Promise<void>;
  $cleanup(): Promise<void>;

  // Workflow groups (readonly properties)
  readonly organizations: OrganizationWorkflow;
  readonly branches: BranchWorkflow;
}
```

## Database Schema

### Enums

| Enum                  | Values                                                                       |
| --------------------- | ---------------------------------------------------------------------------- |
| `organization_status` | `active`, `suspended`, `archived`                                            |
| `branch_type`         | `headquarters`, `office`, `warehouse`, `store`, `factory`, `remote`, `other` |

### Tables

| Table          | Description                                            | Key Columns                                                                   |
| -------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `organization` | Root entity                                            | `id`, `name`, `slug` (unique), `status`, `accentColor`, `locale`, `timezone`  |
| `branch`       | Physical/logical location (hierarchical, max 5 levels) | `id`, `name`, `code` (unique), `type`, `parentBranch`, `isActive`, `capacity` |

All IDs are `text` with `.primaryKey().$defaultFn(uuidv7)` (the `uuidv7` function, imported from `@aspen-os/platform/server`). All timestamps are `TIMESTAMPTZ` with `withTimezone: true`.

## Workflows

All workflow methods are synchronous DB operations that `parse()` input with Valibot before writing. None perform access-control checks -- authorization is expected at the consuming app's RPC layer.

### OrganizationWorkflow

Manages a **single** organization record (singleton-style). `get()` returns the first row by `LIMIT 1`.

```ts
platform.organization.organizations.get(): Promise<Organization | null>
platform.organization.organizations.create(input: CreateOrganizationInput): Promise<Organization>
platform.organization.organizations.update(patch: UpdateOrganizationInput): Promise<Organization>
platform.organization.organizations.updateBranding(patch: UpdateBrandingInput): Promise<Organization>
platform.organization.organizations.uploadLogo(storageKey: string): Promise<Organization>
platform.organization.organizations.deleteLogo(): Promise<Organization>
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
platform.organization.branches.get(id: string): Promise<Branch>
platform.organization.branches.tree(): Promise<BranchTreeNode[]>
```

**Business rules enforced**:

- Single headquarters per organization (workflow-level check).
- Max 5-level hierarchy depth (workflow-level check via parent-chain traversal).
- No self-parent (rejected with error).
- No circular parent references (detected via recursive traversal).
- Unique branch codes (case-insensitive, uppercased on insert).
- Country code validated via `isValidCountryCode()` from `@aspen-os/constants`.
- `tree()` returns only active branches (inactive/archived/closed excluded).

## Validation Schemas

All input validation uses **Valibot**. Each entity has `Create*Schema`, `Update*Schema`, and `*FiltersSchema` with corresponding `*Input` and `*Filters` types.

Shared validators in `schemas/utils.ts`:

| Validator           | Rules                                                 |
| ------------------- | ----------------------------------------------------- |
| `NameSchema`        | String, 1-255 chars                                   |
| `SlugSchema`        | String, 3-63 chars, `^[a-z0-9]+(-[a-z0-9]+)*$`        |
| `BranchCodeSchema`  | String, 2-20 chars, uppercase alphanumeric + hyphens  |
| `CountryCodeSchema` | String matching `^[A-Z]{2}$` (ISO alpha-2 format)     |
| `AccentColorSchema` | String matching 6-digit hex (`#RRGGBB`)               |
| `LogoFileSchema`    | `{ contentType, size }` -- png/jpeg/svg/webp, max 5MB |

Schemas are co-exported with their inferred types:

```ts
import type { CreateOrganizationInput, UpdateOrganizationInput } from "@aspen-os/organization";
import { CreateOrganizationSchema, UpdateOrganizationSchema } from "@aspen-os/organization";
```

## Events

The event map defines 7 events across 2 groups. These are **type-level contracts**; workflows publish events at runtime via PubSub.

### Organization Events

| Event                           | Payload                                                                  |
| ------------------------------- | ------------------------------------------------------------------------ |
| `organization:updated`          | `{ changes: Record<string, unknown>; organization: { id, name, slug } }` |
| `organization:branding_updated` | `{ accentColor?, logo?, name? }`                                         |

### Branch Events

| Event                | Payload                                                      |
| -------------------- | ------------------------------------------------------------ |
| `branch:created`     | `{ branch: { code, id, name, type } }`                       |
| `branch:updated`     | `{ branch: { id, name }; changes: Record<string, unknown> }` |
| `branch:activated`   | `{ branchId }`                                               |
| `branch:deactivated` | `{ branchId }`                                               |
| `branch:closed`      | `{ branchId, date }`                                         |

## Constants

Shared constants live in `@aspen-os/constants` (not in this package):

| Constant              | Type              | Values                                                                       |
| --------------------- | ----------------- | ---------------------------------------------------------------------------- |
| `ORGANIZATION_STATUS` | `as const` object | `ACTIVE`, `ARCHIVED`, `SUSPENDED`                                            |
| `BRANCH_TYPE`         | `as const` object | `FACTORY`, `HEADQUARTERS`, `OFFICE`, `OTHER`, `REMOTE`, `STORE`, `WAREHOUSE` |

All constant keys are `UPPER_SNAKE`, values are lowercase strings. Types are derived via indexed access: `type OrganizationStatus = (typeof ORGANIZATION_STATUS)[keyof typeof ORGANIZATION_STATUS]`.

## Package Structure

```
packages/organization/
  src/
    index.ts              # Organization class + type re-exports
    module.ts             # Module class (implements Module)
    auth.ts               # defineAcl() ACL declaration
    pubsub.ts             # Event constants + typed event interfaces + EventMap type
    types.ts              # Type re-exports + BranchTreeNode interface
    db-schemas/           # organization.ts, branch.ts + index.ts
    schemas/
      index.ts            # Barrel re-exports
      enums.ts            # Valibot enum schemas (status, branch type)
      utils.ts            # Shared validators (slug, name, code, etc.)
      organization.ts     # Create/Update/Branding schemas
      branch.ts           # Create/Update/Filters schemas
    workflows/
      org/                # OrganizationWorkflow (create, get, update, branding, logo)
      branch/             # BranchWorkflow (hierarchy enforcement, tree)
      utils.ts            # Branch hierarchy helpers
```
