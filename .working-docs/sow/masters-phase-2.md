# `@aspen-os/masters` Module — Phase 2: Entity, Unit of Measure & Payment Method (Scope of Work)

> Scope of Work for the **further implementation** of the `masters` module with three new polymorphic/reference master entities: **`entity`** (a business entity with relevant metadata), **`unit_of_measure`** (units of measurement across categories), and **`payment_method`** (modes of payment — `bank_account` / `card` / `upi` / `imps` / `cheque` — that can be received or paid). Extends the existing Phase 1 surface (contact, address, bank_account, connection, note) without modifying it.

> **Status — as of Aug 2026:** Planned. Phases 0–4 not yet executed. This SOW is the design record; the earlier `sow/masters.md` (Phase 1 extraction) stays as-is.

## Confirmed Decisions

| #   | Decision          | Outcome                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `entity`          | New `master_entity` table — a **tenant-level business party** (company/institution) with rich metadata (legal/trade name, type, status, industry, website, contact info, taxId, registrationNumber, foundedDate, timezone, locale, optional `organizationId` link). It becomes a **new `master_entity_type` value** so existing masters (contact/address/bank_account/note) can scope to it. |
| 2   | `unit_of_measure` | New `master_unit_of_measure` table — **tenant-wide reference data** (not polymorphic): `name`, unique `code`, `category` (`UOM_CATEGORY`), `symbol`, `decimalPlaces`, `isBaseUnit`, `baseUnitId` (self-reference), `conversionFactor`, `isActive`. No `entityType`/`entityId` scope.                                                                                                         |
| 3   | `payment_method`  | New `master_payment_method` table — a **mode of payment** with `type` (`PAYMENT_METHOD_TYPE`: `bank_account`/`card`/`upi`/`imps`/`cheque`), `direction` (`inbound`/`outbound`/`both`), type-specific detail fields, and **polymorphic scope** (whose method it is — org, branch, entity, contact). `isPrimary` per scope.                                                                    |
| 4   | Ownership         | `entity` is an **owner** (added to `master_entity_type` enum); `unit_of_measure` is **not** owner-scoped; `payment_method` **is** owner-scoped (polymorphic). All tables keep the `master_` prefix, `uuidv7` PKs, `withTimezone` timestamps.                                                                                                                                                 |
| 5   | Bank linkage      | `master_payment_method.bankAccountId` is a **logical FK** (text) to `master_bank_account` for `bank_account`/`imps`/`cheque` types — consistent with the repo's no-DB-FK convention. No cascade/constraint at the DB layer.                                                                                                                                                                  |
| 6   | Constants         | New shared constants in `@aspen-os/constants`: `ENTITY_TYPE`, `ENTITY_STATUS`, `UOM_CATEGORY`, `PAYMENT_METHOD_TYPE`, `PAYMENT_METHOD_STATUS`, `PAYMENT_METHOD_DIRECTION`, `CARD_BRAND`. `MASTER_ENTITY_TYPE` gains `entity`.                                                                                                                                                                |
| 7   | Module surface    | Three new workflow groups: `p.masters.entities`, `p.masters.unitsOfMeasure`, `p.masters.paymentMethods` — flat `readonly` groups per the management-aligned pattern. Existing five groups unchanged.                                                                                                                                                                                         |
| 8   | Events            | New `masters:*` events per entity group (`entity_*`, `unit_of_measure_*`, `payment_method_*`), typed via `EventMap`, published as plain string topics. No existing event is changed.                                                                                                                                                                                                         |
| 9   | ACL               | Three new ACL resources: `entity`, `unitOfMeasure`, `paymentMethod` (non-CRUD actions: `activate`/`deactivate` for UOM + payment method, `set_primary` for payment method).                                                                                                                                                                                                                  |
| 10  | SOW location      | `.working-docs/sow/masters-phase-2.md` (this file); `sow/masters.md` stays as the Phase 1 design record.                                                                                                                                                                                                                                                                                     |

