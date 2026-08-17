# Aspen OS Agent Guide

## Repository Shape

- This is a Bun/TypeScript ESM monorepo. Workspace globs are `packages/*`, `examples/*`, and `docs`; however `examples/*` currently contains only `examples/recruiter` (an empty SeaweedFS/S3 config stub with no `package.json`), so there is no host/example application.
- `packages/platform` is the framework kernel. Import its server, browser, and CLI surfaces from `@aspen-os/platform/server`, `@aspen-os/platform/client`, and the `aspen` binary; there is no root platform export.
- Domain modules live in `packages/*` and are passed as an array to a platform. `crm`, `fleet`, `inventory`, and `reports` are placeholder packages with no implementation; do not infer an API from their README files.
- `.working-docs/` is the domain source of truth. Before domain/schema changes, read `CODING_CONVENTIONS.md` and the relevant `.working-docs/domain-model/`, `bounded-contexts/`, ADR, or SOW file. `docs/` is the generated Fumadocs site, not the domain source of truth.
- For new modules, read and follow `.agents/skills/write-module/SKILL.md`; for documentation changes, use `.agents/skills/write-docs/SKILL.md`.

## Commands

- Install with `bun install`. `bunfig.toml` sets `ignore-scripts = true`, so install does not run package postinstall hooks.
- Run repository checks with `bun run check:lint` and `bun run check:types`. Lint is intentionally mutating: it runs `oxlint --fix . ; oxfmt .`.
- Run focused package checks with `cd packages/<name> && bun run check:lint` or `bun run check:types`.
- Build a build-step package from its directory with `bun run build`. The build-step packages are `platform`, `organization`, `masters`, `notes`, `calendar`, `management`, `comms`, `dms`, `workspace`, and `constants`.
- `scripts/build.ts` deletes/recreates `.output`. For every build-step package except `constants`, it also rewrites `package.json` exports/bin to `.output` paths; `constants` keeps its source export and only emits declarations. `bun run build --dev` rewrites configured exports/bin back to `./src/*` without emitting. After a clean checkout, or after changing `platform`, build the required build-step packages before typechecking raw-source consumers (`compliance`, `tasks`, and `hr`).
- `bun run clean` also deletes `bun.lockb`; use it only when intentionally removing the lockfile and generated artifacts.
- The generated better-auth schema is committed at `packages/platform/src/server/auth/db-schema.ts`; regenerate it from `packages/platform` with `bun run gen:auth-schema`, not by hand.
- Docs commands run from `docs`: `bun run dev` serves port 3005, `bun run check:types` runs `fumadocs-mdx` then TypeScript, `bun run build` runs Cloudflare type generation then Vite, and `bun run deploy` deploys with Wrangler. If `.source/` is missing, run `bunx fumadocs-mdx` because install scripts are disabled.
- There are no package test scripts or CI workflows. The maintained test suite is the custom oxlint plugin: `cd tools/oxlint/anti-slop && bun test`.

## Architecture

- Server lifecycle is `Platform.create(config, modules)` -> `$prepareInfra()` -> `run(...)` -> `$cleanup()`. Creation validates module `$dependencies`, initializes modules with units, and returns a proxy exposing unit keys and module `$name`s.
- The server has `SingleTenantPlatform.run(fn)`, `SharedTenantPlatform.run(tenantId, fn)`, and `IsolatedTenantPlatform.run(tenantId, fn)`. Shared mode uses PostgreSQL RLS in a transaction; isolated mode resolves a database per tenant. Do not add an overloaded `run()` signature.
- Modules declare schemas, ACL, and event contracts from `$prepareInfra()`. Platform code pushes schemas, applies merged ACL, then invokes module `$prepareRuntime()`. Runtime-wired modules must unregister schedules/subscriptions in `$cleanup()`.
- A normal domain module has `src/module.ts`, `auth.ts`, `pubsub.ts`, `types.ts`, `db-schemas/`, `schemas/`, `workflows/`, and optional `services/` or `runtime.ts`. Keep one workflow action per file and compose public workflow groups in the module.
- Each package's `#/*` import alias is package-local. The root `tsconfig.json` has no paths mapping, so do not use a package's `#/*` alias from another package.
- Domain input validation uses Valibot. Use Zod for oRPC procedure inputs and environment variables.

## Data And Events

- Database changes use Drizzle `pushSchema()` during platform preparation, not migration files. Follow `CODING_CONVENTIONS.md` for schema details; domain IDs are text UUID v7 values, timestamps are timezone-aware, and PostgreSQL names are snake_case mapped to camelCase TypeScript properties.
- pg-boss pub/sub starts lazily. Publishing to a topic with no `subscribe()` consumer silently drops the message (`send()` returns no job id); every produced topic needs a subscriber, and `healthCheck()` reports unsubscribed produced topics.
- `@aspen-os/dms` is the single document/file surface; the former drive surface is consolidated there. Do not recreate a `drive` package or parallel file/tag/share/trash model.
- `@aspen-os/comms` is the single notification/inbox and out-of-band delivery surface (channels, host providers, messages). Do not recreate a `notifications` package or a parallel `comms:deliver` topic — delivery is the cron-scan `comms:message-sweeper` outbox worker.
- `@aspen-os/notes` owns notes. `@aspen-os/masters` no longer owns notes or `master_note`.
- `@aspen-os/calendar` owns the single reminder surface, including task reminders. `@aspen-os/tasks` publishes task events consumed by calendar's task bridge; do not add a second `task_reminder` surface or direct cross-module task/calendar calls.

## Local Infrastructure And Hooks

- The only checked-in local infrastructure is PostgreSQL: `docker compose -f packages/platform/src/server/example.docker-compose.yaml up -d`. It uses database/user `aspen`, password `change-me`, port `5432`, and disables RLS for the example. No S3/SeaweedFS service is provided by this compose file.
- `.oxlintrc.json` enables type-aware linting and the `tools/oxlint/anti-slop` plugin. In particular, module mocking, unsafe dictionary types, reflective access, TODO/FIXME warning comments, and nonconforming filenames can fail lint; read the rule/config rather than bypassing it.
- Husky runs `bunx lint-staged` on pre-commit (oxfmt on staged files) and `bunx commitlint --edit $1` on commit messages. Commit types are limited to `build chore ci docs feat fix perf refactor revert test wip`.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
