import type { CommsProvider } from "#/db-schemas/provider";
import type { ProviderCredential } from "#/schemas/channel";
import { createAdapter } from "#/services/adapters/index";
import { resolveProviderCredential } from "#/services/credential-service";
import { findFirstActiveProvider } from "#/services/providers";
import {
  EMAIL_PROVIDER_KINDS,
  OTP_BODY_TEMPLATE,
  OTP_FALLBACK_SENDER,
  OTP_SUBJECT,
} from "#/utils/constants";
import { renderTemplate } from "#/workflow-steps/template-renderer";
import { ensureDefaults } from "#/workflows/channel/ensure-defaults";
import { createNotify } from "#/workflows/notification/notify";

import type {
  AuditUnit,
  AuthUnit,
  DatabaseUnit,
  InferSchemaOutput,
  KvStoreUnit,
  LogUnit,
  PubSubUnit,
  StandardSchema,
} from "@aspen-os/platform/server";
import { isGlobalTenantId } from "@aspen-os/platform/server";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { array, nullish, number, object, optional, string } from "valibot";

const RecipientRefSchema = object({
  id: string(),
  type: string(),
});

const DocumentExpiringEventSchema = object({
  daysUntilExpiry: number(),
  documentId: string(),
  recipient: optional(RecipientRefSchema),
  sourceEntityId: nullish(string()),
  sourceModule: string(),
});

const DocumentDueEventSchema = object({
  daysUntilDue: number(),
  documentId: string(),
  recipient: optional(RecipientRefSchema),
  sourceEntityId: nullish(string()),
  sourceModule: string(),
});

const ReminderDueEventSchema = object({
  remindAt: string(),
  reminder: object({
    id: string(),
    message: nullish(string()),
    userId: string(),
  }),
});

const FileExpiredEventSchema = object({
  expiryDate: nullish(string()),
  fileId: string(),
  ownerId: string(),
});

const AnnouncementPublishedEventSchema = object({
  announcement: object({
    id: string(),
    title: string(),
  }),
  recipientUserIds: array(string()),
});

const TenantLifecycleEventSchema = object({
  tenantId: string(),
});

const OtpRequestedEventSchema = object({
  email: string(),
  tokenRef: string(),
  type: string(),
});

export interface EventBridgeDeps {
  audit: AuditUnit;
  auth: AuthUnit;
  db: PostgresJsDatabase;
  dbUnit: DatabaseUnit;
  kvStore: KvStoreUnit;
  log?: LogUnit;
  pubsub: PubSubUnit;
}

async function subscribeValidated<TSchema extends StandardSchema>(
  deps: EventBridgeDeps,
  subscription: {
    handler: (data: InferSchemaOutput<TSchema>, deps: EventBridgeDeps) => Promise<void>;
    schema: TSchema;
    topic: string;
  },
): Promise<boolean> {
  const { handler, schema, topic } = subscription;
  try {
    await deps.pubsub.subscribe(topic, async (message) => {
      const result = await schema["~standard"].validate(message.data);
      if (result.issues) {
        deps.log?.warn(`Ignoring malformed event on "${topic}".`, { topic });
        return;
      }
      try {
        await handler(result.value, deps);
      } catch (error) {
        deps.log?.error(
          `Event handler for "${topic}" failed.`,
          error instanceof Error ? error : new Error(String(error)),
          { topic },
        );
        throw error;
      }
    });
    return true;
  } catch (error) {
    deps.log?.warn(`Skipping event subscription for "${topic}".`, {
      error: error instanceof Error ? error.message : String(error),
      topic,
    });
    return false;
  }
}

