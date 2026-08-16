# `@aspen-os/dms` — Pins Removal (Scope of Work)

> Scope of Work to **remove the pin surface from `@aspen-os/dms`** (`dms_pin` table + `dms_pin_item_type` pgEnum, `p.dms.pins` workflow group, the `pin` ACL resource, pin schemas/types/constants, and the purge cascade) — sidebar pins are the **`@aspen-os/workspace`** module's responsibility (`p.workspace.pins`). To keep the removal behavior-preserving, the workspace pin `itemType` is widened so dms items (triage, file views, classes) stay pinnable, and hosts migrate `dms_pin` rows 1:1 into `workspace_pin`.

> **Status — as of Aug 2026:** Not started. This SOW is the design record; no code exists yet.

## Confirmed Decisions

| #   | Decision             | Outcome                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Removal scope        | Delete the **entire** dms pin surface: `dms_pin` table + `dms_pin_item_type` pgEnum, `workflows/pin/{create,delete,list,shared}.ts`, the `pins` workflow group + `module.ts` accessor, the `pin` ACL resource, `PIN_ITEM_TYPE`/`PinItemType` constants, `PinItemTypeSchema`, `DmsPin`/`NewDmsPin` types, `db-schemas/pin.ts`, and the `deleteFilePermanently` pin cascade. DMS goes 15 → 14 tables, 19 → 18 workflow groups, 12 → 11 ACL resources.                                                        |
| 2   | Continuity           | **No behavior loss** (house rule, cf. `sow/dms-consolidation.md`): triage/file-view/class items stay pinnable through `p.workspace.pins`. Hosts migrate `dms_pin` rows 1:1 into `workspace_pin` (same `userId`/`itemType`/`itemId`/`sortOrder`/`createdAt`; `id` carried over). Item type strings are unchanged (`triage`, `file_view`, `class`) — the migration is a straight INSERT…SELECT.                                                                                                              |
| 3   | Workspace coverage   | `workspace_pin.item_type` is widened to accept the dms item types so the migration in decision 2 is representable. Mechanism per **Open Decision 1** (recommended: free-form text + documented registry — workspace keeps `$dependencies = []` and never imports dms). Implies `domain-model/workspace.md` + `bounded-contexts/workspace.md` updates (Pin definition, invariant).                                                                                                                          |
| 4   | Stale-pin lifecycle  | dms no longer owns pin rows, so purge/class-archive/file-view-delete **stop cascading pins in-module**. Stale-pin cleanup moves to the host via the existing dms events (`dms:file_purged`, `dms:file_view_deleted`, `dms:class_archived`) → `p.workspace.pins.delete`. Per **Open Decision 2** (recommended: host subscription; dms stays dependency-free).                                                                                                                                               |
| 5   | No new dms events    | dms pins have **no events today** (`dms:pin_*` topics do not exist — grep-verified). The removal adds none; the `DmsEventMap` (33 events, 7 maps) is unchanged. Workspace's `workspace:pin_created`/`workspace:pin_removed` remain the pin events.                                                                                                                                                                                                                                                         |
| 6   | No module dependency | dms stays `$dependencies = []`; **no dms → workspace import**. Pins reference dms items by `(itemType, itemId)` only (soft FK), the same way workspace pins already reference workspace entities and notes/calendar reference pins/recent "with no code coupling".                                                                                                                                                                                                                                         |
| 7   | Terminology          | **Pin (workspace)** is the single pin concept. The dms domain-language **Pin** supporting-entity entry is removed; the workspace Pin entry changes from "any workspace entity (`draft`/`view`/`dashboard`)" to a documented cross-module item-type registry (§2.3). Updates: `domain-model/dms.md`, `bounded-contexts/dms.md`, `domain-model/workspace.md`, `bounded-contexts/workspace.md`, `CONTEXT.md` (Triage, File View, Pin (workspace) entries, DMS summary).                                       |
| 8   | Domain-doc updates   | All packages in scope get their `domain-model/` + `bounded-contexts/` files updated (see Phase 3); `DOMAIN_MODEL.md` table-inventory row (DMS 15 → 14), `BOUNDED_CONTEXTS.md` context-map (DMS row: 15 tables → 14; `bounded-contexts/dms.md` group/table/ACL counts), `CONTEXT.md` (DMS domain glossary + Implemented summary), `AGENTS.md` (dms `15 dms_*` → 14). `sow/dms-consolidation.md` decision 10 and `sow/workspace.md` §1.1 `dms_pin` precedent stay as **historical records** (not rewritten). |

