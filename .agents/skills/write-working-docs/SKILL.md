---
name: write-working-docs
description: Write coding conventions into CODING_CONVENTIONS.md — use when the user asks to write, extend, or rewrite coding conventions, or to extract conventions from the code. Prescriptive, three-section format (tech stack / tool-enforced rules / hand-enforced conventions) with explicit negative rules.
---

The deliverable is `CODING_CONVENTIONS.md`, a prescriptive record of how this codebase is written. The source is the code — grep, never memory or READMEs; the file is the exhaustive home, `AGENTS.md` stays the lean pointer (see `update-working-docs`).

Every convention follows the fixed three-section format in [`CONVENTIONS-FORMAT.md`](CONVENTIONS-FORMAT.md) — tech stack, then tool-enforced rules, then hand-enforced conventions. Two language laws apply throughout: **imperatives, never suggestions** ("Use X, never use Y", not "Prefer X"), and **negative rules** (every forbidden pattern stated by name, paired with what to do instead).

## Step 1 — Extract and classify

Grep the actual code and config — `.oxlintrc.json`, `.oxfmtrc.json`, `tsconfig.json`, `bunfig.toml`, `packages/platform/src/server/`, and one reference module in full (`packages/dms/src/`). Classify each fact:

- **Tech stack** → section 1: runtime, package manager, language, workspace layout, dependency policy, config-file settings.
- **Tool-enforced** → section 2: a rule is tool-enforced only if breaking it fails `check:lint` or `check:types`. Test it when unsure: write the violation, run the check, confirm failure, revert.
- **Everything else** → section 3: naming, database, module shape, validation, events, workflows, auth, pubsub, build gotchas.

**Completion**: every extracted fact assigned to exactly one section; nothing left unclassified.

## Step 2 — Write the three sections

Follow [`CONVENTIONS-FORMAT.md`](CONVENTIONS-FORMAT.md) section by section. Apply the language laws:

- Imperatives: "Use `id: uuidv7(\"id\").primaryKey()`, never native UUID columns." "Always timestamptz." "Never create `Result<T, E>` types."
- Negative rules: state the forbidden pattern explicitly and name the replacement in the same sentence.
- Strip hedges: "Prefer" → "Use", "Should" → "Must", "Consider" → "Always"/"Never", or delete the sentence.
- Keep every convention true to the code — if the code doesn't do it, delete it.

**Completion**: every rule is an imperative or a prohibition; no suggestive phrasing remains.

## Step 3 — Verify

Re-grep the code for each written convention (one miss = one delete or fix). Confirm nothing duplicates `AGENTS.md` content (a shared fact lives here expanded, with `AGENTS.md` pointing at it — never a third variant).

**Completion**: every convention grep-verified against the code; no duplication with `AGENTS.md`; the three-section order intact.
