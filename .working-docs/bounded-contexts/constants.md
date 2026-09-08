# Constants Context

> Package: `@aspen-os/constants`. Shared enums and value guards used across modules. Not a domain context — it is a **Shared Kernel** leaf (no units, no workflows, no lifecycle).

## Contents (`packages/constants/src/`)

- Shared constant objects as `as const` with `UPPER_SNAKE` keys and lowercase string values, split per domain and re-exported by `index.ts`: `organization.ts` (`ORGANIZATION_STATUS`, `BRANCH_TYPE`), `masters.ts` (`CONTACT_TYPE`, `MASTER_ENTITY_KIND`, …), `notes.ts` (`NOTE_TYPE`), `compliance.ts` (`COMPLIANCE_CATEGORY`, `RENEWAL_FREQUENCY`), `comms.ts` (`CHANNEL_TYPE`, …), `country-codes.ts` (`COUNTRY_CODES` + `isValidCountryCode`/`parseCountryCode`).
- Zero dependencies (no platform, no ORM).
- Emits declarations to `.output/` via the build step, but its `exports` stay at `./src/index.ts` (no `.output` rewrite).

## Usage rules

- Module-specific constants live in the module's own `constants.ts` (or `utils/constants.ts`) — only genuinely shared enums belong here.
- Valibot `picklist`/`enum_()` schemas in module `schemas/enums.ts` mirror these constants (masters uses `picklist`).
- `pgEnum` values reference the constant objects.
