import { commsProvider } from "#/db-schemas";
import { getCommsRuntime } from "#/runtime";
import { createAdapter } from "#/services/adapters/index";
import { resolveProviderCredential } from "#/services/credential-service";
import { renderTemplate } from "#/services/template-renderer";
import { ensureDefaults } from "#/workflows/channel/ensure-defaults";
import { notify } from "#/workflows/notification/notify";

import type {
  InferSchemaOutput,
  StandardSchema,
  AuditUnit,
  DatabaseUnit,
  PubSubUnit,
} from "@aspen-os/platform/server";
import { isGlobalTenantId } from "@aspen-os/platform/server";
import { and, eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { array, nullish, number, object, optional, string } from "valibot";

const EMAIL_PROVIDER_KINDS = ["ses", "resend", "postmark", "smtp"] as const;

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
  db: PostgresJsDatabase;
  dbUnit: DatabaseUnit;
  pubsub: PubSubUnit;
}

export async function registerEventBridgeSubscriptions(deps: EventBridgeDeps): Promise<string[]> {
  const topics: string[] = [];
  const subscribe = subscribeSafe(deps);

  await subscribe("compliance:document_expiring", DocumentExpiringEventSchema, async (data) => {
    await handleDocumentExpiring(data, deps);
  });
  topics.push("compliance:document_expiring");

  await subscribe("compliance:document_due", DocumentDueEventSchema, async (data) => {
    await handleDocumentDue(data, deps);
  });
  topics.push("compliance:document_due");

  await subscribe("calendar:reminder_due", ReminderDueEventSchema, async (data) => {
    await handleReminderDue(data, deps);
  });
  topics.push("calendar:reminder_due");

  await subscribe("dms:file_expired", FileExpiredEventSchema, async (data) => {
    await handleFileExpired(data, deps);
  });
  topics.push("dms:file_expired");

  await subscribe("announcement:published", AnnouncementPublishedEventSchema, async (data) => {
    await handleAnnouncementPublished(data, deps);
  });
  topics.push("announcement:published");

  await subscribe("management:tenant_provisioned", TenantLifecycleEventSchema, async (data) => {
    await handleTenantLifecycle(data.tenantId, deps);
  });
  topics.push("management:tenant_provisioned");

  await subscribe("management:tenant_activated", TenantLifecycleEventSchema, async (data) => {
    await handleTenantLifecycle(data.tenantId, deps);
  });
  topics.push("management:tenant_activated");

  await subscribe("auth:email_otp_requested", OtpRequestedEventSchema, async (data) => {
    await handleOtpRequested(data, deps);
  });
  topics.push("auth:email_otp_requested");

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
      } catch {
        // Ignore
      }
    }),
  );
}

function subscribeSafe(deps: EventBridgeDeps) {
  return async function subscribe<TSchema extends StandardSchema>(
    topic: string,
    schema: TSchema,
    handler: (data: InferSchemaOutput<TSchema>) => Promise<void>,
  ): Promise<void> {
    try {
      await deps.pubsub.subscribe(topic, async (message) => {
        const result = await schema["~standard"].validate(message.data);
        if (!result.issues) {
          await handler(result.value);
        }
      });
    } catch {
      // Source module not installed — silently no-op
    }
  };
}

async function handleDocumentExpiring(
  event: InferSchemaOutput<typeof DocumentExpiringEventSchema>,
  deps: EventBridgeDeps,
): Promise<void> {
  if (!event.recipient) {
    return;
  }
  await notify.run(
    {
      input: {
        recipient: { id: event.recipient.id, type: "user" },
        severity: severityForDays(event.daysUntilExpiry),
        sourceEntity: { id: event.documentId, type: "compliance_document" },
        sourceModule: "compliance",
        title: `Compliance document expiring in ${event.daysUntilExpiry} day${
          event.daysUntilExpiry === 1 ? "" : "s"
        }`,
        type: "document_expiring",
      },
    },
    runOptions(deps),
  );
}

async function handleDocumentDue(
  event: InferSchemaOutput<typeof DocumentDueEventSchema>,
  deps: EventBridgeDeps,
): Promise<void> {
  if (!event.recipient) {
    return;
  }
  await notify.run(
    {
      input: {
        recipient: { id: event.recipient.id, type: "user" },
        severity: severityForDays(event.daysUntilDue),
        sourceEntity: { id: event.documentId, type: "compliance_document" },
        sourceModule: "compliance",
        title: `Compliance document due in ${event.daysUntilDue} day${
          event.daysUntilDue === 1 ? "" : "s"
        }`,
        type: "document_due",
      },
    },
    runOptions(deps),
  );
}

async function handleReminderDue(
  event: InferSchemaOutput<typeof ReminderDueEventSchema>,
  deps: EventBridgeDeps,
): Promise<void> {
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

async function handleAnnouncementPublished(
  event: InferSchemaOutput<typeof AnnouncementPublishedEventSchema>,
  deps: EventBridgeDeps,
): Promise<void> {
  // oxlint-disable eslint/no-await-in-loop
  for (const userId of event.recipientUserIds) {
    await notify.run(
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
    );
  }
  // oxlint-enable eslint/no-await-in-loop
}

async function handleTenantLifecycle(tenantId: string, deps: EventBridgeDeps): Promise<void> {
  if (isGlobalTenantId(tenantId)) {
    return;
  }

  const ensure = ensureDefaults(deps.dbUnit);

  if (deps.dbUnit.tenancyMode === "isolated") {
    const db = await deps.dbUnit.getTenantDb(tenantId);
    await ensure.run(
      { input: { entityId: tenantId, entityType: "organization" } },
      { audit: deps.audit, db, pubsub: deps.pubsub },
    );
    return;
  }

  // SAFETY: runWithTenant hands the callback a session-scoped drizzle instance
  // Whose surface is a PostgresJsDatabase; the generic schema parameter is erased.
  await deps.dbUnit.runWithTenant(tenantId, (db) =>
    ensure.run(
      { input: { entityId: tenantId, entityType: "organization" } },
      { audit: deps.audit, db, pubsub: deps.pubsub },
    ),
  );
}

async function handleOtpRequested(
  event: InferSchemaOutput<typeof OtpRequestedEventSchema>,
  deps: EventBridgeDeps,
): Promise<void> {
  const { auth, kvStore } = getCommsRuntime();

  const [provider] = await deps.db
    .select()
    .from(commsProvider)
    .where(
      and(eq(commsProvider.isActive, true), inArray(commsProvider.kind, [...EMAIL_PROVIDER_KINDS])),
    )
    .orderBy(commsProvider.createdAt)
    .limit(1);

  if (!provider) {
    return;
  }

  const credential = await resolveProviderCredential(provider, kvStore).catch(() => null);
  if (!credential) {
    return;
  }

  const stored = await auth.rest.otp.get(event.tokenRef);
  if (!stored) {
    return;
  }

  const adapter = createAdapter("email");
  await adapter.send({
    channel: { senderAddress: provider.defaultSenderAddress ?? "no-reply@aspen.local" },
    credential,
    kind: provider.kind,
    message: {
      body: renderTemplate("Your verification code is {otp}.", { otp: stored.otp }),
      subject: "Your verification code",
      to: event.email,
    },
  });
}

function runOptions(deps: EventBridgeDeps) {
  return { audit: deps.audit, db: deps.db, pubsub: deps.pubsub };
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
