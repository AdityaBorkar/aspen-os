# Units

- Manually read and simplify the `platform` code as much as possible
- Ensure good code architecture
- Ensure schemas, unlocked postgres tables and signoz integration.

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
- Logging: OTEL + Signoz Integration
  - Ensure structured logging (https://loggingsucks.com/) is compliant with OTEL. Aim is to implement the structured logging using OTEL to maintain a single source of universal logging.
  - --verbose flag for debugging in the `platform`. Take input a debugLogsDir: "./local/dir/" and store the logs there. Use the request time as the log file name for easier navigation.

## Workflows Unit

- Examples
  - https://activiti.org/
  - https://flowable.com/
  - https://temporal.io/
  - https://hatchet.run/
  - https://restate.dev/
  - https://inngest.com/

## Notification Unit

-

## Audit Unit

- Blind Writes
- WAL Outbox
- Replicated State
