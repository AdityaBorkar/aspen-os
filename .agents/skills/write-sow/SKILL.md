# Skill: write-sow

A **Scope of Work (SOW)** is the design record that pins a chunk of platform work — decisions, current-state inventory, target model, phases — **before any code**. It lives in `.working-docs/sow/<name>.md` (kebab-case; a capability inside a module names both, e.g. `hr-announcements.md`, a consolidation appends the angle, e.g. `dms-consolidation.md`). The SOW is the single source of truth for the implementation: the phase plan, the acceptance criteria, and the domain-doc updates (`.working-docs/domain-model/` + `bounded-contexts/`) all derive from it. House templates to read before writing — `sow/masters.md` and `sow/workspace.md` (new module), `sow/hr-announcements.md` (in-module capability), `sow/dms-consolidation.md` (consolidation), `sow/notes.md` (new module + removal in one).

Every SOW follows one **shape**: nine sections in a fixed order. The variant of the work changes what those sections hold, never the order.

1. **Title + preamble** — `# \`@aspen-os/<name>\` Module — <Capability> (Scope of Work)`; a blockquote stating the work, then the **Status** line (`> **Status — as of <Month Year>:** Not started. This SOW is the design record; no code exists yet.`— rewritten to`Complete` once the phases land).
2. **Confirmed Decisions** — numbered table (`# | Decision | Outcome`, plus `Status` when executed); every fork the work forces is pinned here or in Open Decisions.
3. **§1 Current State & Inventory** — what exists today (tables, workflow groups, events, ACL, consumers), terminology collisions, and the **baseline** sweep of names that must be free.
4. **§2 Target Model** — tables (columns/types/indexes/pgEnums), module surface (`p.<name>.*`), events, ACL, workflows, invariants.
5. **Phases 0–N** — numbered, ordered, each ending on a **gate**.
6. **Open Decisions** — every unresolved fork, **recommendation first**.
7. **Deployment Notes** — the host app's migration burden.
8. **Effort Estimate (Relative)** — table of areas × Low/Medium/High.
9. **Out of Scope** — the tempting extensions this SOW refuses.

## Variants

| Variant                  | What §1 carries                                                                                                              | Phase sequencing                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **New module**           | Precedent inventory + free-name sweep (workspace.md §1.1–1.3)                                                                | Scaffold phases via the `write-module` skill (Phase 0 constants → Phase 1 scaffold → entities → workflows) |
| **In-module capability** | Host module's existing surfaces + prerequisites; adds Dependencies & Prerequisites, Cross-Module Integrations, RBAC sections | Capability-sequenced (hr-announcements: authoring → scheduling → targeting depth)                          |
| **Consolidation**        | Redundancy inventory — the same thing modeled twice (dms-consolidation.md §1)                                                | Merge phases, one per duplicated surface                                                                   |
| **Removal**              | Removal inventory + consumers                                                                                                | Delete surface → strip references → migration mapping                                                      |

A SOW can mix variants (notes.md = new module + removal from masters).

## Step 1 — Scope the work

Read the domain model first: `DOMAIN_MODEL.md`, `BOUNDED_CONTEXTS.md`, `CONTEXT.md`, and `domain-model/<pkg>.md` + `bounded-contexts/<pkg>.md` for every package the work touches. Scan `sow/` for the work's **lineage** — which prior SOW this one supersedes, splits, or extends (masters.md supersedes organization.md's address/connection surface; the superseded SOW stays as the historical record). Choose the variant. Write the title, preamble, and Status line.

**Completion**: the title names the deliverable and its variant; every touched package has been read in both domain-doc trees; the lineage against `sow/` is identified; no code fact is asserted yet.

## Step 2 — Inventory the current state

