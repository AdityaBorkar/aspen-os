# Units

## (Framework Type) Unit

- Single Tenant
- Multi Tenant (DB with RLS)
- Multi Tenant (Isolated DB)
  - lru-cache to manage multiple pools (Use the same in Durable Objects for Serverless Executions)

## Auth Unit

- Better Auth Plugins:
  - i18n
  - CAPTCHA
  - Have I been pawned? / Password Strength
  - Dashboard
  - Audit Logs
  - Sentinel
  - OIDC
  - OAuth
  - SSO
  - SCIM
  - Agent Auth
  - MCP
  - Multi-Session
- https://better-auth.com/docs/guides/optimizing-for-performance
- Expand to configuring all options for `better-auth`

## i18n Unit

- 

## RPC Unit

- 

## Log Unit

- Logging server on the same machine. Only ensure to have 24x7 backups till the last minute to ensure continuous logging.
- Ensure a backup option to spin up a standalone log-viewer server to view logs remotely.

## Workflows Unit

- 

## Notification Unit

-