export async function registerEventBridgeSubscriptions(deps: EventBridgeDeps): Promise<string[]> {
  const topics: string[] = [];
  const add = async <TSchema extends StandardSchema>(
    topic: string,
    schema: TSchema,
    handler: (data: InferSchemaOutput<TSchema>, deps: EventBridgeDeps) => Promise<void>,
  ): Promise<void> => {
    const subscribed = await subscribeValidated(deps, { handler, schema, topic });
    if (subscribed) {
      topics.push(topic);
    }
  };

  await add("compliance:document_expiring", DocumentExpiringEventSchema, (data, target) =>
    handleDocumentExpiring(data, target),
  );
  await add("compliance:document_due", DocumentDueEventSchema, (data, target) =>
    handleDocumentDue(data, target),
  );
  await add("calendar:reminder_due", ReminderDueEventSchema, (data, target) =>
    handleReminderDue(data, target),
  );
  await add("dms:file_expired", FileExpiredEventSchema, (data, target) =>
    handleFileExpired(data, target),
  );
  await add("announcement:published", AnnouncementPublishedEventSchema, (data, target) =>
    handleAnnouncementPublished(data, target),
  );
  await add("management:tenant_provisioned", TenantLifecycleEventSchema, (data, target) =>
    handleTenantLifecycle(data.tenantId, target),
  );
  await add("management:tenant_activated", TenantLifecycleEventSchema, (data, target) =>
    handleTenantLifecycle(data.tenantId, target),
  );
  await add("auth:email_otp_requested", OtpRequestedEventSchema, (data, target) =>
    handleOtpRequested(data, target),
  );
  return topics;
}

export async function unregisterEventBridge(
  topics: string[],
  { pubsub }: Pick<EventBridgeDeps, "pubsub">,
): Promise<void> {
  await Promise.all(
    topics.map(async (topic) => {
      try {
        await pubsub.unsubscribe(topic);
      } catch (error) {
        console.warn(`Failed to unsubscribe event topic "${topic}": ${String(error)}`);
      }
    }),
  );
}

interface DocumentNotification {
  days: number;
  documentId: string;
  kind: "document_due" | "document_expiring";
  recipientId: string;
}

async function notifyDocument(input: DocumentNotification, deps: EventBridgeDeps): Promise<void> {
  const notify = createNotify(deps.dbUnit);
  await notify.run(
    {
      input: {
        recipient: { id: input.recipientId, type: "user" },
        severity: severityForDays(input.days),
        sourceEntity: { id: input.documentId, type: "document" },
        sourceModule: "compliance",
        title: `Compliance document ${input.kind === "document_due" ? "due" : "expiring"} in ${input.days} day${input.days === 1 ? "" : "s"}`,
        type: input.kind,
      },
    },
    runOptions(deps),
  );
}

async function handleDocumentExpiring(
  event: InferSchemaOutput<typeof DocumentExpiringEventSchema>,
  deps: EventBridgeDeps,
): Promise<void> {
  if (!event.recipient) {
    deps.log?.warn("Ignoring document_expiring event without recipient.");
    return;
  }
  await notifyDocument(
    {
      days: event.daysUntilExpiry,
      documentId: event.documentId,
      kind: "document_expiring",
      recipientId: event.recipient.id,
    },
    deps,
  );
}

async function handleDocumentDue(
  event: InferSchemaOutput<typeof DocumentDueEventSchema>,
  deps: EventBridgeDeps,
): Promise<void> {
  if (!event.recipient) {
    deps.log?.warn("Ignoring document_due event without recipient.");
    return;
  }
  await notifyDocument(
    {
      days: event.daysUntilDue,
      documentId: event.documentId,
      kind: "document_due",
      recipientId: event.recipient.id,
    },
    deps,
  );
}

async function handleReminderDue(
  event: InferSchemaOutput<typeof ReminderDueEventSchema>,
  deps: EventBridgeDeps,
): Promise<void> {
  const notify = createNotify(deps.dbUnit);
  await notify.run(
    {
      input: {
        recipient: { id: event.reminder.userId, type: "user" },
        sourceEntity: { id: event.reminder.id, type: "reminder" },
        sourceModule: "calendar",
        title: event.reminder.message ?? "Reminder",
        type: "reminder_fired",
      },
    },
    runOptions(deps),
  );
}

async function handleFileExpired(
  event: InferSchemaOutput<typeof FileExpiredEventSchema>,
  deps: EventBridgeDeps,
): Promise<void> {
  const notify = createNotify(deps.dbUnit);
  await notify.run(
    {
      input: {
        recipient: { id: event.ownerId, type: "user" },
        sourceEntity: { id: event.fileId, type: "dms_file" },
        sourceModule: "dms",
        title: "A file in your workspace has expired",
        type: "file_expired",
      },
    },
    runOptions(deps),
  );
}

const ANNOUNCEMENT_FANOUT = 10;

