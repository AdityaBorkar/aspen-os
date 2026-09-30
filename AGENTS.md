# Aspen OS Agent Guide

## Repository Shape

- Bun/TypeScript ESM monorepo. Workspaces per `package.json`: `packages/*`, `examples/*`, `docs`. `examples/` holds only the empty dir `examples/recruiter/seaweedfs-s3.json/` (no manifest, not a build participant, safe to ignore). There is no `website/` directory and no root `README.md`.
- `CONTEXT.md` (ubiquitous language), `.working-docs/` (`domain-model/`, `bounded-contexts/`, `adr/` plus top-level `DOMAIN_MODEL.md`/`BOUNDED_CONTEXTS.md`), `CODING_CONVENTIONS.md`, and root `GAPS.md` (register of known-unfixed cross-module seams, currently products/inventory/accounting — treat as documented debt, not fresh bugs) are the docs.
- `.draft/` is tracked planning/scratch notes (`.draft/.TODO.md`, `hr-phase-*.md`, `units.md`) — not a source of truth; do not treat it as current.
- `packages/platform` is the framework kernel. Import via `@aspen-os/platform/server`, `@aspen-os/platform/client`, `@aspen-os/platform/server/db-schemas`, and the `aspen` binary; there is no root platform export.
- Domain modules live in `packages/*` and are passed as an array to a platform. `crm`, `fleet`, `reports` are placeholder packages (`package.json` holds only `name`); do not infer an API from their READMEs.
- `.working-docs/` is the domain source of truth. Before domain/schema changes, read `CODING_CONVENTIONS.md` and the relevant `.working-docs/domain-model/`, `bounded-contexts/`, or `adr/` file. `docs/` is the generated Fumadocs site, not the domain source of truth.
- For new modules, follow `.agents/skills/write-module/SKILL.md`; for docs changes, use `.agents/skills/write-docs/SKILL.md`. When domain work lands (module surface, ADRs, glossary), run the `/update-working-docs` command (`.opencode/commands/update-working-docs.md`) to keep `.working-docs/`, `CONTEXT.md`, and `CODING_CONVENTIONS.md` true. `CODING_CONVENTIONS.md` is the exhaustive rule reference; this file is the lean pointer.

## Commands

- Install with `bun install` (never `npm install`). `bunfig.toml` sets `ignore-scripts = true` (dependency lifecycle scripts never run; the root `prepare` script still runs, so husky hooks install normally) and `minimumReleaseAge = 259200` — newly published package versions cannot be installed for 3 days, so brand-new dependency releases fail until the cooldown passes.
- Verify with `bun run check:lint` and `bun run check:types` (`tsc -b`, which covers every package plus `docs` via project references). Lint is mutating: `oxlint --fix . ; oxfmt .`. Focused checks: `cd packages/<name> && bun run check:lint` / `bun run check:types` (only in packages with those scripts — `crm`, `fleet`, `reports` are scriptless stubs).
- Root `bun run build` is `nx run-many -t build --exclude=docs --no-tui`. Build a build-step package from its directory with `bun run build` (`bun run ../../scripts/build.ts`); raw-source and stub packages have no `build` script.
- Build-step packages (have a `build` script, 21 total) are `platform`, `masters`, `notes`, `calendar`, `management`, `comms`, `dms`, `workspace`, `healthcare`, `constants`, `tasks`, `hr-core`, `hr-attendance`, `hr-leave`, `diagnostics`, `emr`, `inpatient`, `pharmacy`, `accounting`, `products`, `inventory`. Raw-source packages (no build, export `./src/index.ts`, 2 total) are `announcement`, `compliance`.
- `scripts/build.ts` deletes/recreates `.output/` and rewrites `package.json` exports/bin to `.output` paths in place (committed state is `.output` paths; `bun run build --dev` rewrites exports/bin back to `./src/*` without emitting). Rebuild the required build-step packages before typechecking raw-source consumers (`announcement`, `compliance`) after a clean checkout or a `platform` change. Never commit `.output/`.
- `bun run clean` deletes `node_modules`, `.nx`, `.output`, `.local`, and `bun.lockb`; use it only when intentionally removing the lockfile and generated artifacts.
- Better-auth schema is generated, not hand-edited: from `packages/platform` run `bun run gen:auth-schema` (`bunx auth generate --config ./src/server/auth/~config.ts --output ./src/server/db/schema/auth.gen.ts`).
- Docs commands run from `docs`. `gen:ref` regenerates `docs/.generated/ref.json` from package source (`gen:ref:check` detects drift), and `dev`/`check:types`/`build` invoke it first (Vite port 3005; `check:types` also `fumadocs-mdx`; `build` also `gen:cf-types`); `deploy` is plain `wrangler deploy`. If `docs/.source/` is missing, run `bunx fumadocs-mdx` (install scripts are disabled).
- No package test scripts or CI workflows exist (no `.github/workflows`). The maintained test suite is the custom oxlint plugin: `cd tools/oxlint/anti-slop && node --test` (one rule: `node --test rules/<rule>.test.ts`). Use Node, not Bun — oxlint's `RuleTester` needs Node ≥22 on 64-bit little-endian and fails all 12 tests under `bun test`. `tools/**` is excluded from root `tsc` and `oxlint` (still formatted by `oxfmt`).
- `nx.json`: `parallel: 20`; `build` depends on `^build` (outputs `{projectRoot}/.output`, cached); `check:types` depends only on `^check:types`, never on `^build`. Prefer `nx run-many -t <target>` over raw per-package loops for cross-package verification.

