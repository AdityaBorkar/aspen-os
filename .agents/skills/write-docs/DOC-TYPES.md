# Doc Types

Structures for each documentation type, derived from the existing docs in this project. Follow the structure for your classified type.

## Reference

Domain workflows and operations — the reader wants to call them.

### Section order

1. **Opening** — one sentence: workflow groups and the access key (e.g. `p.masters`)
2. **Scope conventions** — two sentences max: scoping rules (`entityType`/`entityId`), input shape (Valibot create, `{ id, patch }` update), audit/event side effects
3. **Features** — one H3 per group, each with a code example showing usage
4. **Links out** — one line each to the events and schema pages; never duplicated tables

### Rules

- Show real usage, not interface dumps. No `Configuration`, `Public API`, `Dependencies`, `Events`, or `Schema` sections — config/deps live on Overview, events/schema on their own pages.
- Group methods by concern under H3 headings.
- Use `<Callout type="warn">` for behavior that contradicts expectations.

## Guide

Step-by-step how-to — the reader follows along to accomplish something.

### Section order

1. **Opening** — one sentence: what the reader will accomplish
2. **Prerequisites** — bullet list, if any
3. **Steps** — numbered H2 headings (`## Step 1: Title`), each with:
   - What to do (one sentence)
   - Code block showing how
   - One sentence on why, if non-obvious
4. **Key conventions** — table at the end, if the guide introduces conventions

### Rules

- Each step is independently runnable — the reader can copy-paste and it works.
- End with a "Use It" section showing the complete working example.

## Overview

Architecture and concepts — the reader wants to understand, not do.

### Section order

1. **Opening** — one sentence: what the thing is
2. **Module** — code block of the module class (`$name`, `$dependencies`)
3. **Configuration** — code block of the config type, then a minimal example
4. **Dependencies** — module dependencies plus unit bindings (e.g. `kvStore`) and why
5. **Architecture** — `mermaid` diagram showing the structure
6. **Key concepts** — one H2 per concept, each with a brief explanation and code or table
7. **Relationships** — diagram showing how parts connect
8. **Callouts** — for non-obvious design decisions

### Rules

- Diagrams use `mermaid` blocks.
- Tables for structured relationships (dependency graphs, entry surfaces).
- Focus on structure and relationships. Usage examples belong in Reference/Guides.

## Schema

Database tables, events, and enums — the reader needs the reference data.

### Section order

1. **Opening** — one sentence: scope (tenant tables, prefix, shared columns stated once — never per-table, never brittle counts)
2. **Enums** — table (Enum | Values). No "used in" column; the enum name encodes it
3. **Tables** — one H3 per table:
   - One sentence on what the table represents, only if the name doesn't say it
   - Fields table (Column | Type | Description)
   - `Indexes:` line naming every index and its columns
4. **Relationships** — `mermaid` flowchart; one sentence noting soft (logical, workflow-enforced) vs hard FKs
5. **Events** (events pages) — Event Map tables only (Event | Payload | Trigger). No event-constant dumps, no event-map type dumps, no generic publish/subscribe usage

### Rules

- State shared columns (`id`, `created_at`, `updated_at`) once in the opening, not per table.
- Foreign keys annotated with `(FK → table)` in the Type column.
- Enum values listed inline in the table.
- Every table, index, and event verified against source before writing.

## Workflow Steps

Reusable steps composed via `ctx.step.run()` — the reader wants to know what to compose, not reimplement.

### Section order

1. **Opening** — one sentence: how steps are composed (`ctx.step.run()`)
2. **Fetch Steps** — table (Step | Step name | Used by); one factory code block, not one per step
3. **Invariant Steps** — table (Step | Input | Used by) for business-rule steps
4. **Access Helpers** — table (Helper | Rule) for plain-function guards; flag which are async and why

### Rules

- Distinguish `WorkflowStep`s (run via `ctx.step.run`) from plain-function helpers.
- "Used by" lists the consuming workflows — the composition graph, not the implementation.

## Index

Navigation page — the entry point for a package's docs.

### Section order

1. **Opening** — one sentence on what the package provides
2. **Cards** — `<Cards>` sections grouping related `<Card>` links

### Rules

- Each `<Card>` has `title`, `href`, and `description`.
- Group cards under H2 headings by category (Getting Started, Reference, etc.).
- The `meta.json` `pagesIndex` field must point to `index`.