async function handleAnnouncementPublished(
  event: InferSchemaOutput<typeof AnnouncementPublishedEventSchema>,
  deps: EventBridgeDeps,
): Promise<void> {
  const notify = createNotify(deps.dbUnit);
  // oxlint-disable eslint/no-await-in-loop
  for (let index = 0; index < event.recipientUserIds.length; index += ANNOUNCEMENT_FANOUT) {
    const chunk = event.recipientUserIds.slice(index, index + ANNOUNCEMENT_FANOUT);
    const outcomes = await Promise.allSettled(
      chunk.map(async (userId) =>
        notify.run(
          {
            input: {
              recipient: { id: userId, type: "user" },
              sourceEntity: { id: event.announcement.id, type: "announcement" },
              sourceModule: "hr",
              title: event.announcement.title,
              type: "announcement",
            },
          },
          runOptions(deps),
        ),
      ),
    );
    for (const outcome of outcomes) {
      if (outcome.status === "rejected") {
        const { reason } = outcome;
        deps.log?.error(
          "Announcement fan-out failed for a recipient.",
          reason instanceof Error ? reason : new Error(String(reason)),
        );
      }
    }
  }
  // oxlint-enable eslint/no-await-in-loop
}

async function handleTenantLifecycle(tenantId: string, deps: EventBridgeDeps): Promise<void> {
  if (isGlobalTenantId(tenantId)) {
    return;
  }

  const ensure = ensureDefaults(deps.dbUnit);
  const run = (db: PostgresJsDatabase) =>
    ensure.run(
      { input: { entityId: tenantId, entityType: "organization" } },
      { audit: deps.audit, db, log: deps.log, pubsub: deps.pubsub },
    );

  if (deps.dbUnit.tenancyMode === "isolated") {
    await run(await deps.dbUnit.getTenantDb(tenantId));
    return;
  }

  // SAFETY: runWithTenant hands the callback a session-scoped drizzle instance
  // whose surface matches the workflow db type; the generic parameter is erased.
  await deps.dbUnit.runWithTenant(tenantId, (db) => run(db));
}

async function handleOtpRequested(
  event: InferSchemaOutput<typeof OtpRequestedEventSchema>,
  deps: EventBridgeDeps,
): Promise<void> {
  const provider = await findFirstActiveProvider(deps.db, [...EMAIL_PROVIDER_KINDS]);
  if (!provider) {
    deps.log?.error(
      "Dropping OTP email: no active email provider.",
      new Error("no active email provider"),
      { email: event.email },
    );
    throw new Error("Cannot send OTP email: no active email provider.");
  }

  const credential = await resolveOtpCredential(provider, deps);

  const stored = await deps.auth.rest.otp.get(event.tokenRef);
  if (!stored) {
    deps.log?.warn("Dropping OTP email: token expired or unknown.", { tokenRef: event.tokenRef });
    return;
  }

  const senderAddress = provider.default_sender_address ?? OTP_FALLBACK_SENDER;
  if (!provider.default_sender_address) {
    deps.log?.warn("OTP email uses fallback sender address.", { providerId: provider.id });
  }

  const adapter = createAdapter("email");
  await adapter.send({
    channel: { sender_address: senderAddress },
    credential,
    kind: provider.kind,
    message: {
      body: renderTemplate(OTP_BODY_TEMPLATE, { otp: stored.otp }),
      subject: OTP_SUBJECT,
      to: event.email,
    },
  });
}

async function resolveOtpCredential(
  provider: CommsProvider,
  deps: EventBridgeDeps,
): Promise<ProviderCredential> {
  try {
    return await resolveProviderCredential(provider, deps.kvStore);
  } catch (credentialError) {
    const detail =
      credentialError instanceof Error ? credentialError.message : String(credentialError);
    deps.log?.error(
      `Dropping OTP email: credential failed for provider "${provider.id}".`,
      credentialError instanceof Error ? credentialError : new Error(detail),
      { providerId: provider.id },
    );
    throw new Error(`Cannot send OTP email: ${detail}`, { cause: credentialError });
  }
}

function runOptions(deps: EventBridgeDeps) {
  return {
    audit: deps.audit,
    auth: deps.auth,
    db: deps.db,
    log: deps.log,
    pubsub: deps.pubsub,
  };
}

function severityForDays(days: number): "normal" | "important" | "urgent" {
  if (days <= 7) {
    return "urgent";
  }
  if (days <= 30) {
    return "important";
  }
  return "normal";
}