---

## 1. Current State & Inventory

### 1.1 `masters` today — 5 tenant tables, 5 workflow groups, 16 events

| Table                 | Notes                                                | Impacted by Phase 2                                 |
| --------------------- | ---------------------------------------------------- | --------------------------------------------------- |
| `master_contact`      | polymorphic, `CONTACT_TYPE`, `isPrimary`             | `master_entity_type` enum gains `entity`            |
| `master_address`      | polymorphic, `isPrimary`                             | same                                                |
| `master_bank_account` | polymorphic, `isActive`/`isPrimary`                  | referenced by `master_payment_method.bankAccountId` |
| `master_connection`   | integration connections (kvStore-backed credentials) | none                                                |
| `master_note`         | polymorphic, `NOTE_TYPE`                             | same                                                |

`master_entity_type` pgEnum values today: `organization`, `branch`, `connection`, `contact`.

### 1.2 No existing consumers to migrate

`entity`, `unit_of_measure`, and `payment_method` do **not** exist anywhere in the repo (grep-clean across `packages/`). `@aspen-os/accounting` (the future consumer of `payment_method`) is a pure stub (`package.json` only — no source). No other package imports `@aspen-os/masters` (Phase 1 SOW §1.2 still holds). The additions are additive; no existing workflow/event/ACL is renamed or removed.

### 1.3 Constants inventory

`@aspen-os/constants` today: `ORGANIZATION_STATUS`, `BRANCH_TYPE`, `CONTACT_TYPE`, `INTEGRATION_TYPE`, `CONNECTION_STATUS`, `NOTE_TYPE`, `MASTER_ENTITY_TYPE`, `COMPLIANCE_*`, `RENEWAL_FREQUENCY`, `COUNTRY_CODES`. `MASTER_ENTITY_TYPE` gains the `entity` value; nothing existing is renamed.

---

## 2. Target Model

### 2.1 New tables (all `tenant_schemas`, `master_` prefix, `uuidv7` PKs, timestamps per conventions)

#### `master_entity` — business entity

| Column               | Type         | Notes                                                      |
| -------------------- | ------------ | ---------------------------------------------------------- |
| `id`                 | text PK      | `$defaultFn(uuidv7)`                                       |
| `name`               | text notNull | legal/trade name                                           |
| `code`               | text         | optional, unique per tenant (unique index)                 |
| `type`               | enum         | `ENTITY_TYPE` (`master_entity_type_enum`)                  |
| `status`             | enum         | `ENTITY_STATUS` (`active`/`inactive`/`archived`)           |
| `industry`           | text         |                                                            |
| `website`            | text         |                                                            |
| `phone`              | text         |                                                            |
| `email`              | text         |                                                            |
| `taxId`              | text         | VAT/GST/tax registration                                   |
| `registrationNumber` | text         | company registration no.                                   |
| `foundedDate`        | date         |                                                            |
| `timezone`           | text         | IANA tz                                                    |
| `locale`             | text         | BCP-47                                                     |
| `organizationId`     | text         | logical FK to `organization` profile row (optional parent) |
| `metadata`           | jsonb        |                                                            |
| `createdAt`          | timestamptz  |                                                            |
| `updatedAt`          | timestamptz  | `$onUpdate`                                                |

Indexes: `idx_master_entity_type`, `idx_master_entity_status`, `idx_master_entity_organization`, unique `idx_master_entity_code` (on `code`).

#### `master_unit_of_measure` — units of measurement (tenant-wide)