---

## 1. Current State & Inventory

### 1.1 DMS pin surface today

- **Table** `dms_pin` (`src/db-schemas/pin.ts`, tenant schema): `id` (uuidv7 PK), `userId`, `itemType` (enum `dms_pin_item_type`: `triage`/`file_view`/`class`), `itemId`, `sortOrder` (default 0), `createdAt`. Indexes `idx_dms_pin_user` (userId), unique `idx_dms_pin_user_item` (userId, itemType, itemId). Types `DmsPin`/`NewDmsPin`.
- **Enum** `dms_pin_item_type` — values from `PIN_ITEM_TYPE` in `src/utils/constants.ts` (`CLASS`/`FILE_VIEW`/`TRIAGE`); `PinItemTypeSchema` in `src/schemas/enums.ts`; re-exported through `schemas/index.ts` + `types.ts`.
- **Workflows** `src/workflows/pin/{create,delete,list,shared}.ts`:
  - `dms.pin.create` — idempotent insert (returns existing row on `(userId, itemType, itemId)` conflict); audit write `UPDATED` with `auditEntityType(itemType)` mapping `triage→dms:file`, `class→dms:class`, `file_view→dms:file_view`.
  - `dms.pin.delete` — composite-key delete by `(userId, itemType, itemId)`; audit `DELETED`.
  - `dms.pin.list` — all pins for a `userId`, ordered by `sortOrder`. (No actor scoping — `userId` is explicit input on all three.)
- **Group** `pins = { create, delete, list }` in `src/workflows/index.ts` (imports at lines 60–62, group at 182–186); `module.ts` accessor `readonly pins = wf.pins`.
- **ACL** `pin: ["create", "delete", "read"]` in `src/auth.ts` (line 12).
- **Purge cascade** `src/services/purge-service.ts` — `deleteFilePermanently` deletes `dmsPin` rows where `itemId = fileId` (line 126; covers triage pins on the purged file) and its doc comment lists pins among the cascade (line 89).
- **grep evidence** — `dms_pin`/`dmsPin`/`DmsPin` appear **only** in `packages/dms/src` (`db-schemas/pin.ts`, `db-schemas/index.ts`, `types.ts`, `workflows/pin/*`, `purge-service.ts`). No in-repo host app imports them.

### 1.2 Consumers of the dms pin surface

| Location                                                               | Reference                                                                                                                                        | Change needed                                            |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| `packages/dms/src` (all files in §1.1)                                 | table, enum, workflows, group, ACL, constants, schemas, types, purge cascade                                                                     | Delete / strip (Phase 1)                                 |
| `packages/dms/docs/{overview,access-control,db-schemas,workflows}.mdx` | table list, purge prose, `pins` group rows, `dms_pin` section, `dms_pin_item_type` enum, relationships, `p.dms.pins.*` example                   | Rewrite (Phase 3)                                        |
| `CONTEXT.md`                                                           | Triage entry ("Can be pinned to the sidebar"), File View entry ("Pinned via `dms_pin`"), DMS summary ("file views, pins"), Pin (workspace) entry | Rewrite (Phase 3)                                        |
| `.working-docs/domain-model/dms.md`                                    | ERD Pin box, supporting-entity **Pin** entry, "List pins" query row                                                                              | Remove (Phase 3)                                         |
| `.working-docs/bounded-contexts/dms.md`                                | groups list (`pins`), tables list (`dms_pin`), ACL list (`pin`), exposed surface `p.dms.pins`                                                    | Remove (Phase 3)                                         |
| `.working-docs/DOMAIN_MODEL.md` / `BOUNDED_CONTEXTS.md`                | DMS table-inventory row (15) / context-map row (15 tables)                                                                                       | 15 → 14 (Phase 3)                                        |
| `AGENTS.md`                                                            | dms current-state line "15 dms_* tables"                                                                                                         | 15 → 14 (Phase 3)                                        |
| `docs/.output/**`                                                      | built site assets quoting `dms_pin` / `p.dms.pins`                                                                                               | **Not edited** — regenerated by the docs build (Phase 3) |

No `dms:pin_*` pubsub topics exist (grep-verified in `src/pubsub.ts`); no repo-wide consumer outside `packages/dms` touches the surface. `sow/dms.md` §7 (original sidebar-pins design) and `sow/dms-consolidation.md` decision 10 (pins consolidated onto `dms_pin`) are historical records and stay as-is.

### 1.3 Workspace pin surface today

