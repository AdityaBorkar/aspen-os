# `@aspen-os/comms` Module — Channels, Providers & Notifications (Scope of Work)

> Scope of Work to create a single **`@aspen-os/comms`** module that merges the two planned surfaces from `.working-docs/todo/.md` — **comms** ("Link custom emails, whatsapp, etc to the application") and **notifications** (the notification/inbox surface used throughout the application) — into **one package**. Two channel sources are supported: **tenant-owned channels** (requirement 1 — the user brings their own WhatsApp number / custom email / SMS account through the dashboard) and **host-owned default channels** (requirement 2 — the platform provides default email/SMS delivery capability). Notifications are used throughout the application; the module's consumption seam is the **existing per-module PubSub domain events** that every implemented module already publishes.

## Overview

The module is built on a **three-layer model**:

1. **Channels** — a named _sender_ endpoint (`from` address: WhatsApp number, email address, SMS sender ID) plus the credentials needed to send from it. Requirement 1 and requirement 2 both live here: a channel is either **tenant-owned** (BYOC — credentials supplied by the tenant, stored in the platform `kvStore` via `credentialRef`, exactly like `master_connection`) or **host-owned** (the host's default delivery capability — credentials live with a `comms_provider` record, never in tenant rows).
2. **Notifications** — the persisted record of _what happened / who should see it / its state_ (`unread`/`read`/`dismissed`). The `comms_notification` row **is** the in-app inbox — in-app delivery is zero-extra-work; only out-of-band channel types produce delivery rows.
3. **Messages** — the delivery outbox. One `comms_message` row per outbound send (email/SMS/WhatsApp), with a status lifecycle (`queued → sending → sent → delivered` or `failed`), retries, and provider receipts.

The **recipient** (`to`) is deliberately separate from the **channel** (`from`). Internal recipients (users) resolve through the platform Auth unit; external recipients (contacts) are carried in producer event payloads. This keeps `comms` free of module-to-module table coupling (`$dependencies = []`).

The existing ecosystem is already the producer side: compliance publishes `compliance:document_expiring`/`document_due`, tasks publishes `reminder:fired`, hr publishes `announcement:published`, dms publishes `file:expired`/`file:shared`-class events, management publishes `tenant:*` lifecycle events, and the Auth unit publishes `session:created` (plus `sendVerificationOTP` at `platform/src/server/auth/index.ts:136` currently `console.log`s the OTP). Every module's `"audit-and-notify"` workflow step already writes the **audit** half — `comms` completes the **notify** half by subscribing to those topics (the compliance `event-bridge.ts` pattern, `subscribeSafe` included).

## Confirmed Decisions

| #   | Decision                | Outcome                                                                                                                                                                                                                                                                                                                                                                  |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Single module           | One **`@aspen-os/comms`** package owns channels, providers, notifications, preferences, templates, settings, and delivery. No separate `notifications` package. Package is a build-step module (build script + `build` config block) scaffolded on the dms/organization template.                                                                                        |
| 2   | Three layers            | `channel` (sender) / `notification` (intent + inbox) / `message` (delivery outbox). Requirement 1 and 2 are both **sender-side**; the recipient is a separate concern.                                                                                                                                                                                                   |
| 3   | Channel ownership       | `channelSource` enum `tenant` / `host`. Tenant channels store credentials in the tenant kvStore via `credentialRef` (the `master_connection` pattern — `create`, `test`, `rotateCredential`). Host channels reference a `comms_provider` and carry **no** credential material.                                                                                           |
| 4   | Provider registry       | `comms_provider` is a **control-plane** table (host-admin only, like `management.service_provider`). Host credentials are stored under host/control-plane kvStore keys — never plaintext, never in tenant rows.                                                                                                                                                          |
| 5   | Default channels        | Host default channels are **materialized lazily** per tenant: the channel resolver inserts a deterministic host-owned default channel (per `CHANNEL_TYPE`) the first time a delivery needs one and none is active. Provision-time seeding via `tenant:provisioned` is an optional Phase 5 nicety, not the primary mechanism.                                             |
| 6   | Delivery engine         | A **cron-scan outbox worker** on the existing control-plane pg-boss (the dms `expiry-scanner` / compliance `reminder-engine` pattern) processes `queued` `comms_message` rows. Retries via pg-boss options (`retryBackoff`, `retryDelay`, `retryLimit`). No `comms:deliver` publish/subscribe topic — avoids the producer-without-consumer silent-drop pitfall entirely. |
| 7   | Recipient resolution    | Internal users resolve via the **Auth unit** (`rest.user.get` for email/phone). External recipients (contacts) must be carried in the producer event payload (`recipient: { type, id, email?, phone?, name? }`). No comms→masters / comms→hr table coupling.                                                                                                             |
| 8   | In-app is zero-delivery | The `comms_notification` row **is** the inbox; `markRead`/`dismiss` update the row. Only non-`inapp` channel types produce `comms_message` rows.                                                                                                                                                                                                                         |
| 9   | Routing                 | `notify()` resolution: recipient address → requested channel types → active default channel (tenant BYOC preferred over host default, per `isDefault`) → preference opt-outs → materialize notification + messages. In-app is always materialized unless the user disabled it.                                                                                           |
| 10  | WhatsApp                | Business-initiated WhatsApp messages require **pre-approved templates** — `comms_template.providerTemplateId` (Meta WhatsApp Business Platform). A WhatsApp channel must pass `channels.test` (sender verification) before it can be the default; templates carry provider-template metadata.                                                                            |
| 11  | Consent                 | `comms_preference` rows per `(userId, channelType)` and `(userId, type, channelType)` opt-outs, plus a tenant `suppressOutOfBand` setting. The DPDP/HIPAA-relevant suppression is applied at delivery resolution, not at materialization.                                                                                                                                |
| 12  | Constants               | comms enums live in `@aspen-os/constants` (shared-enum precedent from masters): `CHANNEL_TYPE`, `CHANNEL_SOURCE`, `CHANNEL_STATUS`, `PROVIDER_KIND`, `RECIPIENT_TYPE`, `NOTIFICATION_STATUS`, `NOTIFICATION_SEVERITY`, `MESSAGE_STATUS`.                                                                                                                                 |
| 13  | Module dependencies     | `$dependencies = []`. Units: `{ db, kvStore, pubsub, auth }`. `$initialize` holds `#private` unit refs (management-hybrid getters for `channels` bound to kvStore); `$prepareRuntime()` registers the message sweeper + bridge subscriptions; `$cleanup()` unregisters both.                                                                                             |
| 14  | SOW location            | `.working-docs/sow/comms.md` (this file). The TODO items for "comms" and "notifications" SOWs are covered by this document.                                                                                                                                                                                                                                              |

---

## 1. Channel

The sender endpoint. Covers both requirements: **tenant** channels (BYOC — requirement 1) and **host** channels (requirement 2 defaults).

Table `comms_channel` — **tenant schema**, `comms_` prefix, `uuidv7` PK, timestamps per conventions:

| Field                  | Type                     | Description                                                                                       |
| ---------------------- | ------------------------ | ------------------------------------------------------------------------------------------------- |
| **ID**                 | text (auto)              | UUID v7.                                                                                          |
| **Name**               | text                     | Human label (e.g., `Sales WhatsApp`).                                                             |
| **Type**               | enum                     | `CHANNEL_TYPE`: `email`, `sms`, `whatsapp`, `push`, `other`.                                      |
| **Source**             | enum                     | `CHANNEL_SOURCE`: `tenant` (BYOC) or `host` (host default).                                       |
| **Provider ID**        | text (soft FK, nullable) | → `comms_provider.id` when `source = "host"`; null for raw BYOC channels (tenant-supplied creds). |
| **Sender Address**     | text                     | The `from`: email address / WhatsApp number / SMS sender ID.                                      |
| **Credential Ref**     | text (nullable)          | BYOC → tenant kvStore key holding the provider credential. Null for host channels.                |
| **Status**             | enum                     | `CHANNEL_STATUS`: `active`, `inactive`, `revoked`, `expired`.                                     |
| **Is Default**         | boolean                  | At most one `true` per `(type, entityType, entityId)` scope.                                      |
| **Entity Type**        | enum                     | Polymorphic scope (`MASTER_ENTITY_TYPE` values: `organization`/`branch`/`entity`/…).              |
| **Entity ID**          | text                     | Scope owner.                                                                                      |
| **Verified At**        | timestamptz (nullable)   | Set when `channels.test` succeeds. Required before a channel can be set default.                  |
| **Last Tested At**     | timestamptz (nullable)   | `channels.test` timestamp.                                                                        |
| **Last Used At**       | timestamptz (nullable)   | Last successful send.                                                                             |
| **Metadata**           | jsonb                    | Provider account refs, WhatsApp template ids, provider-specific config.                           |
| **Created/Updated At** | timestamptz              | Conventions.                                                                                      |

**Operations** (`p.comms.channels.*`):

- `create(input)` — **tenant source only** (BYOC). Writes credential to kvStore (`comms:channel:<id>:credential` key scheme), stores `credentialRef`, status `inactive`. Host channels are created by the system (via `ensureDefaults`), never by this workflow.
- `update(id, patch)` — name, senderAddress, metadata; cannot change `type`/`source`.
- `test(id)` — sends a verification message through the provider; sets `verifiedAt`/`lastTestedAt`; on failure keeps status and records error metadata. WhatsApp verification runs the provider's number-verification flow.
- `activate(id)` / `deactivate(id)` — status transitions. Activate requires `verifiedAt`.
- `rotateCredential(id, newCredential)` — kvStore pattern copied from `masters/rotate-credential.ts`: write new ref, swap `credentialRef`, delete old key.
- `setDefault(id)` — clears `isDefault` on the other channels of the same `(type, entityType, entityId)`; requires `active` + `verifiedAt`.
- `ensureDefaults(input?)` — **lazy materialization** (decision 5): for each requested `type` with no active channel of that type in scope, insert a deterministic host-owned default channel from the matching active `comms_provider` (`name: "Default <Type>"`, `senderAddress: provider.defaultSenderAddress`). Idempotent.
- `get(id)` / `list(filters?)` — filters: `type`, `source`, `status`, `entityType`, `entityId`, `isDefault`.
- `delete(id)` — hard delete, guarded: rejected while any non-terminal `comms_message` references the channel; otherwise cascades by nulling `channelId` on historical messages.

**Invariants**: at most one default per `(type, entityType, entityId)`; a default must be `active` and verified; host channels never carry a `credentialRef`; tenant channels never reference a provider.

---

## 2. Provider

The host's delivery capability (requirement 2's backing). Host-admin only, control-plane data.