| Column             | Type         | Notes                                              |
| ------------------ | ------------ | -------------------------------------------------- |
| `id`               | text PK      | `$defaultFn(uuidv7)`                               |
| `name`             | text notNull | e.g. "Kilogram"                                    |
| `code`             | text notNull | unique, e.g. `kg`                                  |
| `category`         | enum         | `UOM_CATEGORY` (`master_uom_category_enum`)        |
| `symbol`           | text         | e.g. `kg`                                          |
| `decimalPlaces`    | integer      | default 2                                          |
| `isBaseUnit`       | boolean      | default false — the reference unit of its category |
| `baseUnitId`       | text         | logical self-FK — the category's base UOM          |
| `conversionFactor` | numeric      | multiplier to `baseUnitId` (null for base units)   |
| `isActive`         | boolean      | default true                                       |
| `metadata`         | jsonb        |                                                    |
| `createdAt`        | timestamptz  |                                                    |
| `updatedAt`        | timestamptz  | `$onUpdate`                                        |

Indexes: unique `idx_master_uom_code`, `idx_master_uom_category`, `idx_master_uom_is_active`. Invariant (enforced in workflow): exactly **one base unit per category**; a base unit has `baseUnitId = null` and `conversionFactor = null`; derived units must reference the base unit of their own category.

#### `master_payment_method` — modes of payment (polymorphic)

