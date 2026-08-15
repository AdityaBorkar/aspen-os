# `@aspen-os/masters` Module — Extract from Organization (Scope of Work)

> Scope of Work to create a new `masters` module owning **contacts, addresses, bank accounts, connections, and notes** as polymorphic tenant master data, and to strip the `organization` module down to the org profile + branches. Per design direction, the `connection` entity is **redesigned**: today it models business relationships (vendors/clients/insurers with embedded contact fields) — that is flawed. In masters, `connection` stores **integration connections to external APIs/entities** (API keys, OAuth, webhooks, basic auth); business relationships become `contact` records.

> **Status — as of Aug 2026:** Complete. Phases 0–4 implemented: constants, masters scaffold (5 polymorphic entities, kvStore-backed connections), organization stripped to org+branch, compliance reworked to `masters:contact_created`, docs + working-docs updated. Host deployments still need the §9 data migration (DROP the old tables after mapping to masters; remove the old `organization:connection_created` subscription).

## Confirmed Decisions

| #   | Decision               | Outcome                                                                                                                                                                                                                                      |
| --- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Ownership model        | All five masters entities are **polymorphic** (`entityType` + `entityId`, enum `master_entity_type`: `organization` / `branch` / `connection` / `contact`) — the same pattern as DMS `dms_entity_label`. Tables get the `master_` prefix.    |
| 2   | Contacts               | `master_contact` is a **first-class standalone entity** (no link to connections). Contacts carry a `type` (`CONTACT_TYPE` — the old connection-type values: vendor, client, insurer, …).                                                     |
| 3   | Connections            | **Redesigned** as integration connections (`master_connection`): external API/entity credentials (api key, OAuth, webhook, basic auth), status, endpoint, credential reference, test/rotate. The old business-relationship model is removed. |
| 4   | Notes                  | `master_note` is **polymorphic** and keeps a type enum, promoted to shared `NOTE_TYPE` (general/call/email/meeting/contract_renewal/issue).                                                                                                  |
| 5   | Scope split            | **org + branch stay in `organization`** (tables + workflows unchanged). `address`, `bank_account`, `connection`, `connection_contact`, `connection_note` move to masters. Organization gains `$dependencies = ["masters"]`.                  |
| 6   | Org module surface     | The `addresses` / `bankAccounts` / `connections` workflow groups are **removed** from `p.organization` (no in-repo consumers); callers use `p.masters.*`. (Alternative kept open: thin delegating wrappers — see §8.)                        |
| 7   | Secrets                | Credential material is **never stored in plaintext** — `master_connection` holds a reference to an encrypted secret (platform `kvStore`); workflow supports rotation.                                                                        |
| 8   | Compliance integration | `organization:connection_created` (insurer → insurance-policy document) is reworked to subscribe to `masters:contact_created` (contact type `insurer`, entity `organization`). `organization:branch_created` subscription is unaffected.     |
| 9   | Constants              | `CONNECTION_TYPE` → split into `CONTACT_TYPE` (old values) + `INTEGRATION_TYPE` (new); `CONNECTION_STATUS` redefined (`active`/`inactive`/`expired`/`revoked`); `CONNECTION_NOTE_TYPE` → `NOTE_TYPE`; new `MASTER_ENTITY_TYPE`.              |
| 10  | SOW location           | `.working-docs/sow/masters.md` (this file); the original `sow/organization.md` stays as the historical design record.                                                                                                                        |

---

## 1. Current State & Inventory

### 1.1 `organization` today — 7 tenant tables, 5 workflow groups

| Table                | Columns / notes                                                                  | Move to masters?               |
| -------------------- | -------------------------------------------------------------------------------- | ------------------------------ |
| `organization`       | profile row (slug unique), 1 per tenant                                          | **stay**                       |
| `branch`             | hierarchical (self-FK, ≤5 levels), code unique, single HQ invariant              | **stay**                       |
| `address`            | **no owner column** (implicitly tenant-wide); `isPrimary`, `label`               | ✅ move                        |
| `bank_account`       | **no owner column**; `isPrimary`, `isActive`, currency, routing/swift            | ✅ move                        |
| `connection`         | business relationship w/ embedded `contactPerson/Email/Phone`, `address`, `tags` | ✅ move + redesign             |
| `connection_contact` | nested under connection (1:N)                                                    | ✅ dissolve → `master_contact` |
| `connection_note`    | nested under connection; `type`, `userId`                                        | ✅ dissolve → `master_note`    |

