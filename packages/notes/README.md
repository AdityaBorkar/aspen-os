# @aspen-os/notes

A domain module for the Aspen OS framework that owns the first-class **note** entity: `personal`/`global` access, optional polymorphic scope and type.

## Overview

Notes carry an optional `title` (quick-capture allowed) and a required `body`, plus `type` (`NOTE_TYPE`), `access` (`personal`/`global`, default `personal`), `ownerId`, `tags`, opaque `metadata`, and an optional `(scopeType, scopeId)` polymorphic scope where `scopeType` is a documented `<module>:<entity>` registry value (e.g. `masters:contact`, `tasks:task`). Access is enforced via `services/access-service.ts` (read = `global` OR owner; mutate = owner or tenant admin).

The module replaces the note concept that used to live in `@aspen-os/masters` (`master_note`, `p.masters.notes`, `masters:note_added`/`note_removed`). The annotation use-case survives via `scopeType`/`scopeId`.

**Package**: `@aspen-os/notes`
**Module name**: `"notes"`
**Tables**: 1 tenant table (`note`)
**Validation**: Valibot for all input schemas

## Workflow groups

```ts
platform.notes.notes; // create, delete, get, list, update
```

`create` derives `ownerId` from `actorId` (explicit `ownerId` wins) and defaults `access` to `personal`. `list` is access-scoped with `scopeType`/`scopeId`, `type`, `tags` (any-match), and `search` (title/body `ilike`) filters.

## Quick Start

```ts
import { SingleTenantPlatform } from "@aspen-os/platform/server";
import { Notes } from "@aspen-os/notes";

const notes = Notes.create();

const platform = SingleTenantPlatform.create(config, [notes]);

await platform.prepare();

// Quick-capture note
await platform.notes.notes.create({
  input: { title: "Call notes", body: "Follow up on pricing", type: "call" },
});

// Scoped annotation note
await platform.notes.notes.create({
  input: {
    body: "Waiting on legal review",
    scopeType: "masters:contact",
    scopeId: contactId,
    access: "global",
  },
});
```

See the Fumadocs pages (`packages/notes/docs/`) for the full reference.