- **Table** `workspace_pin` (`src/db-schemas/pin.ts`): `id` (uuidv7 PK), `userId`, `itemType` (enum `workspace_item_type`: `draft`/`view`/`dashboard`), `itemId`, `sortOrder`, `createdAt`. Indexes `idx_workspace_pin_user` + unique `idx_workspace_pin_user_item`. Types `WorkspacePin`/`NewWorkspacePin`.
- **Enum** `workspace_item_type` (`src/db-schemas/enums.ts`) — **shared by `workspace_pin`, `workspace_recent`, `workspace_watch`** (all three use `WorkspaceItemTypeSchema` in `schemas/{pin,recent,watch}.ts`). Value source: `WORKSPACE_ITEM_TYPE` in `utils/constants.ts` (`DRAFT`/`VIEW`/`DASHBOARD`).
- **Workflows** `src/workflows/pin/{create,delete,list,shared}.ts`:
  - `workspace.pin.create` — actor-scoped (`resolveActorId(ctx.actorId, input.userId)`), idempotent, audit `PINNED` (`auditEntityType` maps `draft→workspace:draft`, `view→workspace:view`, else `workspace:dashboard`), publishes `workspace:pin_created` `{ userId, itemType, itemId }`.
  - `workspace.pin.delete` — by pin **id** (not composite), owner-only, audit `UNPINNED`, publishes `workspace:pin_removed`.
  - `workspace.pin.list` — actor-scoped, optional `itemType` filter, ordered by `sortOrder`.
- **Surface** `p.workspace.pins { create, delete, list }`; ACL `pin: ["create", "read", "delete"]`; events `PIN_EVENTS.CREATED/REMOVED` (`workspace:pin_created`/`pin_removed`). `$dependencies = []`, `domain` is opaque free-form text (workspace invariant 6).

### 1.4 Overlap & terminology

- **Two pin surfaces, one concept**: `dms_pin` (item types `triage`/`file_view`/`class`) and `workspace_pin` (item types `draft`/`view`/`dashboard`) are the same sidebar-shortcut mechanism modeled twice. The house direction is **workspace is the utility surface** (`sow/workspace.md` §1.1 calls `dms_pin` the "precedent"; notes and calendar SOWs document pins/recent as the cross-module link surface — "linkable from workspace pins/recent. No code coupling").
- **Terminology collision**: workspace `Pin` is currently defined as "a user's sidebar shortcut to **any workspace entity**" (`domain-model/workspace.md` terminology; `CONTEXT.md` Pin (workspace) "any workspace entity (`draft`/`view`/`dashboard`)"). After this SOW it is the shortcut to **any tenant item** via the item-type registry (§2.3) — the definition changes, which is a domain-language update, not a contradiction.
- **Name collision on `view`**: workspace item type `view` vs dms item type `file_view` are distinct strings today and stay distinct (the registry keeps both). No re-term of dms `file_view` (that was dms-consolidation's decision 9, historical).
- **Audit mapping**: dms's `auditEntityType` (`triage→dms:file`, `class→dms:class`, `file_view→dms:file_view`) is exactly the mapping workspace must adopt for dms item types (workspace's own `auditEntityType` currently only knows its three).

### 1.5 Baseline greps (must be clean at the end of Phase 3)

- Inside `packages/dms` (src): `dmsPin`, `dms_pin`, `DmsPin`, `NewDmsPin`, `PinItemType`, `PIN_ITEM_TYPE`, `PinItemTypeSchema`, `workflows/pin`, `pins` group, `pins =`, `readonly pins`, `"pin"` ACL resource.
- Repo-wide (excluding `docs/.output/**`, `node_modules`, `.output`, `codedb.snapshot`): `p.dms.pins`, `dms_pin`, `dmsPin`, `dms:pin`, `dms_pin_item_type`.
- `.working-docs` + `CONTEXT.md` + `AGENTS.md`: `dms_pin`/`dms.pins` must appear **only** in historical SOW records (`sow/dms.md` §7, `sow/dms-consolidation.md` decision 10, `sow/workspace.md` §1.1) and in the migration notes of this SOW.
- Names the target model introduces and must keep free: none (no new tables/topics/accessors are added — `workspace_pin`, `p.workspace.pins`, `workspace:pin_*` already exist).

---

## 2. Target Model

### 2.1 DMS after removal (14 tables, 18 workflow groups, 11 ACL resources)

