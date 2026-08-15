# Constants Context

> Package: `@aspen-os/constants`. Shared enums and value guards used across modules. Not a domain context — it is a **Shared Kernel** leaf (no units, no workflows, no lifecycle).

## Contents (`packages/constants/src/index.ts`)

- Shared constant objects as `as const` with `UPPER_SNAKE` keys and lowercase string values: `ORGANIZATION_STATUS`, `BRANCH_TYPE`, `COMPLIANCE_CATEGORY`, `COUNTRY_CODES` (+ `isValidCountryCode` guard), and other cross-module enums.
- `src/country-codes.ts` / `src/languages.ts` are empty stubs.
- Emits declarations to `.output/` via the build step, but its `exports` stay at `./src/index.ts` (no `.output` rewrite).

## Usage rules

- Module-specific constants live in the module's own `constants.ts` (or `utils/constants.ts`) — only genuinely shared enums belong here.
- Valibot `enum_()` schemas in module `schemas/enums.ts` mirror these constants.
- `pgEnum` values reference the constant objects.