Table `comms_provider` — **control-plane schema**:

| Field                      | Type            | Description                                                                                       |
| -------------------------- | --------------- | ------------------------------------------------------------------------------------------------- |
| **ID**                     | text (auto)     | UUID v7.                                                                                          |
| **Name**                   | text            | e.g., `Host SES`, `Twilio`, `WhatsApp Business`.                                                  |
| **Kind**                   | enum            | `PROVIDER_KIND`: `smtp`, `ses`, `resend`, `postmark`, `twilio`, `whatsapp_business_api`, `other`. |
| **Credential Ref**         | text (notNull)  | Host kvStore key (control-plane/global tenant context) holding provider secrets.                  |
| **Default Sender Address** | text (nullable) | Provider-level fallback `from` used by materialized host default channels.                        |
| **Is Active**              | boolean         | Deactivated providers are excluded from `ensureDefaults` resolution.                              |
| **Metadata**               | jsonb           | Account ids, verified domains/numbers, webhook endpoints, rate limits.                            |
| **Created/Updated At**     | timestamptz     | Conventions.                                                                                      |

**Operations** (`p.comms.providers.*`): `create`, `update`, `activate`, `deactivate`, `get`, `list`. Credential writes go to kvStore under the host/control-plane context — the provider workflows run in the global tenant, never in a tenant-scoped `run()`.