Tables (tenant, `dms_` prefix): `dms_folder`, `dms_file`, `dms_file_version`, `dms_class`, `dms_class_field`, `dms_entity_label`, `dms_label`, `dms_file_view`, `dms_contact`, `dms_share`, `dms_public_link`, `dms_legal_hold`, `dms_access_log`, `dms_setting`. **Dropped:** `dms_pin`, `dms_pin_item_type`.

Workflow groups: `access`, `activity`, `archive`, `classes`, `contacts`, `fileViews`, `files`, `folders`, `holds`, `labels`, `paths`, `search`, `settings`, `shares`, `storage`, `trash`, `triage`, `versions`. **Dropped:** `pins`.

ACL resources: `class`, `classField`, `contact`, `file`, `fileView`, `folder`, `label`, `legalHold`, `publicLink`, `setting`, `share`. **Dropped:** `pin`.

`purge-service.ts` `deleteFilePermanently` cascade: version rows, entity labels, shares, public links, legal holds, file row — **no pin delete** (line 126 removed); the doc comment drops "pins". `DmsEventMap` unchanged (33 events, 7 maps). `$dependencies = []` unchanged.

### 2.2 Workspace pins after the itemType change (per Open Decision 1 — recommended: free-form text)

`workspace_pin.item_type` becomes `text` (recommended) holding the item-type registry values; the `workspace_pin` workflows, unique index, `sortOrder`, and actor scoping are unchanged. `workspace_pin` keeps sharing the `workspace_item_type` enum **only if Open Decision 1 resolves to the enum-widen alternative** — under the recommended option the pin column and `schemas/pin.ts` (`PinItemInputSchema`/`ListPinsSchema`) move off the enum, and `workflows/pin/shared.ts` `auditEntityType` gains the dms mappings:

| itemType    | audit entity type     |
| ----------- | --------------------- |
| `draft`     | `workspace:draft`     |
| `view`      | `workspace:view`      |
| `dashboard` | `workspace:dashboard` |
| `triage`    | `dms:file`            |
| `file_view` | `dms:file_view`       |
| `class`     | `dms:class`           |

`workspace_recent`/`workspace_watch` are **unchanged** in this SOW (they keep the enum for now; a follow-up may adopt the same registry pattern). Surface `p.workspace.pins { create, delete, list }`, ACL `pin: ["create","read","delete"]`, events `workspace:pin_created`/`workspace:pin_removed` unchanged.

### 2.3 Item-type registry (documented, not enforced — mirrors `VIEW_DOMAIN`)

A `PIN_ITEM_TYPE` constant added to workspace `utils/constants.ts` (documentation + typing, `as const`), the documented registry for pin `itemType`:

```
draft / view / dashboard        # workspace entities (existing)
triage / file_view / class      # dms items (migrated 1:1)
```

New modules adopt namespaced strings (`<module>:<entity>`, e.g. `tasks:task`, `notes:note`) going forward; bare legacy strings stay valid for the migrated rows. This registry is what replaces the "any workspace entity" wording in the workspace domain docs.

### 2.4 Invariants

- **Workspace invariant 13 (new, continuous from the existing 1–12):** Pins are the generic cross-module link surface — `itemType` values come from the documented item-type registry (§2.3), so dms (and any future module) items are pinnable by `(itemType, itemId)` soft reference with **no module dependency**. Under the recommended Open Decision 1 option the column is free-form text like `domain`; under the alternative it is the widened enum — either way the registry governs.
- Workspace invariant 9 (utilities strictly user-scoped, `userId = actorId`) is unchanged and now also governs migrated dms pins.
- DMS invariants (1–13) are unchanged — sidebar pinning was a command surface, not an invariant; its lifecycle rule ("deleting a view, archiving a class, or deleting a document removes stale pins") moves to the host per decision 4 / Open Decision 2.

---

## 3. Phases

### Phase 0 — Baseline verification

1. Re-run every §1.5 baseline grep; capture the dms pin surface inventory (§1.1) as the pre-removal checklist.
2. Confirm no `dms:pin_*` topics and no repo-wide consumers beyond §1.2.
3. Gate: greps match §1 exactly (no surprises).

### Phase 1 — Remove the dms pin surface

