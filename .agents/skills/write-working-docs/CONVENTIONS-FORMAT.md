# Conventions Format

`CODING_CONVENTIONS.md` has exactly three sections, in this order. Never add a fourth; put every code fact in exactly one section. Two language laws bind all prose: **imperatives, not suggestions**, and **negative rules** (forbidden patterns named explicitly, paired with what to do instead).

## Section 1 — Tech stack

What the project runs on and how dependencies resolve. Static inventory, no judgement calls.

Contents:

- Runtime, package manager, language + module system (Bun, Bun workspaces, TypeScript ESM-only `"type": "module"`).
- Workspace layout: build-step packages, workspace catalog, `workspace:*` vs `catalog:` vs pinned deps.
- Config files and their effective settings: `tsconfig.json`, `bunfig.toml`, `.oxlintrc.json`, `.oxfmtrc.json`, `.gitignore`, build script → `.output/`.

Write as statements, not rules: "Runtime: Bun (not Node.js)." "Language: TypeScript, ESM only (`"type": "module"`)."

## Section 2 — Tool-enforced rules (TypeScript, lint, format)

Rules the toolchain enforces mechanically — break one and `check:lint` or `check:types` fails. State the rule and name the tool that enforces it. Because the tool is the enforcer, this section needs no negative rules: the failing check is the guardrail.

Contents:

- **tsconfig-enforced**: `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax` (use `import type` for type-only imports), `noFallthroughCasesInSwitch`, `noImplicitOverride`, `noUnusedLocals`.
- **oxlint-enforced**: `correctness` errors, anti-slop plugin rules, banned patterns.
- **oxfmt-enforced**: import sorting, Tailwind class sorting.

Never list a rule here that the tools do not actually enforce. Test it: write the violation, run the check, confirm it fails, revert.

## Section 3 — Hand-enforced conventions

Conventions the toolchain cannot catch — the meat, and where all imperatives and negative rules live. Every item is an imperative or prohibition, never a suggestion.

Contents (each written as prescriptive rules):

- **Naming** — files `kebab-case`; classes `PascalCase`; constants `UPPER_SNAKE_CASE`; DB tables/columns `snake_case` (camelCase in TS); event topics `domain:event_name`; `$` lifecycle prefixes; `#` private fields.
- **Database** — `text` + `uuidv7()` IDs (never native UUID columns); always `timestamp(... { withTimezone: true })`; `pgEnum` lowercase values; indexes `idx_<table>_<column>`; `pushSchema()`, never migration files.
- **Module shape** — `Module` interface, lifecycle order, stateless vs runtime-wired, file layout (`module.ts`, `auth.ts`, `pubsub.ts`, `db-schemas/`, `schemas/`, `workflows/`).
- **Validation** — Valibot for all domain input; Zod only for oRPC procedure inputs and environment variables.
- **Events** — constants `UPPER_SNAKE` keys, `"domain:event_name"` format, `EventMap` types.
- **Workflows** — builder API, one action per file under REST-style folders, idempotent steps.
- **Auth** — better-auth + ACL via `defineAcl`; `remove`, never `delete`, in the REST API.
- **PubSub** — lazy boss; every produced topic needs a subscriber (silent-drop pitfall).
- **Build/ops** — build gotcha (`.output/` exports), commands, per-package typecheck.

### Negative rules

State forbidden patterns by name. In this repo the banned set includes:

- Never use native UUID columns — use `text` + `.$defaultFn(uuidv7)`.
- Never use `sql\`uuidv7()\``— use the exported`uuidv7` function.
- Never use migration files — use `pushSchema()`.
- Never create `Result<T, E>` / `PaginatedResult` types.
- No barrel files (except module-internal aggregates).
- No `delete` in the auth REST API — use `remove`.
- Do not recreate a `drive` package or a parallel file/tag/share/trash model — `dms` is the single surface.
- Do not add a second `task_reminder` surface — `calendar` owns reminders.
- Do not add an overloaded `run()` signature.

Pair each prohibition with the positive alternative in the same sentence: "Never use native UUID columns — use `text` w/ `.$defaultFn(uuidv7)`."

### Maintenance

- A rule that the toolchain starts enforcing moves from Section 3 to Section 2; a rule that stops being enforced moves down to Section 3.
- `update-working-docs` keeps the file **true and tight**; `write-working-docs` fixes the structure and language. Keep the `Naming summary` table in sync when a naming convention changes.
