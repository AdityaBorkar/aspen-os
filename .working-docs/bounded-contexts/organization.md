# Organization Context (Removed)

> There is no `packages/organization` on disk. The former organization module's surface now lives in **Masters** (`p.masters.orgBranches`: `create`, `get`, `list`, `tree`, `update` over the `org_branch` table) and **Management** (`p.management.organizations`, control-plane read model). Organization profile fields (name, branding, logo) live in Masters settings (`org.*` keys). Do not import `@aspen-os/organization` — it does not exist.

## Relationship Type

None (removed). Formerly downstream of the Platform; `$dependencies = []`, stateless.

## Where the surface went

- `p.organization.branches` → `p.masters.orgBranches` (same five actions).
- Organization profile → Masters settings (`org.*` tenant-wide keys) + `p.management.organizations`.
- Contacts / addresses / connections → Masters `Contact` / `Address` / `Connection`.
- Notes → `@aspen-os/notes`.

## Cross-context integration

- **Compliance** subscribes to `masters.org_branch_created` (trade license + fire safety certificate + annual obligation).
- **Management** provisions tenants against the better-auth org ID; the organization profile is stored as `org.*` settings in Masters.

## Language

- Org Branch (`masters.org_branch`, `tree`), Setting (`org.*` tenant-wide)
- Avoid: `@aspen-os/organization` (does not exist), Company (for Organization), Tenant (different concept — see Management), Location/Site (for Branch)
