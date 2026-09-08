# @aspen-os/organization

A domain module for the Aspen OS framework that manages the tenant's hierarchical **branches**. The organization profile (id, branding, logo) lives in Masters settings (`org.*` keys via `p.masters.settings`).

> Contacts, addresses, bank accounts, integration connections, and notes were extracted into the **Masters** module (`@aspen-os/masters`) as polymorphic tenant master data. This module owns only branches and has no module dependencies.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Module API](#module-api)
- [Database Schema](#database-schema)
- [Workflows](#workflows)
  - [BranchWorkflow](#branchworkflow)
- [Validation Schemas](#validation-schemas)
- [Events](#events)
- [Constants](#constants)

## Overview

The organization module provides one workflow group accessible on the platform instance via `platform.organization.<getter>`.

**Package**: `@aspen-os/organization`
**Dependencies**: `@aspen-os/platform`, `@aspen-os/constants`, `drizzle-orm`, `valibot`
**Module name**: `"organization"`
**Tables**: 1 table, 1 pg enum
**Validation**: Valibot for all input schemas

## Installation

```bash
bun install  # workspace package, no separate install needed
```

## Quick Start

```ts
import { SingleTenantPlatform } from "@aspen-os/platform/server";
import { Organization } from "@aspen-os/organization";

const organization = Organization.create();

const platform = SingleTenantPlatform.create(config, [organization]);

// Access workflows via the module proxy
platform.organization.branches; // BranchWorkflow
```

## Module API

```ts
type OrganizationConfig = {
  country: "INDIA";
};

class Organization {
  static create(config?: OrganizationConfig): Organization;
  readonly $name = "organization";
  readonly $dependencies: readonly string[] = [];

  $initialize(units): void;
  $prepareRuntime(): Promise<void>;
  $cleanup(): Promise<void>;

  // Workflow groups (readonly properties)
  readonly branches: BranchWorkflow;
}
```

## Database Schema

### Enums

| Enum          | Values                                                                       |
| ------------- | ---------------------------------------------------------------------------- |
| `branch_type` | `headquarters`, `office`, `warehouse`, `store`, `factory`, `remote`, `other` |

### Tables

| Table    | Description                                            | Key Columns                                                       |
| -------- | ------------------------------------------------------ | ----------------------------------------------------------------- |
| `branch` | Physical/logical location (hierarchical, max 5 levels) | `id`, `name`, `code` (unique), `type`, `parentBranch`, `capacity` |

All IDs use `id: uuidv7("id").primaryKey()` (the `uuidv7` Drizzle column type imported from `@aspen-os/platform/server`, which generates the UUIDv7 at insert). All timestamps are `TIMESTAMPTZ` with `withTimezone: true`.

## Workflows

All workflow methods are synchronous DB operations that `parse()` input with Valibot before writing. None perform access-control checks -- authorization is expected at the consuming app's RPC layer.

### BranchWorkflow

Manages branches with hierarchical nesting (max 5 levels) and a single-headquarters invariant.

```ts
platform.organization.branches.create(input: CreateBranchInput): Promise<Branch>
platform.organization.branches.update(id: string, patch: UpdateBranchInput): Promise<Branch>
platform.organization.branches.list(filters?: BranchFilters): Promise<Branch[]>
platform.organization.branches.get(id: string): Promise<Branch>
platform.organization.branches.tree(): Promise<BranchTreeNode[]>
```

**Business rules enforced**:

- Single headquarters per organization (workflow-level check).
- Max 5-level hierarchy depth (single ancestor walk).
- Unknown parents rejected; no self-parent; no circular parent references.
- Unique branch codes (case-insensitive, uppercased on insert).
- Country codes validated against ISO 3166-1 alpha-2 at the schema boundary.
- `tree()` returns all branches; orphaned subtrees are promoted to roots instead of dropped.

## Validation Schemas

All input validation uses **Valibot**. Each entity has `Create*Schema`, `Update*Schema`, and `*FiltersSchema` with corresponding `*Input` and `*Filters` types.

Shared validators in `schemas/utils.ts`:

| Validator           | Rules                                                          |
| ------------------- | -------------------------------------------------------------- |
| `NameSchema`        | String, 1-255 chars                                            |
| `BranchCodeSchema`  | String, 2-20 chars, alphanumeric + hyphens (stored uppercase)  |
| `CountryCodeSchema` | String, ISO 3166-1 alpha-2 membership via `isValidCountryCode` |

Schemas are co-exported with their inferred types:

```ts
import type { CreateBranchInput, UpdateBranchInput } from "@aspen-os/organization";
import { CreateBranchSchema, UpdateBranchSchema } from "@aspen-os/organization";
```

## Events

The event map defines 2 branch events. These are **type-level contracts**; every command workflow publishes exactly one event.

### Branch Events

| Event            | Payload                                                      |
| ---------------- | ------------------------------------------------------------ |
| `branch:created` | `{ branch: { code, id, name, type } }`                       |
| `branch:updated` | `{ branch: { id, name }; changes: Record<string, unknown> }` |

## Constants

Shared constants live in `@aspen-os/constants` (not in this package):

| Constant      | Type              | Values                                                                       |
| ------------- | ----------------- | ---------------------------------------------------------------------------- |
| `BRANCH_TYPE` | `as const` object | `FACTORY`, `HEADQUARTERS`, `OFFICE`, `OTHER`, `REMOTE`, `STORE`, `WAREHOUSE` |

All constant keys are `UPPER_SNAKE`, values are lowercase strings. Types are derived via indexed access: `type BranchType = (typeof BRANCH_TYPE)[keyof typeof BRANCH_TYPE]`.

## Package Structure

```
packages/organization/
  src/
    index.ts              # Organization class + type re-exports
    module.ts             # Module class (implements Module)
    auth.ts               # defineAcl() ACL declaration
    pubsub.ts             # Event constants + typed event interfaces + EventMap type
    types.ts              # Type re-exports + BranchTreeNode interface
    db-schemas/           # branch.ts + index.ts
    schemas/
      index.ts            # Barrel re-exports
      enums.ts            # Valibot enum schema (branch type)
      utils.ts            # Shared validators (name, code, country)
      branch.ts           # Create/Update/Filters schemas
    workflows/
      branch/             # Branch workflows (hierarchy enforcement, tree)
      utils.ts            # Shared helpers (hierarchy walk, tree)
```
