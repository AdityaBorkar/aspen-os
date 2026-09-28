# Constants Model

> Package: `@aspen-os/constants`. Shared `as const` enum objects + types, no tables, no workflows, no events. Build-step package (`scripts/build.ts`). Precedent for cross-package enum sharing (masters/comms import from here rather than duplicating).

## Exports (`src/index.ts`)

- `organization` — `ORG_BRANCH_TYPE`
- `masters` — `CONTACT_TYPE`, `INTEGRATION_TYPE`, `CONNECTION_STATUS`, `MASTER_ENTITY_TYPE`/`KIND`, `ENTITY_STATUS`, `UOM_CATEGORY`, `PAYMENT_METHOD_{TYPE,STATUS,DIRECTION}`, `CARD_BRAND`
- `notes` — `NOTE_TYPE`
- `compliance` — `COMPLIANCE_CATEGORY`, `RENEWAL_FREQUENCY`
- `comms` — `CHANNEL_{TYPE,SOURCE,STATUS}`, `PROVIDER_KIND`, `RECIPIENT_TYPE`, `NOTIFICATION_{STATUS,SEVERITY}`, `MESSAGE_STATUS`
- `country-codes` — `COUNTRY_CODES[]`, `CountryCode`, `isValidCountryCode`, `parseCountryCode`

## Invariants & Business Rules

1. **No runtime** — pure constants; never import units, never declare schemas/ACL/events.
2. **UPPER_SNAKE keys, lowercase values** — `pgEnum` values reference these objects.
