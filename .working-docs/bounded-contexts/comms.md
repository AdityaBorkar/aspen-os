# Comms Context

> Package: `@aspen-os/comms`. The notification/inbox + out-of-band delivery module — channels (sender endpoints), host providers, the in-app inbox, and the delivery outbox. Merges the planned "comms" and "notifications" surfaces into one package (`.working-docs/sow/comms.md`).

## Relationship Type

Downstream of the Platform (Customer–Supplier) and of every module that publishes domain events. **Conformist** to the Auth unit for recipient address resolution. Runtime-wired — receives `{ db, kvStore, pubsub, auth }` via `$initialize(units)`, stores them in a module singleton (`runtime.ts`), registers the message sweeper + event-bridge subscriptions in `$prepareRuntime()`.

## Structure (`packages/comms/`)

- `Comms.create(config?)` — factory returning a Module instance; `$name = "comms"`, `$dependencies = []` (no module deps)
- 7 workflow groups: `channels` (getter bound to `kvStore` + `db`), `providers` (getter bound to `kvStore`), and stateless `readonly` `notifications`, `preferences`, `templates`, `settings`, `messages`
- Services: `channel-resolver` (lazy default resolution + `ensureDefaults` fallback), `recipient-resolver` (Auth unit), `notification-router` (routing/opt-outs), `template-renderer` (`{var}` substitution), `delivery-worker` (cron sweeper + per-message tenant context + retries), `receipts` (webhook correlation), `credential-service` (kvStore resolution), `settings-service`, `adapters/` (`email`, `sms`, `whatsapp`, `push` stub)
- 5 reusable `WorkflowStep`s (`fetch-*`): channel, provider, notification, template, message
- 7 database tables: `comms_provider` (control-plane) + `comms_channel`, `comms_notification`, `comms_message`, `comms_preference`, `comms_template`, `comms_setting` (tenant)
- 9 pgEnums; enum values shared from `@aspen-os/constants` (decision 12)
- 29 domain events across 7 maps (`CHANNEL_EVENTS` 6, `PROVIDER_EVENTS` 2, `NOTIFICATION_EVENTS` 3, `MESSAGE_EVENTS` 4, `PREFERENCE_EVENTS` 1, `TEMPLATE_EVENTS` 4, `SETTING_EVENTS` 1) → `CommsEventMap`
- 7 ACL resources: `channel`, `provider` (host-admin, control-plane), `notification`, `preference`, `template`, `setting`, `message`
- `$prepareRuntime()` — registers `comms:message-sweeper` cron (`* * * * *`) + handler and 8 event-bridge subscriptions; `$cleanup()` unregisters both
- Has a build step (build script + `build` field in package.json)

## Exposed on the platform instance

```
p.comms.channels      { activate, create, deactivate, delete, ensureDefaults, get, list,
                        rotateCredential, setDefault, test, update }        (kvStore/db-bound)
p.comms.providers     { activate, create, deactivate, get, list, update }   (kvStore-bound, host)
p.comms.notifications { dismiss, get, getInbox, list, markRead, markUnread, notify, unreadCount }
p.comms.preferences   { get, list, set }
p.comms.templates     { activate, create, deactivate, get, list, update }
p.comms.settings      { get, set }
p.comms.messages      { get, list, retry }
```

## Consumed topics (event bridge)

`compliance:document_expiring` / `document_due`, `calendar:reminder_due`, `dms:file_expired`, `announcement:published` (hr, planned), `management:tenant_provisioned` / `tenant_activated`, `auth:email_otp_requested` (new). Subscription pattern copied from compliance's `event-bridge.ts` (`subscribeSafe`).

## Producer extensions

- **compliance** — `reminder-engine` payloads gain `recipient: { type: "user", id }` (the document's `assignedTo ?? createdBy`).
- **dms** — `expiry-scanner`'s `dms:file_expired` payload gains `ownerId`.
- **platform auth** — `sendVerificationOTP` no longer `console.log`s the OTP: it stores the OTP in a short-lived token store, publishes `auth:email_otp_requested` with `{ email, tokenRef, type }`, and exposes `rest.otp.get(tokenRef)` for inline delivery.

## Lineage

Single module created from `.working-docs/sow/comms.md` (Phase 0–6 complete). Replaces the planned "comms" and "notifications" SOW items in `.working-docs/todo/.md`. The former `reminder:fired` producer seam (tasks) is handled via its live replacement `calendar:reminder_due`.

## Language

- Channel, Provider, Notification, Message, Recipient, Default Channel, Preference, Template, In-app, Out-of-band, BYOC, host default, `notify`, `comms:message-sweeper`
- Avoid: notifications package (single comms module), `comms:deliver` topic (cron-scan outbox instead), drive/parallel file model, raw OTP on a queue