**ACL**: `provider` resource is **host-admin only** (control-plane). Tenant users never see provider credentials; `channels.list` shows provider `name`/`kind`/`defaultSenderAddress` only.

---

## 3. Notification

The persisted intent + in-app inbox row.

Table `comms_notification` — **tenant schema**:

| Field                  | Type                   | Description                                                                                |
| ---------------------- | ---------------------- | ------------------------------------------------------------------------------------------ |
| **ID**                 | text (auto)            | UUID v7.                                                                                   |
| **Type**               | text                   | Semantic type, e.g. `document_expiring`, `reminder_fired`, `announcement`, `file_expired`. |
| **Title**              | text                   | Short headline.                                                                            |
| **Body**               | text (nullable)        | Full content (plain markdown).                                                             |
| **Severity**           | enum                   | `NOTIFICATION_SEVERITY`: `normal`, `important`, `urgent`.                                  |
| **Source Module**      | text                   | Producing module (`compliance`, `tasks`, `hr`, `dms`, `comms`, `auth`, …).                 |
| **Source Entity**      | `{ type, id }` (jsonb) | The source object the notification refers to.                                              |
| **Recipient Type**     | enum                   | `RECIPIENT_TYPE`: `user`, `contact`.                                                       |
| **Recipient ID**       | text                   | User id (auth/`hr_user`) or contact id (`master_contact`).                                 |
| **To**                 | jsonb                  | Resolved address snapshot at notify time: `{ email?, phone?, name? }`.                     |
| **Channel Types**      | text[]                 | Requested `CHANNEL_TYPE`s (including `inapp`).                                             |
| **Status**             | enum                   | `NOTIFICATION_STATUS`: `unread`, `read`, `dismissed`.                                      |
| **Read At**            | timestamptz (nullable) | When marked read.                                                                          |
| **Metadata**           | jsonb                  | Producer payload extras.                                                                   |
| **Created/Updated At** | timestamptz            | Conventions.                                                                               |

**Operations** (`p.comms.notifications.*`):

- `notify(input)` — the **single entry point** for in-app + out-of-band notification. Input: `{ type, title, body?, severity?, sourceModule?, sourceEntity?, recipient: { type, id, email?, phone?, name? }, channelTypes?, templateId?, metadata? }`. Routing per decision 9: resolve recipient address (Auth unit for users, payload for contacts) → for each requested channel type pick the active default channel (BYOC preferred), falling back to `ensureDefaults` materialization of the host default → apply `comms_preference`/setting opt-outs → insert the `comms_notification` row and (for non-`inapp` channels that survive routing) `comms_message` rows → publish `notification:created` (and `message:queued` per message). Runs inside the caller's tenant context, so in shared mode the rows land in the right RLS scope.
- `getInbox(filters?)` — caller-scoped (`recipientId = actorId`), ordered `severity`/`urgent` → `createdAt` desc; filters `unreadOnly`, `type`, `severity`, `fromDate`, `toDate`.
- `markRead(id)` / `markUnread(id)` / `dismiss(id)` — status transitions; publish `notification:read` / `notification:dismissed`.
- `unreadCount()` — count for badge display.
- `get(id)` / `list(filters?)` — admin/full listing.

**Constraints**: `notify` always materializes the in-app row unless the user's preference disables `inapp` for that `type`; a notification with zero surviving out-of-band channels is still in-app only (never a silent drop — no topic is involved).

---

## 4. Message (delivery outbox)

Table `comms_message` — **tenant schema**:

| Field                        | Type                     | Description                                                           |
| ---------------------------- | ------------------------ | --------------------------------------------------------------------- |
| **ID**                       | text (auto)              | UUID v7.                                                              |
| **Notification ID**          | text (soft FK, nullable) | Owning notification (null for standalone sends, e.g. channel `test`). |
| **Channel ID**               | text (soft FK)           | Channel used (sender endpoint).                                       |
| **Channel Type**             | enum                     | `email`, `sms`, `whatsapp` (never `inapp`).                           |
| **Provider ID**              | text (soft FK, nullable) | Resolved provider at send time.                                       |
| **To**                       | text                     | Recipient address (`email` / `phone` / WhatsApp number).              |
| **Subject**                  | text (nullable)          | Email subject.                                                        |
| **Body**                     | text                     | Rendered body (email HTML/plain, SMS/WhatsApp text, or template ref). |
| **Template ID**              | text (soft FK, nullable) | `comms_template` used; WhatsApp requires a provider template.         |
| **Status**                   | enum                     | `MESSAGE_STATUS`: `queued`, `sending`, `sent`, `delivered`, `failed`. |
| **Attempts**                 | integer                  | Delivery attempts so far.                                             |
| **Last Error**               | text (nullable)          | Last failure message.                                                 |
| **Provider Message ID**      | text (nullable)          | Provider's message id (used for receipt correlation).                 |
| **Queued/Sent/Delivered At** | timestamptz (nullable)   | Lifecycle timestamps.                                                 |
| **Metadata**                 | jsonb                    | Provider receipts payload, template params.                           |
| **Created At**               | timestamptz              | Conventions.                                                          |

**Delivery worker** (`services/delivery-worker.ts`):

- Cron `comms:message-sweeper`, **every minute** (`* * * * *`), registered in `$prepareRuntime()` (dms `expiry-scanner` pattern) and unregistered in `$cleanup()`.
- Scan `queued` messages (batched), each processed in its **own tenant context** — the message batch is read across tenants via the db unit, and each delivery wraps `db.run(tenantId, …)` (isolated: `getTenantDb`; shared: RLS transaction). This is the documented pubsub `wrapHandler` limitation — handlers run against `controlPlaneDb`, so the worker scopes explicitly.
- Adapter send (below) → success: `sent`, set `providerMessageId`, publish `message:sent`; provider receipt webhook later promotes to `delivered` (or `failed` on bounce).
- Failure: increment `attempts`, retry with `retryBackoff`/`retryDelay`/`retryLimit` pg-boss semantics, publish `message:failed` at the final attempt.
- **Provider receipts**: each adapter registers a webhook route/consumer (SES SNS, Twilio status callback, WhatsApp delivery status) that correlates by `providerMessageId` and updates status — see Phase 4.

**Adapters** (`services/adapters/`): a common `DeliveryAdapter` interface (`{ send({ channel, message }): Promise<{ providerMessageId }> }`) with `email.ts` (SES/Resend/SMTP — `@aws-sdk` SES is already in the workspace for storage), `sms.ts` (Twilio), `whatsapp.ts` (Meta WhatsApp Business Platform, template-mandatory), and a `push.ts` **stub** (throws "not configured" — push is out of scope). Each adapter resolves its credential via the channel: `credentialRef` → kvStore for BYOC, provider `credentialRef` for host channels.

---

## 5. Preference

Table `comms_preference` — **tenant schema**:

| Field                  | Type            | Description                                                                                |
| ---------------------- | --------------- | ------------------------------------------------------------------------------------------ |
| **ID**                 | text (auto)     | UUID v7.                                                                                   |
| **User ID**            | text            | Auth user / `hr_user` id.                                                                  |
| **Type**               | text (nullable) | Notification type; `null` = default (applies to all types).                                |
| **Channel Type**       | enum            | `CHANNEL_TYPE` (including `inapp`).                                                        |
| **Enabled**            | boolean         | Opt-out hook (DPDP/HIPAA consent).                                                         |
| **Priority**           | integer         | Routing order across channel types (default: `inapp` 1, `email` 2, `sms` 3, `whatsapp` 4). |
| **Created/Updated At** | timestamptz     | Conventions.                                                                               |

**Resolution**: `(userId, type, channelType)` exact match wins; otherwise the `(userId, null, channelType)` default row; if neither exists, the built-in defaults apply. **Operations** (`p.comms.preferences.*`): `get`, `list`, `set` (upsert one row). Tenant admins may view; each user manages their own rows.

---

## 6. Template

Table `comms_template` — **tenant schema**:

| Field                    | Type            | Description                                                        |
| ------------------------ | --------------- | ------------------------------------------------------------------ |
| **ID**                   | text (auto)     | UUID v7.                                                           |
| **Name**                 | text            | Stable key, e.g. `document-expiring`, `otp-email`, `announcement`. |
| **Channel Type**         | enum            | `email`, `sms`, `whatsapp`.                                        |
| **Subject**              | text (nullable) | Email subject (with `{var}` placeholders).                         |
| **Body**                 | text            | Body template (with `{var}` placeholders).                         |
| **Provider Template ID** | text (nullable) | WhatsApp Business template id / provider-side template reference.  |
| **Is Active**            | boolean         | Inactive templates reject at `notify` time.                        |
| **Metadata**             | jsonb           | Provider language/category, template params schema.                |
| **Created/Updated At**   | timestamptz     | Conventions.                                                       |

**Operations** (`p.comms.templates.*`): `create`, `update`, `activate`, `deactivate`, `get`, `list`. `notify` may pass `templateId`; the renderer (`services/template-renderer.ts`) substitutes `{var}` params from `metadata`. WhatsApp delivery **requires** a template with `providerTemplateId`.

---

## 7. Settings

Table `comms_setting` — **tenant schema**, dms `settings.get/set` pattern:

| Key                                | Type    | Description                                                                                   |
| ---------------------------------- | ------- | --------------------------------------------------------------------------------------------- |
| `defaultChannels`                  | jsonb   | `channelType → channelId` explicit overrides (host defaults are otherwise auto-materialized). |
| `suppressOutOfBand`                | boolean | Tenant-wide kill switch for email/SMS/WhatsApp (in-app unaffected).                           |
| `hostDefaultSenderAddressOverride` | text    | Overrides the provider `defaultSenderAddress` used by materialized host channels.             |

**Operations** (`p.comms.settings.*`): `get`, `set`. Tenant-admin ACL.

---

## 8. Module Surface

```
p.comms.channels      activate, create, deactivate, delete, ensureDefaults, get, list,
                      rotateCredential, setDefault, test, update
p.comms.providers     activate, create, deactivate, get, list, update          (host/admin)
p.comms.notifications dismiss, get, getInbox, list, markRead, markUnread, notify, unreadCount
p.comms.preferences   get, list, set
p.comms.templates     activate, create, deactivate, get, list, update
p.comms.settings      get, set
p.comms.messages      get, list, retry                                      (admin; retry re-queues a failed message)
```

Module structure follows the management-aligned pattern (see `.agents/skills/write-module/SKILL.md`): `src/module.ts` (class, `static create`, `$name = "comms"`, `$dependencies = []`, `$prepareInfra()` → `{ auth: { acl }, db: { control_plane_schemas: { commsProvider }, tenant_schemas: { … } }, events }`), `src/auth.ts` (defineAcl), `src/pubsub.ts` (EventMap), `src/types.ts` (re-exports), `db-schemas/` directory form (one file per table + `enums.ts`), `schemas/` valibot (`Create/Update/Filters`, `InferOutput`), workflows one file per action under `workflows/<entity>/<verb>.ts`, reusable steps in `workflow-steps/`, `services/` for the worker/adapters/resolvers.

- `channels` group is a **management-hybrid getter** bound to `kvStore` (the `masters.connections` pattern — `create`/`rotateCredential`/`test` need the kvStore unit); the other groups are stateless `readonly`.
- `$initialize({ db, kvStore, pubsub, auth })` stores `#private` refs; `#auth` is used by the recipient resolver.
- `$prepareRuntime()`: register the `comms:message-sweeper` cron + handler, then register the **event bridge** subscriptions (Phase 5). `$cleanup()`: unregister both (dms pattern).
- Root `tsconfig.json` reference + `docs/source.config.ts` comms docs source (build-step package; build `config` block so `exports` re-point at `.output/`).

---

## 9. Events (`comms:*`)

| Event                              | Payload                                                              | Trigger                                     |
| ---------------------------------- | -------------------------------------------------------------------- | ------------------------------------------- |
| `comms:channel_created`            | `{ channel: { id, name, type, source, status } }`                    | BYOC channel created.                       |
| `comms:channel_updated`            | `{ channelId, changes }`                                             | Channel edited.                             |
| `comms:channel_status_changed`     | `{ channelId, from, to }`                                            | Activate/deactivate/expire/revoke.          |
| `comms:channel_credential_rotated` | `{ channelId }`                                                      | `rotateCredential`.                         |
| `comms:channel_tested`             | `{ channelId, ok, at }`                                              | `channels.test` result.                     |
| `comms:channel_default_changed`    | `{ channelId, type, isDefault }`                                     | `setDefault` / `ensureDefaults`.            |
| `comms:provider_created`           | `{ provider: { id, name, kind } }`                                   | Host provider created.                      |
| `comms:provider_status_changed`    | `{ providerId, isActive }`                                           | Provider activated/deactivated.             |
| `comms:notification_created`       | `{ notificationId, type, recipientType, recipientId, channelTypes }` | `notify`.                                   |
| `comms:notification_read`          | `{ notificationId, userId, at }`                                     | `markRead`.                                 |
| `comms:notification_dismissed`     | `{ notificationId, userId, at }`                                     | `dismiss`.                                  |
| `comms:message_queued`             | `{ messageId, channelType, to }`                                     | Out-of-band send enqueued.                  |
| `comms:message_sent`               | `{ messageId, providerMessageId }`                                   | Provider accepted.                          |
| `comms:message_delivered`          | `{ messageId, at }`                                                  | Provider receipt (webhook).                 |
| `comms:message_failed`             | `{ messageId, attempts, error }`                                     | Terminal failure.                           |
| `comms:preference_updated`         | `{ userId, type?, channelType, enabled }`                            | `preferences.set`.                          |
| `comms:template_*`                 | `{ templateId, name, isActive? }`                                    | Template create/update/activate/deactivate. |
| `comms:settings_updated`           | `{ changes }`                                                        | `settings.set`.                             |

Typed via `EventMap` in `pubsub.ts`; topics published as plain strings (convention).

---

## 10. RBAC Model

ACL resources (`packages/comms/src/auth.ts`):

```ts
defineAcl({
  channel: [
    "activate",
    "create",
    "deactivate",
    "delete",
    "read",
    "rotateCredential",
    "setDefault",
    "test",
    "update",
  ],
  provider: ["activate", "create", "deactivate", "read", "update"], // host-admin only (control-plane)
  notification: ["create", "read", "update", "delete"],
  preference: ["read", "update"],
  template: ["activate", "create", "deactivate", "read", "update"],
  setting: ["read", "update"],
  message: ["read", "update"], // update = retry, admin
});
```