1. Delete `src/db-schemas/pin.ts`; remove the `dmsPin` import/export and the `dmsTables` entry in `src/db-schemas/index.ts` (tenant_schemas 15 → 14).
2. Delete `src/workflows/pin/`; remove the `pinItem`/`unpinItem`/`listPins` imports and the `pins` group from `src/workflows/index.ts`; remove `readonly pins = wf.pins` from `src/module.ts`.
3. Remove the `pin` resource from `src/auth.ts` (12 → 11 ACL).
4. Remove `PIN_ITEM_TYPE`/`PinItemType` from `src/utils/constants.ts`, `PinItemTypeSchema` from `src/schemas/enums.ts`, and the `PIN_ITEM_TYPE`/`PinItemTypeSchema` re-exports from `src/schemas/index.ts` and `src/types.ts`; drop the `DmsPin`/`NewDmsPin` type exports from `src/types.ts`.
5. `src/services/purge-service.ts` — remove the `dmsPin` import, the `db.delete(dmsPin)` cascade in `deleteFilePermanently`, and "pins" from the cascade doc comment.
6. Gate: `cd packages/dms && bun run check:lint && bun run check:types && bun run build`.

### Phase 2 — Workspace pin itemType coverage

1. Implement Open Decision 1 (recommended: `workspace_pin.item_type` → `text`; add `PIN_ITEM_TYPE` registry constant; update `schemas/pin.ts` `PinItemInputSchema`/`ListPinsSchema`; extend `workflows/pin/shared.ts` `auditEntityType` per §2.2). Under the alternative, add `triage`/`file_view`/`class` to `WORKSPACE_ITEM_TYPE` + `workspaceItemTypeEnum` instead.
2. Confirm `p.workspace.pins` can create/list/delete dms-typed pins end-to-end (create → `workspace:pin_created` → delete → `workspace:pin_removed`; audit entity types per §2.2).
3. Gate: `cd packages/workspace && bun run check:lint && bun run check:types && bun run build`; root `bun run check:lint` && `bun run check:types`.

### Phase 3 — Documentation & Verification

1. **Package docs** (via the `write-docs` skill): `packages/dms/docs/` — drop `dms_pin` from `db-schemas.mdx` (+ the `dms_pin_item_type` enum row and the file-view/pin relationship line), the `pins` row from `overview.mdx` (+ table list + purge prose), the `pin` resource from `access-control.mdx` (+ "pin … to their sidebar" prose), the `pins` group + example from `workflows.mdx`. `packages/workspace/docs/` — `db-schemas.mdx` (`workspace_pin.item_type` → text + registry), `workflows.mdx`/`overview.mdx` (pins row notes the cross-module registry), `events.mdx` unchanged.
2. **Domain docs**: `.working-docs/domain-model/dms.md` (drop ERD Pin box, supporting-entity Pin, "List pins" query row), `bounded-contexts/dms.md` (groups 19 → 18, tables 15 → 14, ACL 12 → 11, drop `p.dms.pins` from the exposed surface); `.working-docs/domain-model/workspace.md` (Pin terminology → registry, invariant 13), `bounded-contexts/workspace.md` (lineage note — `dms_pin` precedent now consolidated here); `DOMAIN_MODEL.md` DMS row 15 → 14; `BOUNDED_CONTEXTS.md` context-map DMS row (15 tables → 14).
3. `CONTEXT.md` — Triage entry ("Can be pinned via the workspace module"), File View entry ("Pinned via `workspace_pin`, item type `file_view`"), DMS Implemented summary (drop "pins"), Pin (workspace) glossary entry (registry wording). `AGENTS.md` — dms current state "15 dms_* tables" → 14.
4. Docs build: `cd docs && bunx fumadocs-mdx` (if `.source/` missing) then `check:types` + `build`.
5. **Sweep greps return clean** (§1.5) — `dms_pin`/`dmsPin`/`p.dms.pins`/`dms:pin` gone from `packages/dms`, repo src, `CONTEXT.md`, `AGENTS.md`, and current domain docs; remaining hits only in historical SOWs + this SOW's migration notes.
6. **Acceptance criteria**: dms compiles/lints/builds with zero pin references (14 tables, 18 groups, 11 ACL); workspace compiles/lints/builds with dms item types pinnable via `p.workspace.pins`; purge no longer touches pin rows; docs + domain docs describe a single workspace-managed pin surface; §1.5 greps clean.

## 4. Open Decisions (recommendation first)