Workflow groups today: `organizations`, `branches`, `addresses`, `bankAccounts`, `connections` (22 connection/contact/note workflows; address/bank-account CRUD + `setPrimary`; branch CRUD/tree; org CRUD/branding/logo).

### 1.2 Consumers of the entities being moved

- **Compliance** (`event-bridge.ts:124`) subscribes to `organization:connection_created` and creates an `insurance_policy` compliance document when `connection.type === "insurer"` (`handleConnectionCreated`, line 354). **Rework required.**
- **Compliance** subscribes to `organization:branch_created` — unaffected.
- **Management** depends on `["organization"]` but reads the **better-auth** `organization` table from `@aspen-os/platform/server/db-schemas` (platform auth db-schema, not the org module's table) — **unaffected** by the table move. (Pre-existing dual `organization` tables are out of scope; see §11.)
- No other package imports `@aspen-os/organization` (grep-clean). `docs/source.config.ts` and docs/ reference the org module docs only.

### 1.3 Constants in `@aspen-os/constants`

`ORGANIZATION_STATUS`, `BRANCH_TYPE`, `CONNECTION_TYPE` (10 values), `CONNECTION_STATUS` (4), `CONNECTION_NOTE_TYPE` (6). Only `CONNECTION_*` are affected; no other package imports them (grep-clean outside `organization`).

---

## 2. Target Model

### 2.1 `masters` tables (all `tenant_schemas`, `master_` prefix, `uuidv7` PKs, timestamps per conventions)

| Table                 | Key columns                                                                                                                                                                            | Notes                                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `master_contact`      | `name`, `email`, `phone`, `title`, `company`, `type` (`CONTACT_TYPE`), `isPrimary`, `entityType`, `entityId`, `metadata`                                                               | standalone; primary-scoped per `(entityType, entityId)`; indices on type/entity |
| `master_address`      | `label`, `line1`, `line2`, `city`, `state`, `postalCode`, `country`, `isPrimary`, `entityType`, `entityId`, `metadata`                                                                 | + index on `(entityType, entityId)`                                             |
| `master_bank_account` | `accountHolderName`, `accountNumber`, `accountType`, `bankName`, `branchName`, `routingNumber`, `swiftCode`, `currency`, `isActive`, `isPrimary`, `entityType`, `entityId`, `metadata` |                                                                                 |
| `master_connection`   | `name`, `type` (`INTEGRATION_TYPE`), `status` (`CONNECTION_STATUS`), `baseUrl`, `description`, `credentialRef`, `lastTestedAt`, `lastUsedAt`, `entityType`, `entityId`, `metadata`     | credentialRef → encrypted secret in kvStore; **no plaintext secrets**           |
| `master_note`         | `content`, `type` (`NOTE_TYPE`), `userId`, `entityType`, `entityId`                                                                                                                    |                                                                                 |

`master_entity_type` pgEnum values: `organization`, `branch`, `connection`, `contact`.

### 2.2 Module surface (`p.masters.*`)

```
p.masters.addresses     { create, delete, get, list, setPrimary, update }
p.masters.bankAccounts  { activate, create, deactivate, delete, get, list, setPrimary, update }
p.masters.connections   { activate, create, deactivate, delete, get, list, rotateCredential,
                          test, update }
p.masters.contacts      { create, delete, get, list, setPrimary, update }
p.masters.notes         { add, list, remove }
```

Structure follows the management-aligned module pattern: `module.ts` / `auth.ts` / `pubsub.ts` / `types.ts`, `db-schemas/` directory form, one workflow per file under `workflows/<entity>/<verb>.ts`, `schemas/` (valibot `Create/Update/Filters`), no runtime wiring (`$initialize`/`$prepareRuntime`/`$cleanup` empty), `$dependencies = []`.

### 2.3 Events (`masters:*`)

- `contact_created` / `contact_updated` / `contact_removed`
- `address_created` / `address_updated` / `address_removed`
- `bank_account_created` / `bank_account_activated` / `bank_account_deactivated` / `bank_account_updated`
- `connection_created` / `connection_updated` / `connection_status_changed` / `connection_credential_rotated` / `connection_removed`
- `note_added` / `note_removed`

Payloads typed via `EventMap`; topics published as plain strings (per convention). Replaces `organization:connection_created` for compliance.

### 2.4 ACL resources

`contact`, `address`, `bankAccount`, `connection`, `note` — `defineAcl({ ...: ["create","read","update","delete", ...] })`.

### 2.5 `organization` after the move

- Tables: `organization`, `branch` only.
- Workflow groups: `organizations`, `branches` only.
- `$dependencies = ["masters"]`. `OrganizationConfig` unchanged.
- `$prepareInfra()` tenant schemas = `{ organization, branch }`; events drop connection events, keep `organization:*` + `branch:*`.
- Optional (Phase 4 decision): `createOrganization` delegates to `p.masters.*` to seed the org's default address/contact/note — kept out of core scope.

---

## 3. Phase 0 — Constants & Enums

1. **`@aspen-os/constants`**: add `CONTACT_TYPE` (the 10 current `CONNECTION_TYPE` values), `INTEGRATION_TYPE` (`api_key` / `oauth2` / `webhook` / `basic_auth` / `database` / `other`), `NOTE_TYPE` (6 current note types), `MASTER_ENTITY_TYPE` (`organization`/`branch`/`connection`/`contact`). **Remove** `CONNECTION_NOTE_TYPE`; re-define `CONNECTION_STATUS` as `active`/`inactive`/`expired`/`revoked` and `CONNECTION_TYPE` as the integration types (or drop both in favor of the new names — pick one, see §8).
2. Grep sweep `CONNECTION_TYPE|CONNECTION_STATUS|CONNECTION_NOTE_TYPE` — only `organization` + `compliance` reference them.
3. Gate: `cd packages/constants && bun run check:types && bun run check:lint`.

## 4. Phase 1 — Scaffold `packages/masters`

1. Load the `write-module` skill (`.agents/skills/write-module/SKILL.md`); scaffold `packages/masters` on the dms module template (build step + `build` config block like `organization`).
2. Add to root `tsconfig.json` references and `docs/source.config.ts` (masters docs source).
3. Implement the five tables, `db-schemas/index.ts` (all `tenant_schemas`, empty `control_plane_schemas`), `schemas/` valibot schemas, `auth.ts` ACL, `pubsub.ts` events, `types.ts`.
4. Implement workflows per §2.2. All entity-scoped queries filter on `(entityType, entityId)`; `setPrimary`/`activate` logic ported from the current org workflows (`unsetPrimary*` pattern). `connections.test` validates the endpoint; `connections.rotateCredential` writes a new kvStore secret and bumps `credentialRef`.
5. Gate: `bun install`; `cd packages/masters && bun run check:lint && bun run check:types && bun run build`.

## 5. Phase 2 — Move + Redesign Data (organization → masters)

1. **Address / Bank account**: port `address`/`bankAccount` tables, schemas, and the `addresses`/`bankAccounts` workflow groups into masters with polymorphic columns added. No owner-equivalent exists today, so the org implicitly owns them — `createOrganization` seeds org-scoped rows, or the host app assigns `entityType = organization, entityId = <orgId>` on creation.
2. **Connection redesign**: drop the business-relationship table shape; implement `master_connection` per §2.1 (integration credentials). Old `type` values (vendor/client/insurer/…) become `CONTACT_TYPE` on contacts.
3. **Contacts**: `connection_contact` dissolved into standalone `master_contact` (own polymorphic scope, `type`); primary-contact logic becomes `contacts.setPrimary`.
4. **Notes**: `connection_note` → polymorphic `master_note`; `connection.notes` free-text column dropped from the new connection model.

## 6. Phase 3 — Strip `organization` + rewire integration

1. Delete `src/db-schemas/{address,bank-account,connection}.ts`; `src/db-schemas/index.ts` exports only `organization`, `branch` (+ enums). `schemas/` drops address/bank-account/connection/contact/note schemas. `types.ts` drops related exports.
2. Remove `addresses`, `bankAccounts`, `connections` groups + their `workflows/address|bank-account|connection` trees; keep `workflows/org` + `workflows/branch` + `workflow-steps/fetch-organization.ts`.
3. `module.ts`: `$dependencies = ["masters"]`; `$prepareInfra()` returns the reduced `db` + reduced `events`; drop connection events from `pubsub.ts` and connection/bankAccount/address from `auth.ts`.
4. **Compliance** (`event-bridge.ts`): remove `organization:connection_created` subscription + `handleConnectionCreated`; add `masters:contact_created` subscription creating the `insurance_policy` document when `contact.type === "insurer"` and `entityType === "organization"`; update `sourceModule` to `"masters"` and the document `connection` ref → contact id.
5. Gate: root `bun run check:lint` && `bun run check:types`; `cd packages/organization && bun run check:lint && check:types && build`.

## 7. Phase 4 — Documentation & Verification

1. Write `packages/masters/docs/` (overview, access-control, db-schemas, events, workflows). Update `packages/organization/docs/` to org+branch only.
2. Update `.working-docs/`: new `domain-model/masters.md` + `bounded-contexts/masters.md`; trim `domain-model/organization.md` + `bounded-contexts/organization.md`; `CONTEXT.md`, `AGENTS.md` (fully-implemented list, key dirs, module pattern, current state).
3. Docs build: `cd docs && bunx fumadocs-mdx` (if needed) then `check:types` + `build`.
4. **Sweep greps return clean**: inside `packages/organization`: `address`, `bankAccount`, `connectionContact`, `connectionNote`, `CONNECTION_NOTE_TYPE`, `connection:` workflow names, `connectionTypeEnum`; repo-wide: `organization:connection_created`, `p.organization.addresses|bankAccounts|connections`.
5. **Acceptance criteria**: masters compiles/lints/builds with the five polymorphic entities; organization holds only `organization` + `branch`; compliance insurer flow works off `masters:contact_created`; no legacy connection business-relationship terms remain in `organization`/`constants`.

## 8. Open Decisions (recommendation first)

- **Org surface**: remove `addresses`/`bankAccounts`/`connections` groups outright (no in-repo consumers) vs. keep as thin delegating wrappers over `p.masters` for host-app continuity. **Recommended: remove.**
- **Constant naming**: redefine `CONNECTION_TYPE`/`CONNECTION_STATUS` in place vs. introduce `INTEGRATION_TYPE`/`CONNECTION_STATUS` and delete the old names. **Recommended: new names + delete old** (grep-clean).
- **Org default master data**: does `createOrganization` seed an org-scoped address/contact/note via masters? **Recommended: yes, Phase 4 nicety** if host-app continuity matters; otherwise out of scope.
- **`contact_removed`/`note_removed`** events: publish delete events (dms precedent) or not. **Recommended: yes, minimal payloads.**

## 9. Deployment Notes (host app)

`pushSchema` (ADR 0004) never drops tables. The host migration must `DROP TABLE` `address`, `bank_account`, `connection`, `connection_contact`, `connection_note` (after mapping data to masters), and delete old compliance subscriptions. No migration tooling ships in this repo.

## 10. Effort Estimate (Relative)

| Area                                          | Complexity | Notes                                                     |
| --------------------------------------------- | ---------- | --------------------------------------------------------- |
| Constants + enums                             | Low        | Add/remove, sweep refs                                    |
| Scaffold masters + 5 polymorphic entities     | Medium     | Port existing CRUD, add entityType/entityId filters       |
| Connection redesign (integration/credentials) | **High**   | New model, kvStore secret handling, test/rotate workflows |
| Contacts + notes as standalone polymorphic    | Medium     | Dissolve connection_contact/connection_note               |
| Strip organization to org+branch              | Low–Medium | Delete surfaces, update deps/events/acl                   |
| Compliance rework (insurer flow)              | Low        | Swap topic + handler                                      |
| Docs + verification                           | Medium     | New masters docs, trim org docs, CONTEXT/AGENTS, sweeps   |

## 11. Out of Scope

- **No behavior loss for org profile/branches** — org CRUD/branding/logo/branch tree stay exactly as-is.
- **No data migration tooling** (host-app responsibility; §9).
- **No fixing the pre-existing dual `organization` tables** (better-auth vs org module) — flagged, not addressed.
- **No business-relationship model** beyond contacts+notes (no vendors/clients/insurers entity, no relationship lifecycle).
- **No credential provider integrations** (OAuth flows with real providers, webhook delivery) — masters stores/validates/rotates; actual providers are a future `integrations` surface.
