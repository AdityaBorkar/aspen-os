# Coding Conventions

## General

- **Runtime**: Bun (not Node.js)
- **Package manager**: Bun workspaces (`bun install`)
- **Language**: TypeScript, ESM only (`"type": "module"`)
- **Linter/formatter**: Biome — double quotes, 2-space indent, LF, `lineWidth: 80`, organized imports
- **No barrel files** unless explicitly told

## Database

- **IDs**: Always `text` with `DEFAULT gen_random_uuid()::text` or app-generated UUIDs via `crypto.randomUUID()`. Never use native UUID columns.
- **Timestamps**: Always `TIMESTAMPTZ` / `withTimezone: true`. Never use `timestamp without time zone`.

## Framework

- **Module registration**: Pass all modules to `Framework.create(config, modules)` — there is no `registerModule()` method.
- **Lifecycle**: `Framework.create()` → `prepare()` → `run()` → `destroy()`. Do not call lifecycle methods out of order.
- **Unit access**: `framework.getUnit("name")` — typed, requires a name.
- **Module access**: `framework.getModule("name")` — typed, throws if not found. Or use proxy: `framework.moduleName`.

## Git Hooks (Husky)

- **pre-commit**: `bunx lint-staged` → runs `biome check --fix --no-errors-on-unmatched` on staged files
- **commit-msg**: `bunx commitlint --edit $1` → enforces conventional commits
- Allowed commit types: `build chore ci docs feat fix perf refactor revert test wip`
