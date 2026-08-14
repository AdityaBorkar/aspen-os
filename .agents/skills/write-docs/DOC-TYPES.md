# Doc Types

Structures for each documentation type, derived from the existing docs in this project. Follow the structure for your classified type.

## Reference

Documenting an API surface — a unit, workflow, or service class.

### Section order

1. **Opening** — one sentence: what the thing is, what it wraps or does
2. **Configuration** — code block of the config type, then a minimal example
3. **Public API** — code block of the class interface (method signatures, return types)
4. **Features** — one H3 per feature, each with a code example showing usage
5. **Events** — table (Event | Payload | Trigger), if the unit publishes events
6. **Schema** — table (Table | Description), if the unit owns database tables
7. **Dependencies** — one sentence on what it depends on and why

### Rules

- Show real signatures, not paraphrases. The code block IS the API.
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
2. **Architecture** — `text` code block diagram showing the structure
3. **Key concepts** — one H2 per concept, each with a brief explanation and code or table
4. **Relationships** — table or diagram showing how parts connect
5. **Callouts** — for non-obvious design decisions

### Rules

- Diagrams use `text` language blocks.
- Tables for structured relationships (dependency graphs, entry surfaces).
- Focus on structure and relationships. Usage examples belong in Guides.

## Schema

Database tables, events, and enums — the reader needs the reference data.

### Section order

1. **Opening** — one sentence with counts (e.g. "7 tables and 5 enums")
2. **Enums** — table (Enum | Table Column | Values)
3. **Tables** — one H3 per table:
   - One sentence on what the table represents
   - Table (Column | Type | Description)
4. **Relationships** — `text` diagram showing foreign keys
5. **Usage** — code examples for publishing/subscribing (events) or querying (tables)

### Rules

- Every column documented, including `created_at`/`updated_at`.
- Foreign keys annotated with `(FK → table)` in the Type column.
- Enum values listed inline in the table.

## Index

Navigation page — the entry point for a package's docs.

### Section order

1. **Opening** — one sentence on what the package provides
2. **Cards** — `<Cards>` sections grouping related `<Card>` links

### Rules

- Each `<Card>` has `title`, `href`, and `description`.
- Group cards under H2 headings by category (Getting Started, Reference, etc.).
- The `meta.json` `pagesIndex` field must point to `index`.