- **Pin `itemType` mechanism.** **Free-form text + documented `PIN_ITEM_TYPE` registry (Recommended)** — mirrors workspace's `domain`-as-text pattern and the notes/calendar "linkable from workspace pins/recent, no code coupling" promise; no per-module enum growth; host does `ALTER … TYPE text` + `DROP TYPE workspace_item_type` once. Alternative: **widen the `workspace_item_type` enum** with `triage`/`file_view`/`class` — type-safe and zero host DDL (`pushSchema` issues `ALTER TYPE ADD VALUE`), but hard-couples workspace vocabulary to dms and the enum grows again for tasks/notes/calendar/masters. Either way the §2.2 audit mapping and the registry are identical; the delta is one column type vs. enum values.
- **Stale-pin cleanup on dms purge/archive/delete.** **Host subscription (Recommended)** — dms already publishes `dms:file_purged`, `dms:file_view_deleted`, `dms:class_archived`; the host deletes affected `workspace_pin` rows via `p.workspace.pins.delete` (by id) or a batch delete, keeping both modules dependency-free. Alternative: **no cleanup** (orphaned pin rows are harmless — the sidebar renders a dead shortcut; host prunes periodically). Rejected: dms gains a workspace dependency or a new event — breaks `$dependencies = []` and the no-coupling rule.

## 5. Deployment Notes (host app)

- **`pushSchema` (ADR 0004) never drops tables, columns, or enums.** The host must run, after upgrading both packages: `DROP TABLE dms_pin; DROP TYPE dms_pin_item_type;` (and, under Open Decision 1's recommended option, `ALTER TABLE workspace_pin ALTER COLUMN item_type TYPE text; DROP TYPE workspace_item_type;` after dropping recent/watch usage of it — under the enum-widen alternative only `ALTER TYPE workspace_item_type ADD VALUE` is needed, which pushSchema does itself). No migration tooling ships in this repo.
- **Data migration**: `INSERT INTO workspace_pin (id, created_at, item_id, item_type, sort_order, user_id) SELECT id, created_at, item_id, item_type, sort_order, user_id FROM dms_pin;` — must run before `DROP TABLE dms_pin`, and (recommended option) the item_type column must already be `text`. Item type strings are unchanged.
- **Surface change for pin callers**: `p.dms.pins.create({ itemId, itemType, userId })` → `p.workspace.pins.create({ input: { itemId, itemType } })` (userId = actor); `p.dms.pins.delete({ itemId, itemType, userId })` → `p.workspace.pins.delete({ input: { id } })` (composite-key delete becomes delete-by-pin-id); `p.dms.pins.list({ userId })` → `p.workspace.pins.list({ input: {} })` (always the actor's pins). Hosts must re-point sidebar logic at `p.workspace.pins` and subscribe to `workspace:pin_created`/`workspace:pin_removed` if they consume pin events.
- **Stale pins**: after the move, purging a file/archiving a class/deleting a file view **no longer removes pin rows** (decision 4). Hosts that relied on the dms cascade should subscribe to `dms:file_purged`/`dms:file_view_deleted`/`dms:class_archived` and clean `workspace_pin`.
- **pg-boss**: no new topics are introduced. `workspace:pin_created`/`workspace:pin_removed` are produced-only when the host doesn't subscribe — pg-boss silently drops them (platform health check flags produced-but-unsubscribed topics). No `dms:pin_*` topics existed or are added.

## 6. Effort Estimate (Relative)

| Area                                                          | Complexity | Notes                                                                 |
| ------------------------------------------------------------- | ---------- | --------------------------------------------------------------------- |
| dms pin surface removal (table, workflows, ACL, types, purge) | Low        | Deletion + mechanical reference strip; no logic beyond the purge line |
| Workspace itemType coverage (text column + registry + audit)  | Low–Medium | Column/schema change + audit mapping + docs wording                   |
| Docs + verification                                           | Medium     | dms + workspace docs, domain docs, CONTEXT/AGENTS, grep sweeps, build |

## 7. Out of Scope

- **No re-introduction of pins into dms** — the `pins` group does not come back; sidebar pinning is exclusively `p.workspace.pins`.
- **No recent/watch registry migration** — `workspace_recent`/`workspace_watch` keep the `workspace_item_type` enum; adopting the registry for them is a follow-up.
- **No pins for other modules** — tasks/notes/calendar/masters item types are _enabled_ by the registry but not added, wired, or documented as pinnable here.
- **No pin-ordering or pin-surface API changes** — `sortOrder` semantics and the `create/delete/list` surface are unchanged from today's workspace pins.
- **No module dependency changes** — dms and workspace both stay `$dependencies = []`; this SOW refuses any cross-module import or new event as the cleanup mechanism.
- **No host app / example and no test infrastructure** — quality gates remain `check:lint`/`check:types`/`build` per package.
