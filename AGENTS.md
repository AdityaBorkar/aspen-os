# Aspen OS Agent Guide

## Repository Shape

- Bun/TypeScript ESM monorepo. Workspaces: `packages/*`, `docs`, `website` (`package.json` also globs `./examples/*`, but `examples/` holds only the empty dir `examples/recruiter/seaweedfs-s3.json` — no `package.json`, not a build participant, safe to ignore).
- `website/` is a separate TanStack Start app (Vite on port 3000, `biome` via `bun run check`/`lint`/`format`); root `oxlint`/`oxfmt` and `tsc -b` still walk it, so prefer its own scripts when working there.
- There is no root `README.md`; `CONTEXT.md` (ubiquitous language), `.working-docs/`, and `CODING_CONVENTIONS.md` are the docs.
- `packages/platform` is the framework kernel. Import via `@aspen-os/platform/server`, `@aspen-os/platform/client`, `@aspen-os/platform/server/db-schemas`, and the `aspen` binary; there is no root platform export.
- Domain modules live in `packages/*` and are passed as an array to a platform. `crm`, `fleet`, `inventory`, `reports` are placeholder packages (`package.json` holds only `name`); do not infer an API from their READMEs.
- `.working-docs/` is the domain source of truth. Before domain/schema changes, read `CODING_CONVENTIONS.md` and the relevant `.working-docs/domain-model/`, `bounded-contexts/`, or `adr/` file. `docs/` is the generated Fumadocs site, not the domain source of truth.
- For new modules, follow `.agents/skills/write-module/SKILL.md`; for docs changes, use `.agents/skills/write-docs/SKILL.md`. `CODING_CONVENTIONS.md` is the exhaustive rule reference; this file is the lean pointer.

## Commands

- Install with `bun install`. `bunfig.toml` sets `ignore-scripts = true`, so postinstall hooks never run.
- Verify with `bun run check:lint` and `bun run check:types` (`tsc -b`). Lint is mutating: `oxlint --fix . ; oxfmt .`. Focused checks: `cd packages/<name> && bun run check:lint` / `bun run check:types` (only in packages with those scripts — `crm`, `fleet`, `inventory`, `reports` are scriptless stubs).
- Root `bun run build` is `nx run-many -t build --exclude=docs --no-tui`. Build a build-step package from its directory with `bun run build` (`bun run ../../scripts/build.ts`); raw-source and stub packages have no `build` script.
- Build-step packages (have a `build` script) are `platform`, `masters`, `notes`, `calendar`, `management`, `comms`, `dms`, `workspace`, `healthcare`, and `constants`. Raw-source packages (no build, export `./src/index.ts`) are `announcement`, `compliance`, `tasks`, `hr-core`, `hr-attendance`, `hr-leave`.
- `scripts/build.ts` deletes/recreates `.output/` and rewrites `package.json` exports/bin to `.output` paths in place (`git status` shows `package.json` modified); `constants` keeps its `./src/index.ts` export and only emits declarations. `bun run build --dev` rewrites exports/bin back to `./src/*` without emitting. Rebuild the required build-step packages before typechecking raw-source consumers (`announcement`, `compliance`, `tasks`, `hr-*`) after a clean checkout or a `platform` change. Never commit `.output/`.
- `bun run clean` deletes `node_modules`, `.nx`, `.output`, `.local`, and `bun.lockb`; use it only when intentionally removing the lockfile and generated artifacts.
- Better-auth schema is generated, not hand-edited: from `packages/platform` run `bun run gen:auth-schema` (`bunx auth generate --config ./src/server/auth/~config.ts --output ./src/server/db/schema/auth.gen.ts`).
- Docs commands run from `docs` and always start with `gen:ref`: `bun run dev` (`gen:ref` + Vite on port 3005), `bun run check:types` (`gen:ref` + `fumadocs-mdx` + `tsc --noEmit`), `bun run build` (`gen:ref` + `gen:cf-types` + Vite), `bun run deploy` (`wrangler deploy`). If `docs/.source/` is missing, run `bunx fumadocs-mdx` (install scripts are disabled).
- No package test scripts or CI workflows exist (no `.github/workflows`). The maintained test suite is the custom oxlint plugin: `cd tools/oxlint/anti-slop && bun test`.
- `nx.json`: `parallel: 20`; `build` depends on `^build` (outputs `{projectRoot}/.output`, cached); `check:types` depends only on `^check:types`. Prefer `nx run-many -t <target>` over raw per-package loops for cross-package verification.