## Architecture

- Server lifecycle is `TenantPlatform.create(config, modules)` -> `$prepareInfra()` -> `run(tenantId, fn)` -> `$cleanup()`. Creation validates module `$dependencies`, initializes modules with units, and returns a proxy exposing unit keys and module `$name`s. The server class is `TenantPlatform`; a class named `Platform` exists only on the client (`@aspen-os/platform/client`), where `Platform.create(config, modules)` has a zero-tenant `run(fn)`.
- Server `run(tenantId, fn)` is the only signature — there is no zero-arg server `run(fn)`; `"$global"` routes to the control-plane DB and any other ID resolves the per-tenant pool. Control-plane DB + per-tenant DBs with physical isolation. Do not add an overloaded `run()` signature.
- Modules declare schemas, ACL, and event contracts from `$prepareInfra()`. Platform pushes schemas, applies merged ACL, then invokes module `$prepareRuntime()`. Runtime-wired modules must unregister schedules/subscriptions in `$cleanup()`.
- A normal domain module has `src/module.ts`, `auth.ts`, `pubsub.ts`, `types.ts`, `db-schemas/`, `schemas/`, `workflows/`, and optional `services/` or `runtime.ts`. Keep one workflow action per file and compose public workflow groups in the module.
- Each package maps `#/*` to its own `./src/*` (via `imports` + local `tsconfig.json` paths). Root `tsconfig.json` has no `paths`, so never use a package's `#/*` alias from another package.
- Domain input validation uses Valibot. Zod is a declared platform dependency but has no established source pattern for domain schemas; do not introduce new Zod-based domain validation without checking `CODING_CONVENTIONS.md`.

## Data And Events

- Database changes use Drizzle `pushSchema()` during platform preparation, not migration files. Domain IDs are text UUID v7 values, timestamps are timezone-aware, PostgreSQL names are snake_case mapped to camelCase TypeScript properties; see `CODING_CONVENTIONS.md` for the exact column rules.
- pg-boss pub/sub starts lazily. `publish()` auto-creates a missing queue and retries, so messages queue durably until a `subscribe()` consumer appears; every produced topic still wants a subscriber, and `getUnsubscribedProducedTopics()` (surfaced via RPC `health.check`) reports unsubscribed produced topics.
- `@aspen-os/dms` is the single document/file surface; do not recreate a `drive` package or parallel file/tag/share/trash model.
- `@aspen-os/comms` is the single notification/inbox and out-of-band delivery surface. Do not recreate a `notifications` package or a parallel `comms.deliver` topic — delivery is the cron-scan `comms.message-sweeper` outbox worker.
- `@aspen-os/notes` owns notes. `@aspen-os/masters` no longer owns notes.
- `@aspen-os/announcement` owns announcements (`$name = "announcement"`, `$dependencies = ["hrCore"]` for audience resolution); it publishes `announcement.published` — `@aspen-os/comms` owns delivery.
- `@aspen-os/calendar` owns the single reminder surface, including task reminders. `@aspen-os/tasks` publishes task events consumed by calendar's task bridge; do not add a second `task_reminder` surface or direct cross-module task/calendar calls.

## Local Infrastructure And Hooks

- There is no checked-in compose file or local infra script; tests and platform runs need an externally provided PostgreSQL.
- `.oxlintrc.json` enables type-aware linting and the `tools/oxlint/anti-slop` plugin. Module mocking, unsafe dictionary types, reflective access, TODO/FIXME comments, import cycles, and non-kebab-case filenames fail lint; read the rule/config rather than bypassing it.
- Husky runs `bun lint-staged` on pre-commit (oxfmt on staged files) and `bun commitlint --edit $1` on commit messages (`.commitlintrc.json`). Commit types: `build chore ci docs feat fix perf refactor revert test wip`.
