# Organization Domain Model (Removed)

> There is no `packages/organization` on disk. The former organization module's surface now lives in **Masters** (`p.masters.orgBranches`: `create`, `get`, `list`, `tree`, `update` over the `org_branch` table) and **Management** (`p.management.organizations`, control-plane read model). Organization profile fields (name, branding, logo) live in Masters settings (`org.*` keys). Do not import `@aspen-os/organization` — it does not exist.

## Where the concepts went

- **Branch** → Masters `Org Branch` (`org_branch`, no `master_` prefix): `name`, unique `code`, `type` (`headquarters`/`office`/`warehouse`/`store`/`factory`/`remote`/`other`), optional `parent_org_branch` tree. See `domain-model/masters.md`.
- **Organization profile** → Masters settings (`org.id`, `org.branding`, `org.logo`, tenant-wide) + `management.organizations` read projection. See `domain-model/masters.md` and `domain-model/management.md`.
- **Contacts / addresses / connections** → Masters `Contact` / `Address` / `Connection` (integration credential). There is no `master_bank_account` table — bank details are inline fields on the payment method.
- **Notes** → `@aspen-os/notes` (`scopeType = masters:<entityType>`).

## Historical events

`branch.created` / `branch.updated` were superseded by `masters.org_branch_created` / `masters.org_branch_updated`. Compliance subscribes to `masters.org_branch_created` (trade license + fire safety certificate + annual obligation).
