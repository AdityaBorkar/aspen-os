# @aspen-os/masters

A domain module for the Aspen OS framework that owns **polymorphic tenant master data**: contacts, addresses, bank accounts, integration connections, and notes.

## Overview

Every masters entity is scoped to an owner via a `(entityType, entityId)` pair (`master_entity_type`: `organization` | `branch` | `connection` | `contact`). This surface was extracted from `@aspen-os/organization`.

`connection` is an **integration connection** to an external API/entity (not a business relationship). Credentials are stored in the platform `kvStore` and referenced by `credentialRef`; workflows support endpoint `test` and credential `rotateCredential`. Business relationships are `contact` records with a `CONTACT_TYPE`.

**Package**: `@aspen-os/masters`  
**Module name**: `"masters"`  
**Tables**: 5 tenant tables (`master_` prefix)  
**Validation**: Valibot for all input schemas

## Workflow groups

```ts
platform.masters.addresses; // create, delete, get, list, setPrimary, update
platform.masters.bankAccounts; // activate, create, deactivate, delete, get, list, setPrimary, update
platform.masters.connections; // activate, create, deactivate, delete, get, list, rotateCredential, test, update
platform.masters.contacts; // create, delete, get, list, setPrimary, update
platform.masters.notes; // add, list, remove
```

All create/list operations take `entityType` + `entityId` for the polymorphic scope. The `connections` group is bound to the platform `kvStore` unit (management-hybrid getter).

## Quick Start

```ts
import { SingleTenantPlatform } from "@aspen-os/platform/server";
import { Masters } from "@aspen-os/masters";

const masters = Masters.create();

const platform = SingleTenantPlatform.create(config, [masters, organization]);

await platform.prepare();

// Org-scoped insurer contact
await platform.masters.contacts.create({
  input: {
    entityType: "organization",
    entityId: orgId,
    name: "ICICI Lombard",
    type: "insurer",
    email: "claims@icicilombard.com",
  },
});

// Integration connection (credential stored in kvStore)
await platform.masters.connections.create({
  input: {
    entityType: "organization",
    entityId: orgId,
    name: "SeaweedFS Admin API",
    type: "api_key",
    baseUrl: "https://storage.example.com",
    credential: { apiKey: "..." },
  },
});

await platform.masters.connections.test({ id: connectionId });
await platform.masters.connections.rotateCredential({
  id: connectionId,
  credential: { apiKey: "..." },
});
```

See the Fumadocs pages (`packages/masters/docs/`) for the full reference.
