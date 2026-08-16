# Comms Domain Model

> Package: `@aspen-os/comms`. Notification + out-of-band delivery on a **three-layer model**: a channel is a _sender_ endpoint (`from`), a notification is the persisted intent + inbox row, a message is the delivery outbox (`to`). Recipient and channel are deliberately separate — comms reads no other module's tables. One control-plane table (`comms_provider`), six tenant tables (`comms_` prefix).

## Entity-Relationship Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                       COMMS DOMAIN                                 │
│                                                                    │
│  ┌──────────────────┐        ┌────────────────────┐                │
│  │ Provider         │1:0..N  │ Channel            │                │
│  │ (control-plane)  │────────→│ (tenant)           │                │
│  │ id / name        │ providerId (soft FK)        │                │
│  │ kind (enum)      │        │ type/source        │                │
│  │ credentialRef →  │        │ senderAddress      │                │
│  │  host kvStore    │        │ credentialRef →    │                │
│  │ isActive         │        │  tenant kvStore    │                │
│  │ defaultSenderAddress      │ status / isDefault │                │
│  └──────────────────┘        │ entityType/entityId│                │
│                              │ verifiedAt         │                │
│                              └────────┬───────────┘                │
│                                       │ 1:N (message.channelId)    │
│                                       ▼                            │
│  ┌──────────────────┐        ┌────────────────────┐                │
│  │ Notification     │1:0..N  │ Message            │                │
│  │ (tenant)         │────────→│ (tenant, outbox)   │                │
│  │ type/title/body  │ notificationId (soft FK)     │                │
│  │ severity (enum)  │        │ channelType/to     │                │
│  │ recipientType/id │        │ status (queued →   │                │
│  │ to (snapshot)    │        │  sending → sent →  │                │
│  │ channelTypes[]   │        │  delivered/failed) │                │
│  │ status (unread/  │        │ attempts/retries   │                │
│  │  read/dismissed) │        │ providerMessageId  │                │
│  │ sourceModule/    │        └────────┬───────────┘                │
│  │ sourceEntity     │                 │ templateId (soft FK)       │
│  └──────────────────┘                 ▼                            │
│                                       ┌────────────────────┐        │
│                                       │ Template           │        │
│                                       │ name / channelType │        │
│                                       │ subject/body {var} │        │
│                                       │ providerTemplateId │        │
│                                       │ isActive           │        │
│                                       └────────────────────┘        │
│                                                                    │
│  ┌──────────────────┐  ┌────────────────────┐                     │
│  │ Preference       │  │ Setting            │                     │
│  │ userId/type      │  │ key (uniq)         │                     │
│  │ channelType      │  │ value (jsonb)      │                     │
│  │ enabled/priority │  │ (defaultChannels,  │                     │
│  │ (type null =     │  │  suppressOutOfBand,│                     │
│  │  default row)    │  │  hostDefaultSender │                     │
│  └──────────────────┘  └────────────────────┘                     │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

## Glossary

| Term            | Definition                                                                                                                                                                                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Channel         | A named sender endpoint (`from`: email address, WhatsApp number, SMS sender ID) plus the credentials needed to send from it. `tenant` (BYOC — credentials in the tenant kvStore via `credentialRef`) or `host` (references a `comms_provider`; no credential material). |
| Provider        | The host's delivery capability registry (control-plane). Host credentials live in the host kvStore; never in tenant rows.                                                                                                                                               |
| Notification    | The persisted intent + in-app inbox row (`comms_notification`). The row **is** the inbox — in-app delivery is zero-extra-work.                                                                                                                                          |
| Message         | The delivery outbox (`comms_message`). One row per outbound send; status lifecycle `queued → sending → sent → delivered/failed`; retries; provider receipts.                                                                                                            |
| Recipient       | The `to`: an internal user (resolved via the Auth unit) or an external contact (address carried in the producer payload).                                                                                                                                               |
| Default channel | At most one `isDefault` per `(type, entityType, entityId)`. Host defaults materialize lazily; a default must be `active` and verified.                                                                                                                                  |
| Preference      | Per-user routing + consent rows: `(userId, type, channelType)` opt-outs, plus the `(userId, null, channelType)` default row.                                                                                                                                            |
| `inapp`         | A notification-routing-only pseudo channel type. Never a real channel; preferences and notification `channelTypes` may reference it.                                                                                                                                    |

## Enums

From `@aspen-os/constants` (shared-enum precedent from masters): `CHANNEL_TYPE` (`email`/`sms`/`whatsapp`/`push`/`other`), `CHANNEL_SOURCE` (`tenant`/`host`), `CHANNEL_STATUS` (`active`/`inactive`/`revoked`/`expired`), `PROVIDER_KIND` (`smtp`/`ses`/`resend`/`postmark`/`twilio`/`whatsapp_business_api`/`other`), `RECIPIENT_TYPE` (`user`/`contact`), `NOTIFICATION_STATUS` (`unread`/`read`/`dismissed`), `NOTIFICATION_SEVERITY` (`normal`/`important`/`urgent`), `MESSAGE_STATUS` (`queued`/`sending`/`sent`/`delivered`/`failed`).

## Invariants

- At most one default per `(type, entityType, entityId)`; a default must be `active` and verified.
- Host channels never carry a `credentialRef`; tenant channels never reference a provider.
- Credentials live only in kvStore — BYOC under `comms:channel:<id>:credential` (tenant scope), providers under `comms:provider:<id>:credential` (control-plane scope).
- `notify` always materializes the in-app row unless the user's preference disables `inapp`; out-of-band messages only for channels that survive routing.
- WhatsApp delivery requires a template with `providerTemplateId` (Meta pre-approved templates).
- The OTP is never persisted: the auth unit publishes only `{ email, tokenRef, type }` and the bridge delivers inline.