## Architecture

- Server lifecycle is `Platform.create(config, modules)` -> `$prepareInfra()` -> `run(...)` -> `$cleanup()`. Creation validates module `$dependencies`, initializes modules with units, and returns a proxy exposing unit keys and module `$name`s.
- Tenancy is class-time with a uniform signature: `SingleTenantPlatform.run(tenantId, fn)`, `SharedTenantPlatform.run(tenantId, fn)`, `IsolatedTenantPlatform.run(tenantId, fn)` (all inherit `BasePlatform.run`; there is no zero-arg server `run(fn)`). Shared mode uses PostgreSQL RLS in a transaction; isolated mode resolves a database per tenant. Do not add an overloaded `run()` signature.
- Modules declare schemas, ACL, and event contracts from `$prepareInfra()`. Platform pushes schemas, applies merged ACL, then invokes module `$prepareRuntime()`. Runtime-wired modules must unregister schedules/subscriptions in `$cleanup()`.
- A normal domain module has `src/module.ts`, `auth.ts`, `pubsub.ts`, `types.ts`, `db-schemas/`, `schemas/`, `workflows/`, and optional `services/` or `runtime.ts`. Keep one workflow action per file and compose public workflow groups in the module.
- Each package maps `#/*` to its own `./src/*` (via `imports` + local `tsconfig.json` paths). Root `tsconfig.json` has no `paths`, so never use a package's `#/*` alias from another package.
- Domain input validation uses Valibot. Zod is a declared platform dependency but has no established source pattern for domain schemas; do not introduce new Zod-based domain validation without checking `CODING_CONVENTIONS.md`.

## Data And Events

- Database changes use Drizzle `pushSchema()` during platform preparation, not migration files. Domain IDs are text UUID v7 values, timestamps are timezone-aware, PostgreSQL names are snake_case mapped to camelCase TypeScript properties; see `CODING_CONVENTIONS.md` for the exact column rules.
- pg-boss pub/sub starts lazily. `publish()` auto-creates a missing queue and retries, so messages queue durably until a `subscribe()` consumer appears; every produced topic still wants a subscriber, and `healthCheck()` reports unsubscribed produced topics.
- `@aspen-os/dms` is the single document/file surface; do not recreate a `drive` package or parallel file/tag/share/trash model.
- `@aspen-os/comms` is the single notification/inbox and out-of-band delivery surface. Do not recreate a `notifications` package or a parallel `comms.deliver` topic — delivery is the cron-scan `comms.message-sweeper` outbox worker.
- `@aspen-os/notes` owns notes. `@aspen-os/masters` no longer owns notes.
- `@aspen-os/announcement` owns announcements (`$name = "announcement"`, `$dependencies = ["hrCore"]` for audience resolution); it publishes `announcement.published` — `@aspen-os/comms` owns delivery.
- `@aspen-os/calendar` owns the single reminder surface, including task reminders. `@aspen-os/tasks` publishes task events consumed by calendar's task bridge; do not add a second `task_reminder` surface or direct cross-module task/calendar calls.

## Local Infrastructure And Hooks

- There is no checked-in compose file or local infra script; tests and platform runs need an externally provided PostgreSQL.
- `.oxlintrc.json` enables type-aware linting and the `tools/oxlint/anti-slop` plugin. Module mocking, unsafe dictionary types, reflective access, TODO/FIXME comments, import cycles, and non-kebab-case filenames fail lint; read the rule/config rather than bypassing it.
- Husky runs `bunx lint-staged` on pre-commit (oxfmt on staged files) and `bunx commitlint --edit $1` on commit messages. Commit types: `build chore ci docs feat fix perf refactor revert test wip`.