| Column            | Type         | Notes                                                           |
| ----------------- | ------------ | --------------------------------------------------------------- |
| `id`              | text PK      | `$defaultFn(uuidv7)`                                            |
| `type`            | enum         | `PAYMENT_METHOD_TYPE` (`master_payment_method_type_enum`)       |
| `name`            | text notNull | e.g. "Corporate HDFC Account", "UPI business@okhdfcbank"        |
| `code`            | text         | optional                                                        |
| `direction`       | enum         | `PAYMENT_METHOD_DIRECTION` (`inbound`/`outbound`/`both`)        |
| `status`          | enum         | `PAYMENT_METHOD_STATUS` (`active`/`inactive`/`archived`)        |
| `bankAccountId`   | text         | logical FK → `master_bank_account` (bank_account/imps/cheque)   |
| `bankName`        | text         | denormalized display for bank-backed types                      |
| `cardBrand`       | enum         | `CARD_BRAND` (`visa`/`mastercard`/`amex`/`rupay`/`other`)       |
| `cardLast4`       | text         | masked only — **never full PAN**                                |
| `cardExpiryMonth` | integer      | 1–12                                                            |
| `cardExpiryYear`  | integer      | 4-digit                                                         |
| `upiId`           | text         | VPA, e.g. `business@okhdfcbank`                                 |
| `chequeSeries`    | text         | cheque prefix/leaf range for cheque books                       |
| `details`         | jsonb        | type-specific extension (IMPS details, notes)                   |
| `isPrimary`       | boolean      | one per `(entityType, entityId, direction)`                     |
| `entityType`      | enum         | `master_entity_type` — org/branch/connection/contact/**entity** |
| `entityId`        | text notNull | owner row id                                                    |
| `isActive`        | boolean      | default true                                                    |
| `metadata`        | jsonb        |                                                                 |
| `createdAt`       | timestamptz  |                                                                 |
| `updatedAt`       | timestamptz  | `$onUpdate`                                                     |

Indexes: `idx_master_payment_method_entity`, `idx_master_payment_method_type`, `idx_master_payment_method_is_primary`, `idx_master_payment_method_is_active`. **Security invariant:** card data is limited to brand/last-4/expiry — no full card numbers, no CVV, no PAN anywhere (secrets policy applies to payment credentials too).

`master_entity_type` pgEnum gains `entity` → `organization`, `branch`, `connection`, `contact`, `entity`.

### 2.2 Module surface (`p.masters.*` — new groups)

```
p.masters.entities         { create, delete, get, list, setStatus, update }
p.masters.unitsOfMeasure   { activate, create, deactivate, delete, get, list, update }
p.masters.paymentMethods   { activate, create, deactivate, delete, get, list, setPrimary, update }
```

- `entities.list` filters by `type`/`status`/`organizationId`/search.
- `unitsOfMeasure.list` filters by `category`/`isActive`; `activate`/`deactivate` toggle `isActive`; `create`/`update` validate the base-unit-per-category invariant.
- `paymentMethods.create`/`update` validate type-specific fields (e.g. `cardBrand`+`cardLast4`+expiry required for `card`; `upiId` required for `upi`; `bankAccountId` required for `bank_account`/`imps`/`cheque`). `setPrimary` unsets the prior primary within `(entityType, entityId, direction)`.

Structure follows the Phase 1 pattern: `workflows/<entity>/<verb>.ts` (one file per action), `workflow-steps/fetch-<entity>.ts` for lookups, `schemas/` valibot `Create/Update/Filters`, module-level `readonly` groups. No runtime wiring (`$initialize`/`$prepareRuntime`/`$cleanup` stay empty), `$dependencies` stays `[]`.

### 2.3 Events (new — additive)

| Event                                                       | Payload                                                                 | Trigger                             |
| ----------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------- |
| `masters:entity_created` / `_updated` / `_removed`          | `{ entity: { id, name, type }, changes? }`                              | entity create/update/delete         |
| `masters:unit_of_measure_created` / `_updated` / `_removed` | `{ unitOfMeasure: { id, code, category }, changes? }`                   | UOM create/update/delete            |
| `masters:unit_of_measure_activated` / `_deactivated`        | `{ unitOfMeasureId }`                                                   | UOM activate/deactivate             |
| `masters:payment_method_created` / `_updated` / `_removed`  | `{ paymentMethod: { id, name, type }, entityType, entityId, changes? }` | payment method create/update/delete |
| `masters:payment_method_activated` / `_deactivated`         | `{ paymentMethodId, entityType, entityId }`                             | payment method activate/deactivate  |
| `masters:payment_method_primary_set`                        | `{ paymentMethodId, entityType, entityId, direction }`                  | payment method setPrimary           |

### 2.4 ACL resources (new — additive)

```ts
entity: ["create", "read", "update", "delete", "set_status"];
unitOfMeasure: ["activate", "create", "deactivate", "delete", "read", "update"];
paymentMethod: ["activate", "create", "deactivate", "delete", "read", "set_primary", "update"];
```

---

## 3. Phase 0 — Constants & Enums

1. **`@aspen-os/constants`**: add `ENTITY_TYPE` (`customer`/`vendor`/`partner`/`hospital`/`clinic`/`laboratory`/`pharmacy`/`insurer`/`regulator`/`bank`/`staffing_agency`/`training_institute`/`government`/`other`), `ENTITY_STATUS` (`active`/`inactive`/`archived`), `UOM_CATEGORY` (`length`/`mass`/`volume`/`count`/`time`/`area`/`temperature`/`data`/`other`), `PAYMENT_METHOD_TYPE` (`bank_account`/`card`/`upi`/`imps`/`cheque`), `PAYMENT_METHOD_STATUS` (`active`/`inactive`/`archived`), `PAYMENT_METHOD_DIRECTION` (`inbound`/`outbound`/`both`), `CARD_BRAND` (`visa`/`mastercard`/`amex`/`rupay`/`other`). Extend `MASTER_ENTITY_TYPE` with `entity`.
2. **`packages/masters`**: `db-schemas/enums.ts` gains `masterEntityTypeEnum` value `entity` + new `pgEnum`s (`master_entity_type_enum` widened, `master_uom_category_enum`, `master_payment_method_type_enum`, `master_payment_method_status_enum`, `master_payment_method_direction_enum`, `master_card_brand_enum`).
3. Grep sweep `entity\b`/`unit_of_measure`/`payment_method` to confirm no existing symbol collisions.
4. Gate: `cd packages/constants && bun run check:types && bun run check:lint`; rebuild `packages/platform` only if required (constants is raw-src; downstream `masters` resolves via its own `src`).

## 4. Phase 1 — `entity` master

1. Load the `write-module` skill conventions; implement `db-schemas/entity.ts` per §2.1 (all columns alphabetical by TS name, `uuidv7`, indexes).
2. `schemas/entity.ts` valibot: `CreateEntitySchema`, `UpdateEntitySchema` (optional patch, no nullable), `EntityFiltersSchema` (limit/offset `optional(pipe(number(), integer()))`), `EntitySetStatusSchema`. Types via `InferOutput`; separate `export type`/`export` blocks.
3. Workflows `workflows/entity/{create,get,list,update,delete}.ts` + `workflows/entity/status/set.ts` (`setStatus` validates `ENTITY_STATUS` transitions: active ↔ inactive, → archived terminal). `workflow-steps/fetch-entity.ts`. Guard: `code` uniqueness per tenant.
4. Events (`pubsub.ts`) + ACL (`auth.ts`) per §2.3/§2.4. `types.ts` re-exports.
5. Gate: `cd packages/masters && bun run check:lint && bun run check:types && bun run build`.

## 5. Phase 2 — `unit_of_measure` master

1. `db-schemas/unit-of-measure.ts` per §2.1. Self-reference `baseUnitId` is a logical text FK (no DB constraint).
2. `schemas/unit-of-measure.ts`: `CreateUnitOfMeasureSchema` (validation: `baseUnitId` must be a base unit of the same `category`; `conversionFactor` > 0; a new base unit requires no other base unit in the category — unless the existing base is first demoted), `UpdateUnitOfMeasureSchema`, `UnitOfMeasureFiltersSchema`.
3. Workflows `workflows/unit-of-measure/{activate,create,deactivate,delete,get,list,update}.ts` + `workflow-steps/fetch-unit-of-measure.ts`. Business-rule workflow steps: `assertBaseUnitInvariant` (create/update), `assertNoReferencingUnits` (delete — a UOM referenced as `baseUnitId` cannot be deleted).
4. Events + ACL per §2.3/§2.4. `types.ts` re-exports.
5. Gate: `cd packages/masters && bun run check:lint && bun run check:types && bun run build`.

## 6. Phase 3 — `payment_method` master

1. `db-schemas/payment-method.ts` per §2.1. `bankAccountId` logical FK to `master_bank_account`; card columns masked-only.
2. `schemas/payment-method.ts`: `CreatePaymentMethodSchema` with discriminated type-specific validation (`card` → `cardBrand`/`cardLast4`/`cardExpiryMonth`/`cardExpiryYear`; `upi` → `upiId`; `bank_account`/`imps`/`cheque` → `bankAccountId`), `UpdatePaymentMethodSchema`, `PaymentMethodFiltersSchema` (`type`/`direction`/`status`/`entityType`/`entityId`).
3. Workflows `workflows/payment-method/{activate,create,deactivate,delete,get,list,update}.ts` + `workflows/payment-method/primary/set.ts` (unsets prior primary within `(entityType, entityId, direction)`). `workflow-steps/fetch-payment-method.ts`. List queries filter on `(entityType, entityId)`.
4. Events + ACL per §2.3/§2.4. `types.ts` re-exports.
5. Gate: `cd packages/masters && bun run check:lint && bun run check:types && bun run build`.

## 7. Phase 4 — Documentation & Verification

1. Update `packages/masters/docs/`: `overview.mdx` (8 entities, 3 new groups), `db-schemas.mdx` (3 new tables + widened enum), `events.mdx` (+11 events), `workflows.mdx` (+3 groups), `access-control.mdx` (+3 resources). Flesh out `index.mdx` if it enumerates groups.
2. Update `.working-docs/domain-model/masters.md` + `bounded-contexts/masters.md` (new aggregates: Entity, UnitOfMeasure, PaymentMethod; updated invariant list; updated ERD).
3. Update `CONTEXT.md` (Masters domain section — 8 entities, "Current State") and `AGENTS.md` (masters key-dirs/current-state summaries) as needed.
4. **Sweep greps return clean**: repo-wide `master_entity`, `master_unit_of_measure`, `master_payment_method` present in db-schemas and docs; no `entity`/`paymentMethod`/`unitOfMeasure` collisions in `@aspen-os/constants`.
5. **Acceptance criteria**: masters compiles/lints/builds with 8 polymorphic/reference entities; `p.masters.entities`/`unitsOfMeasure`/`paymentMethods` groups callable; UOM base-unit-per-category invariant enforced; payment-method type-specific validation + `setPrimary` per `(entityType, entityId, direction)` enforced; no existing group/event/ACL changed.

## 8. Open Decisions (recommendation first)

- **Entity ownership**: `entity` as a tenant-level owner (added to `master_entity_type`, no `entityType`/`entityId` scope on the row itself) vs. polymorphically scoped (entity belongs to an org/branch). **Recommended: tenant-level owner** with optional `organizationId` link — matches "business entity" reference semantics and lets existing masters scope to it.
- **`unit_of_measure` scoping**: tenant-wide (recommended) vs. polymorphic `(entityType, entityId)` scope. Tenant-wide keeps UOMs as true shared reference data; scoped sets are possible later via a `category`-per-owner join if needed.
- **Payment-method primary scope**: unique primary per `(entityType, entityId, direction)` (recommended — a party can have one default inbound and one default outbound method) vs. per `(entityType, entityId)` alone.
- **Card detail storage**: masked-only `cardLast4`/brand/expiry on the row (recommended, no PCI-sensitive data) vs. full encrypted card token in `kvStore` referenced by a `tokenRef` (future `payments` surface concern, out of scope here).
- **`entity` vs `contact` overlap**: `contact` stays the person/business-relationship record (vendors/clients/insurers); `entity` is the richer business party. Should `entity` be **auto-seeded with a default contact/address on create** (like org seeding, deferred Phase 4 nicety)? **Recommended: yes** if host-app continuity matters; otherwise out of scope.
- **Delete semantics**: hard `delete` (matches existing masters) vs. `archive`-only for `entity`/`payment_method` (reference integrity). **Recommended: keep `delete`** to match Phase 1, with `status = archived` as the non-destructive path.

## 9. Deployment Notes (host app)

`pushSchema` (ADR 0004) never drops tables. All three tables are **additive** — no host migration is required; existing data is untouched. The only enum change is `master_entity_type` gaining `entity` (additive pgEnum value). `@aspen-os/accounting`/`@aspen-os/inventory` (stubs) are the intended future consumers of `payment_method`/`unit_of_measure`; they are **not** wired in this SOW.

## 10. Effort Estimate (Relative)

| Area                               | Complexity | Notes                                                                      |
| ---------------------------------- | ---------- | -------------------------------------------------------------------------- |
| Constants + enums                  | Low        | Additive; sweep for collisions                                             |
| `entity` master                    | Low–Medium | Rich metadata CRUD + setStatus; new owner enum value                       |
| `unit_of_measure` master           | Medium     | Base-unit-per-category invariant, conversion factors, self-reference       |
| `payment_method` master            | **Medium** | Type-discriminated validation, direction/primary scoping, masked card data |
| Docs + working-docs + verification | Medium     | 3 new tables/groups/event sets across docs, domain model, CONTEXT, AGENTS  |

## 11. Out of Scope

- **No payments execution** — this SOW models payment **methods** (config of how money can be received/paid), not transactions, ledgers, gateways, or reconciliation. Actual payment capture lives in the future `accounting`/`payments` module.
- **No full card/credential storage** — masked card data only; no PAN/CVV, no `kvStore` token refs (see §8).
- **No per-owner UOM sets** — UOMs are tenant-wide (§8).
- **No changes to existing masters entities** — contact/address/bank_account/connection/note tables, workflows, events, and ACL resources stay untouched (except the additive `master_entity_type` enum value).
- **No DB-level FK constraints** — all references (entity→organization, payment method→bank_account, UOM→UOM) are logical, per repo convention.
- **No host-app integration code** — the "Recruiter" or a healthcare/ERP host is not in this repo; consumers wire `p.masters.*` themselves.