| Role             | Access                                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| **Host Admin**   | Full `provider` + `channel` lifecycle, `message` read/retry, all settings.                          |
| **Tenant Admin** | Channels (create/test/activate/setDefault/rotate), templates, settings, message read/retry.         |
| **Tenant User**  | `notifications` (inbox, markRead, dismiss), own `preferences`. No channel/template/settings access. |
| **System**       | `notification.create` (event bridge / host app), `channel.ensureDefaults`, worker `message.update`. |

---

## 11. Cross-Module Integrations (Event Bridge)

`services/event-bridge.ts` subscribes to producer topics in `$prepareRuntime()` using the compliance `subscribeSafe` pattern (parse payload with a valibot schema; swallow unknown-topic/no-handler errors so optional producers never crash comms). Handlers run **in the subscribing context** — see the tenant-context implementation note in §4.

| Producer topic                                       | Producer                                | Payload (current)                                                                  | comms handler                                                                                                                                                |
| ---------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `compliance:document_expiring` / `document_due`      | compliance `reminder-engine.ts`         | `{ daysUntilExpiry, documentId, sourceEntityId, sourceModule }`                    | `notify` `type: document_expiring` / `document_due`, severity by `daysUntilExpiry`; **payload must be extended** with the recipient contact/email (see §12). |
| `reminder:fired`                                     | tasks                                   | `{ id, type, userId }`                                                             | `notify` to `recipient: { type: user, id: userId }`; email/phone resolved via Auth unit.                                                                     |
| `announcement:published`                             | hr                                      | `{ announcement: { id, title, channel }, recipientUserIds, recipientEmployeeIds }` | One in-app notification per `recipientUserIds`; out-of-band per preference.                                                                                  |
| `dms:file_expired`                                   | dms                                     | `{ expiryDate, fileId }`                                                           | `notify` to the file owner (resolve via dms payload / soft ref).                                                                                             |
| `masters:contact_created`                            | masters                                 | contact payload                                                                    | (Optional) keep recipient directory fresh — out of scope unless a `contact` recipient is used.                                                               |
| `auth:email_otp_requested` (**new**)                 | platform auth                           | `{ email, tokenRef?, type }`                                                       | Deliver OTP email via the host default email channel — **never persist the OTP** (see §12).                                                                  |
| `management:tenant_provisioned` / `tenant_activated` | management `onboard.ts` / `activate.ts` | `{ tenantId, … }`                                                                  | Optional: warm host default channels for the tenant (`ensureDefaults`); primary mechanism remains lazy.                                                      |
| `workspace:schedule_due` (future)                    | workspace (unbuilt)                     | scheduled-render payload                                                           | Documented target: render + deliver via host default email; implement when workspace lands.                                                                  |

**Ordering / pitfall**: because pg-boss silently drops produces-without-consumers, comms `$prepareRuntime()` must register its subscriptions **before** any producer can publish at runtime — it is constructed with the platform, so it is registered before server traffic. `getUnsubscribedProducedTopics()` in the health check keeps this honest.

**Producers are unchanged for the events they already publish** — the `"audit-and-notify"` steps already publish; comms only adds the missing consumer. The **only producer edits** are payload extensions (§12) and the new `auth:email_otp_requested` publish in the Auth unit.

---

## 12. Producer Payload Extensions (required)

To keep recipient resolution decoupled (decision 7), the following payloads need a small addition at their publish site:

| Producer                                          | Change                                                                                                                                                                                                                                         |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **compliance** (`reminder-engine.ts:115`, `:143`) | Add `recipient: { type: "contact", id, email?, phone?, name? }` (the document's insurer/owner contact) to `DOCUMENT_EXPIRING` / `DOCUMENT_DUE` payloads.                                                                                       |
| **tasks** (`reminder/fired`)                      | Already carries `userId` — no change; comms resolves the user's address via Auth.                                                                                                                                                              |
| **platform auth** (`auth/index.ts`)               | Replace the `console.log` in `sendVerificationOTP` with `pubsub.publish("auth:email_otp_requested", { email, tokenRef, type })` (tokenRef/hashed OTP only — never raw OTP in a queue row). Guarded like `session:created` (`pubsub?.publish`). |

No other module code changes. `dms`, `hr`, `management` payloads are sufficient as-is for their bridge handlers.

---

## 13. Data Model Summary

| Schema        | Table                | Purpose                                                              |
| ------------- | -------------------- | -------------------------------------------------------------------- |
| control-plane | `comms_provider`     | Host delivery capability registry (host credentials via kvStore).    |
| tenant        | `comms_channel`      | Sender endpoints (tenant BYOC + materialized host defaults).         |
| tenant        | `comms_notification` | In-app inbox row + notification intent.                              |
| tenant        | `comms_message`      | Out-of-band delivery outbox (status, retries, receipts).             |
| tenant        | `comms_preference`   | Per-user routing + consent/opt-out.                                  |
| tenant        | `comms_template`     | Email/SMS/WhatsApp templates (WhatsApp requires provider templates). |
| tenant        | `comms_setting`      | Tenant defaults (dms settings pattern).                              |

`comms_channel.entityType` reuses the `MASTER_ENTITY_TYPE` constant values (constants-only, no masters dependency). All tenant tables get RLS in shared mode like every other tenant table; `comms_provider` follows the control-plane pattern (management tables).

---

## 14. Dependencies & Prerequisites

| Dependency                | Reason                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **`@aspen-os/constants`** | New comms enums (§Confirmed Decision 12).                                                                                            |
| **Platform units**        | `db`, `kvStore` (credentialRef), `pubsub` (cron + bridge), `auth` (recipient address resolution).                                    |
| **Producer topics**       | compliance, tasks, hr, dms (existing), management (`tenant:*`), platform auth (new OTP topic).                                       |
| **Provider SDKs**         | SES (`@aws-sdk/client-ses` or reuse the storage S3 dep family), Twilio, Meta WhatsApp Business API — added to the workspace catalog. |
| **`write-module` skill**  | Scaffold `packages/comms` on the dms template (build-step + build `config` block).                                                   |

No module-to-module dependencies — `$dependencies = []`.

---

## 15. Phases

### Phase 0 — Constants & Enums (`@aspen-os/constants`)

1. Add `CHANNEL_TYPE` (`email`/`sms`/`whatsapp`/`push`/`other`), `CHANNEL_SOURCE` (`tenant`/`host`), `CHANNEL_STATUS` (`active`/`inactive`/`revoked`/`expired`), `PROVIDER_KIND` (`smtp`/`ses`/`resend`/`postmark`/`twilio`/`whatsapp_business_api`/`other`), `RECIPIENT_TYPE` (`user`/`contact`), `NOTIFICATION_STATUS` (`unread`/`read`/`dismissed`), `NOTIFICATION_SEVERITY` (`normal`/`important`/`urgent`), `MESSAGE_STATUS` (`queued`/`sending`/`sent`/`delivered`/`failed`).
2. Grep sweep for name collisions (`NOTIFICATION_STATUS`, `CHANNEL_STATUS`, …).
3. Gate: `cd packages/constants && bun run check:types && bun run check:lint && bun run build`.

### Phase 1 — Scaffold `packages/comms`

1. Load the `write-module` skill; scaffold `packages/comms` on the dms template (build script + build `config` block, `#/*` alias).
2. Root `tsconfig.json` reference + `docs/source.config.ts` comms docs source.
3. Implement the seven tables + `db-schemas/index.ts` (`control_plane_schemas: { commsProvider }`, `tenant_schemas: { commsChannel, commsNotification, commsMessage, commsPreference, commsTemplate, commsSetting }`), `db-schemas/enums.ts` pgEnums.
4. `schemas/` valibot (`Create/Update/Filters` for each entity), `auth.ts` ACL (§10), `pubsub.ts` events (§9), `types.ts`.
5. `module.ts`: class + `$dependencies = []` + empty workflow groups (stateless) + `#private` unit refs; `channels` getter stub.
6. Gate: `bun install`; `cd packages/comms && bun run check:lint && bun run check:types && bun run build`.

### Phase 2 — Providers + Channels (requirements 1 & 2)

1. **Providers**: `workflows/provider/*` CRUD + activate/deactivate; kvStore credential writes in host context (`comms:provider:<id>:credential`). Host-admin ACL.
2. **Channels**: `workflows/channel/{create,update,get,list,activate,deactivate,test,setDefault,rotateCredential,delete}`; kvStore credential pattern copied from `masters/workflows/connection/create.ts` + `rotate-credential.ts` (`comms:channel:<id>:credential`).
3. `services/channel-resolver.ts`: `resolveDefault(type, scope)` → active default channel (BYOC preferred) with `ensureDefaults` lazy fallback to the host default; `settings.defaultChannels` override respected.
4. `channels.test` verification semantics (§1 invariants); WhatsApp number verification flow.
5. Gate: lint/types/build per package conventions; sweep greps (`comms_channel`, `channels.` group) clean.

### Phase 3 — Notifications Core (in-app)

1. `services/recipient-resolver.ts`: user → Auth unit (`rest.user.get`) address snapshot; contact → payload-provided address.
2. `services/notification-router.ts`: routing per §3 `notify` (channel selection → preference opt-outs → materialize).
3. `workflows/notification/{notify,get-inbox,mark-read,mark-unread,dismiss,unread-count,get,list}` + `preferences/{get,list,set}` + `settings/{get,set}`.
4. **In-app is fully functional with no adapter** — this is the phase where the module first works end-to-end inside the app.
5. Gate: types/lint/build.

### Phase 4 — Delivery Engine

1. `services/template-renderer.ts` + `workflows/template/*`.
2. `services/adapters/`: `index.ts` (interface + factory), `email.ts` (SES/Resend/SMTP), `sms.ts` (Twilio), `whatsapp.ts` (Meta, template-mandatory), `push.ts` stub.
3. `services/delivery-worker.ts`: `comms:message-sweeper` cron (`* * * * *`), batch scan of `queued`, **per-message tenant context** (§4 implementation note), adapter dispatch, status transitions, pg-boss retry semantics, terminal `failed`.
4. Provider receipt webhooks: adapter-registered consumers correlating `providerMessageId` → `delivered`/`failed`.
5. `workflows/message/{get,list,retry}` (admin).
6. `workflows/notification/notify.ts` now enqueues `comms_message` rows for out-of-band channels that survive routing.
7. Gate: types/lint/build; manual sweep with a fake provider adapter (no external network in gates).

### Phase 5 — Domain Event Bridge + Producer Wiring

1. `services/event-bridge.ts`: `subscribeSafe` subscriptions for the §11 table (compliance, tasks, hr, dms, management); each handler → `notification-router`.
2. **Producer edits** (§12): compliance payload extensions (`reminder-engine.ts:115`,`:143`); auth unit `auth:email_otp_requested` publish replacing the OTP `console.log` (`auth/index.ts:136-138`).
3. Tenant lifecycle seeding (optional): subscribe `tenant_provisioned`/`tenant_activated` → `channels.ensureDefaults` per tenant.
4. Gate: rebuild platform + affected packages; `getUnsubscribedProducedTopics()` shows no comms topics unsubscribed; run a full lint/types/build sweep across `compliance`, `tasks`, `hr`, `dms`, `auth`, `comms`.

### Phase 6 — Documentation & Verification

1. `packages/comms/docs/` (`overview.mdx`, `access-control.mdx`, `db-schemas.mdx`, `events.mdx`, `workflows.mdx`).
2. `.working-docs/`: new `domain-model/comms.md` + `bounded-contexts/comms.md`; update `CONTEXT.md` + `AGENTS.md` (fully-implemented list, key dirs, module pattern, current state); mark the TODO comms/notifications SOW items as covered by `sow/comms.md`.
3. Docs build: `cd docs && bunx fumadocs-mdx` (if `.source/` missing) then `check:types` + `build`.
4. Sweep greps return clean: `@aspen-os/notifications`, `comms:deliver`, `notification-bridge` leftovers, `console.log(.*otp` (case-insensitive) in `platform/src/server/auth`.
5. **Acceptance criteria**: comms compiles/lints/builds; BYOC channels CRUD/test/rotate/setDefault work with credentials only in kvStore; host default channels materialize lazily; in-app inbox works with zero adapters; email/SMS/WhatsApp delivery works with provider SDKs; bridge materializes notifications from the five producers; OTP goes through comms, not console.

---

## 16. Deployment Notes (host app)

- `pushSchema` (ADR 0004) never drops — greenfield module, so only adds; no drops required. The `comms_provider` control-plane table must be pushed alongside the management control-plane tables.
- Shared-mode tenancy: tenant `comms_*` tables get RLS policies via `db.prepareWithModules()` automatically; host provider workflows run in the control-plane context (no RLS).
- Provider secrets: provision host kvStore entries (`comms:provider:<id>:credential`) out-of-band before activating providers.
- WhatsApp: the host must complete Meta Business verification and template approval; per-tenant WhatsApp channels run the `test` flow to verify the tenant's number.

## 17. Open Decisions (recommendation first)

- **Provider placement**: control-plane table (recommended — one host-owned registry, matches `management.service_provider`) vs tenant table. Control-plane chosen in §1/§2.
- **Default-channel materialization**: lazy on first need (recommended — correct tenant context, no platform plumbing) vs provision-time seeding via `tenant:provisioned` (optional Phase 5 add-on).
- **Direct `notify` API vs event-only**: both (recommended) — event bridge for cross-module decoupling, direct `notify` for host apps and in-module workflows that don't publish events.
- **OTP in auth event**: tokenRef/hashed value only (recommended — never raw OTP in a queue row) vs raw OTP (rejected).
- **Push channel**: stub adapter that throws "not configured" (recommended) vs fully out of scope.
- **`session:created` security alerts**: out of scope initially (recommended) vs in bridge phase.
- **BYOC channel delete**: hard delete guarded against non-terminal messages (recommended) vs soft delete (status `revoked`).

## 18. Effort Estimate (Relative)

| Area                                                        | Complexity  | Notes                                                                          |
| ----------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------ |
| Constants + enums                                           | Low         | Add + sweep.                                                                   |
| Scaffold + 7 tables + schemas + ACL + events                | Medium      | Standard module scaffolding on the dms template.                               |
| Providers + channels (kvStore creds, test/rotate, defaults) | Medium–High | Credential lifecycle + verification + lazy defaults; masters-connection port.  |
| Notification core + preferences + inbox                     | Medium      | Router logic (recipient → channels → opt-outs → materialize).                  |
| Delivery engine (adapters, sweeper, receipts)               | **High**    | Provider SDKs, tenant-context handling, retries, webhooks, WhatsApp templates. |
| Event bridge + producer payload extensions                  | Medium      | Five subscriptions + compliance/auth edits.                                    |
| Docs + verification                                         | Medium      | Package docs, working-docs, CONTEXT/AGENTS, sweep greps.                       |

## 19. Out of Scope

- **Push notifications** — `push` channel type exists in enums + stub adapter only.
- **Real-time delivery** (WebSocket/SSE) — the inbox is pull-based; a future `realtime` surface can read `comms_notification` rows.
- **Message threads / chat / replies** — that's the future `org_chat`/`discussions` surface, not comms.
- **Direct email/SMS from other modules** — all out-of-band delivery must route through comms channels/messages.
- **Announcements authoring** — hr owns it (`hr-announcements` SOW); comms only delivers `announcement:published`.
- **Workspace scheduled rendering** — workspace emits `workspace:schedule_due`; comms consumes it when workspace lands (documented, §11).
- **Recipient directory / contact sync** — comms never reads `masters`/`hr` tables; addresses come from the Auth unit or producer payloads.
- **Data migration tooling** — greenfield module; host-app deployment notes in §16.
- **Host app / example** — module only.