For each package in scope, establish ground truth by grep, not memory: tables (`db-schemas/`), workflow groups (`workflows/index.ts`), events (`pubsub.ts`), ACL (`auth.ts`), `$dependencies`, and every consumer repo-wide (imports, topic names, `p.<module>` accessors). Write §1: current tables + surfaces, the consumers each moved or renamed thing has, terminology collisions (workspace.md §1.2 — e.g. a new term that collides with a domain-language "avoid" entry), and the **baseline** — the exact sweep of names (table names, topics, accessors) the target model must not collide with.

**Completion**: every table, workflow group, event, ACL resource, and consumer the work touches appears in §1 with grep evidence; the baseline names every table, topic, and accessor the target model will introduce.

## Step 3 — Pin the decisions

Write the Confirmed Decisions table. **Model-first**: a decision that touches the domain — new entity, new term, changed invariant, moved surface — names the `domain-model/<pkg>.md` and `bounded-contexts/<pkg>.md` updates it implies. A fork the work doesn't resolve goes to **Open Decisions** with a recommendation, not the table. Decisions are terse and specific, each with a definite outcome (masters.md rows 1–10, workspace.md rows 1–12).

**Completion**: every fork the work forces is either pinned in the table or listed in Open Decisions recommendation-first; every domain-touching decision names the domain-doc updates it implies.

## Step 4 — Model the target

Write §2. Tables per `DOMAIN_MODEL.md` conventions (text `uuidv7` PKs, timestamptz, snake_case, soft FKs); module surface `p.<name>.*` with every group and verb; events `<module>:*` with payload shapes; ACL resources; workflow files (one per action, REST-style folders). Respect the per-context invariants, number new invariants continuously, and hold the **ubiquitous language** — a new term or a collision is flagged in §1 and defined in the domain docs. Keep the shape house-tight: masters.md §2.1–2.5 and workspace.md §2.1–2.6 are the density to match.

**Completion**: every table/column/group/event/ACL resource is listed; naming and conventions match the domain model; new invariants are numbered; no term is left undefined or un-flagged.

## Step 5 — Sequence the phases

Write Phases 0–N in dependency order, each a numbered step list ending on a **gate** — the package's `check:lint` + `check:types` + `build`, root `check:lint` + `check:types` at integration phases, the docs build in the final phase. House order: Phase 0 constants & enums (re-run the §1 baseline), Phase 1 scaffold (new modules load the `write-module` skill; root `tsconfig.json` reference + `docs/source.config.ts` entry), middle phases per the variant's sequencing (Step 1's table), final phase docs & verification — package docs via the `write-docs` skill, domain-doc updates, `CONTEXT.md`, `AGENTS.md`, then **sweep greps return clean** and the acceptance criteria.

**Completion**: every phase ends on a gate; no phase depends on a later phase; the final phase contains the sweep greps and acceptance criteria.

## Step 6 — Surround the core

Write the closing sections, in shape order. **Open Decisions** — every unresolved fork, **recommendation first**, the recommended default stated before its alternative. **Deployment Notes** — the host app's burden: `pushSchema` (ADR 0004) never drops tables/columns, so every merged-away or removed table is a host `DROP` after data mapping; pg-boss **silently drops** topics with no consumer, so every produced-only topic is a host-subscription requirement. **Effort Estimate** — areas × complexity, relative, with a one-line note each. **Out of Scope** — every tempting extension, phrased as a refusal with its reason or its future home.

**Completion**: all four sections present in shape order; every open decision has a recommended default; deployment notes flag every drop/migration/pubsub risk; out-of-scope covers the extensions the work invites.

## Step 7 — Make it clean

Re-run the §1 baseline sweeps — they must come back **clean** (every name the target model introduces is still free). Re-read the SOW against the domain model and the prior SOWs: no term contradicts the **ubiquitous language**, every domain-doc update the decisions named is actually listed in a phase, and the Status line and lineage hold.

**Completion**: all baseline greps return clean; no claim contradicts the domain model or a prior SOW; the SOW is the single source of truth for the work — every decision, phase, and acceptance criterion needed to build it is in this one file.
