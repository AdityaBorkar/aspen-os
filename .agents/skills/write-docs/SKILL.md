---
name: write-docs
description: Write lean MDX documentation — Use when the user asks to write or revise docs, document a module/unit/API, or create guides and overviews.
---

A lean doc earns every line. **Lean** means maximum knowledge transfer per word — no sentence that restates what the adjacent code block shows, no paragraph the reader could skip and lose nothing. The source code is the truth; the doc is the map.

Documentation follows [Diátaxis](https://diataxis.fr) — four doc types, each with a distinct purpose and structure. Classify first; the type determines the structure.

## Step 1 — Classify and extract

Read the source code, not existing docs. Determine the doc type:

| Type | When | Structure |
|---|---|---|
| **Reference** | Documenting an API surface (unit, workflow, service) | [`DOC-TYPES.md`](DOC-TYPES.md) § Reference |
| **Guide** | Step-by-step how-to | [`DOC-TYPES.md`](DOC-TYPES.md) § Guide |
| **Overview** | Architecture, concepts, relationships | [`DOC-TYPES.md`](DOC-TYPES.md) § Overview |
| **Schema** | Tables, events, enums | [`DOC-TYPES.md`](DOC-TYPES.md) § Schema |

Open the type's section in [`DOC-TYPES.md`](DOC-TYPES.md) and follow its structure.

**Completion**: doc type chosen, and every public method, type, table, event, and enum in the source accounted for in your extraction.

## Step 2 — Write the MDX

Apply the conventions below. For the type-specific structure, follow [`DOC-TYPES.md`](DOC-TYPES.md).

### Placement

Docs live in `packages/{package}/docs-www/` as `.mdx` files. Register new pages in the package's `meta.json`:

```json
{
  "pages": [
    "---Section Name---",
    "page-name",
    "subdir/page-name"
  ],
  "pagesIndex": "index",
  "root": true,
  "title": "Package Name",
  "icon": "IconName"
}
```

`---Section---` entries create sidebar separators. New packages must be registered in `documentation/source.config.ts` via `defineDocs({ dir, docs })`.

### Frontmatter

```yaml
---
title: Short Name
description: One sentence — what this documents and for whom.
icon: IconName        # Tabler icon, camelCase (e.g. IconDatabase)
display: Custom Label # optional, overrides sidebar label
---
```

### Components

| Component | Use for |
|---|---|
| `<Callout type="info\|warn">` | Non-obvious caveats, gotchas |
| `<Cards>` + `<Card>` | Navigation links on index pages |
| Code blocks | Always — the source is the truth |

### Code blocks

- Annotate with `title="path"` when showing a real file.
- Use `text` language for diagrams and flows.
- Use `ts`/`json`/`yaml` for real code.
- Inline comments only when the code is non-obvious.

### Tables

Use for structured peer-sets (events, plugins, columns, enums). Keep columns to 3–4.

### Prose

One opening sentence stating what the thing is and does. Then sections. Headings are the transitions — a step heading is immediately followed by its first content block.

**Completion**: every extracted item documented; frontmatter, components, code conventions, and placement applied.

## Step 3 — Lean pass

Run the lean test on every sentence: _does this transfer knowledge the reader couldn't get from the adjacent code?_ Cut what fails. Common failures:

- A sentence before a code block that restates what the code does.
- A sentence after a code block that explains what the code showed.
- An adjective that doesn't change behaviour ("powerful", "flexible", "robust").
- A section that duplicates content from another page.

**Completion**: no sentence fails the lean test; no content duplicated across pages.
