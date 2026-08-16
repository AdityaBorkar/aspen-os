import { commsChannel, commsMessage, commsTemplate } from "#/db-schemas";
import { MESSAGE_EVENTS } from "#/pubsub";
import { createAdapter, providerKindForChannel } from "#/services/adapters/index";
import {
  resolveChannelProvider,
  resolveProviderCredential,
  resolveChannelCredential,
} from "#/services/credential-service";
import { SCHEDULED_JOBS } from "#/utils/constants";

import type { DatabaseUnit, KvStoreUnit, PubSubUnit } from "@aspen-os/platform/server";
import { isGlobalTenantId } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { object, optional, safeParse, string } from "valibot";

export const MESSAGE_SWEEPER_CRON = "* * * * *";

export const MAX_DELIVERY_ATTEMPTS = 5;

export interface DeliveryWorkerDeps {
  batchSize: number;
  db: DatabaseUnit;
  kvStore: KvStoreUnit;
  pubsub: PubSubUnit;
}

export async function registerMessageSweeper(pubsub: PubSubUnit): Promise<string> {
  await pubsub.schedule({
    cron: MESSAGE_SWEEPER_CRON,
    data: {},
    options: { retryBackoff: true, retryDelay: 60, retryLimit: 3 },
    topic: SCHEDULED_JOBS.MESSAGE_SWEEPER,
  });
  return SCHEDULED_JOBS.MESSAGE_SWEEPER;
}

export async function unregisterMessageSweeper(
  topic: string | null,
  { pubsub }: { pubsub: PubSubUnit },
): Promise<void> {
  if (!topic) {
    return;
  }
  try {
    await pubsub.unsubscribe(topic);
    await pubsub.unschedule(topic);
  } catch {
    // Best-effort
  }
}

export async function registerMessageSweepHandler(
  topic: string,
  deps: DeliveryWorkerDeps,
): Promise<void> {
  await deps.pubsub.subscribe(topic, async () => {
    await sweepQueuedMessages(deps);
  });
}

export async function sweepQueuedMessages(deps: DeliveryWorkerDeps): Promise<number> {
  const rows = await deps.db.db
    .select()
    .from(commsMessage)
    .where(eq(commsMessage.status, "queued"))
    .limit(deps.batchSize);

  let processed = 0;
  // oxlint-disable eslint/no-await-in-loop
  for (const message of rows) {
    await processMessage(message, deps).catch(() => {
      // Per-message delivery failures are recorded on the row itself; the sweep
      // Continues with the remaining messages.
    });
    processed++;
  }
  // oxlint-enable eslint/no-await-in-loop
  return processed;
}

async function processMessage(
  message: typeof commsMessage.$inferSelect,
  deps: DeliveryWorkerDeps,
): Promise<void> {
  const channel = await deps.db.db
    .select()
    .from(commsChannel)
    .where(eq(commsChannel.id, message.channelId ?? ""))
    .limit(1)
    .then((rows) => rows[0]);

  if (!channel || channel.status !== "active") {
    await failMessage({
      db: deps.db.db,
      deps,
      error: "Channel is missing or not active.",
      message,
    });
    return;
  }

  const provider = channel.providerId ? await resolveChannelProvider(channel, deps.db.db) : null;

  const hostCredential =
    channel.source === "host" && provider
      ? await resolveProviderCredential(provider, deps.kvStore).catch(() => null)
      : null;

  await runInTenantContext(deps.db, tenantIdFor(message), async (db) => {
    const claimed = await db
      .update(commsMessage)
      .set({ status: "sending" })
      .where(and(eq(commsMessage.id, message.id), eq(commsMessage.status, "queued")))
      .returning();

    if (claimed.length === 0) {
      return;
    }

    const template = message.templateId
      ? await db
          .select()
          .from(commsTemplate)
          .where(eq(commsTemplate.id, message.templateId ?? ""))
          .limit(1)
          .then((rows) => rows[0])
      : null;

    if (message.channelType === "whatsapp" && !template?.providerTemplateId) {
      await recordFailure({
        db,
        deps,
        error: "WhatsApp delivery requires a provider template.",
        message,
      });
      return;
    }

    let credential: Awaited<ReturnType<typeof resolveChannelCredential>> | null = null;
    try {
      credential =
        channel.source === "host"
          ? hostCredential
          : await resolveChannelCredential(channel, deps.kvStore);
    } catch (error) {
      const errorText = error instanceof Error ? error.message : String(error);
      await recordFailure({ db, deps, error: errorText, message });
      return;
    }
    if (!credential) {
      await recordFailure({
        db,
        deps,
        error: "Provider credential could not be resolved.",
        message,
      });
      return;
    }

    const adapter = createAdapter(channel.type);
    try {
      const result = await adapter.send({
        channel,
        credential,
        kind:
          channel.source === "host" && provider
            ? provider.kind
            : providerKindForChannel(channel.type, credential),
        message: {
          body: message.body,
          providerTemplateId: template?.providerTemplateId ?? null,
          subject: message.subject,
          to: message.to,
        },
      });

      const now = new Date();
      await db
        .update(commsMessage)
        .set({
          providerMessageId: result.providerMessageId,
          sentAt: now,
          status: "sent",
        })
        .where(eq(commsMessage.id, message.id));

      await db
        .update(commsChannel)
        .set({ lastUsedAt: now, updatedAt: now })
        .where(eq(commsChannel.id, channel.id));

      await deps.pubsub.publish(MESSAGE_EVENTS.SENT, {
        messageId: message.id,
        providerMessageId: result.providerMessageId,
      });
    } catch (error) {
      const errorText = error instanceof Error ? error.message : String(error);
      await recordFailure({ db, deps, error: errorText, message });
    }
  });
}

async function recordFailure({
  db,
  deps,
  error,
  message,
}: {
  db: NodePgDatabase;
  deps: DeliveryWorkerDeps;
  error: string;
  message: typeof commsMessage.$inferSelect;
}): Promise<void> {
  const attempts = message.attempts + 1;
  if (attempts >= MAX_DELIVERY_ATTEMPTS) {
    await failMessage({ db, deps, error, message });
    return;
  }
  await db
    .update(commsMessage)
    .set({ attempts, lastError: error, status: "queued" })
    .where(eq(commsMessage.id, message.id));
}

async function failMessage({
  db,
  deps,
  error,
  message,
}: {
  db: NodePgDatabase;
  deps: DeliveryWorkerDeps;
  error: string;
  message: typeof commsMessage.$inferSelect;
}): Promise<void> {
  const attempts = message.attempts + 1;
  await db
    .update(commsMessage)
    .set({ attempts, lastError: error, status: "failed" })
    .where(eq(commsMessage.id, message.id));

  await deps.pubsub.publish(MESSAGE_EVENTS.FAILED, {
    attempts,
    error,
    messageId: message.id,
  });
}

function tenantIdFor(message: typeof commsMessage.$inferSelect): string {
  const parsed = safeParse(object({ tenantId: optional(string()) }), message.metadata ?? {});
  return parsed.success && parsed.output.tenantId ? parsed.output.tenantId : "default";
}

async function runInTenantContext<TValue>(
  dbUnit: DatabaseUnit,
  tenantId: string,
  fn: (db: NodePgDatabase) => Promise<TValue>,
): Promise<TValue> {
  if (isGlobalTenantId(tenantId)) {
    return fn(dbUnit.controlPlaneDb);
  }
  if (dbUnit.tenancyMode === "isolated") {
    const db = await dbUnit.getTenantDb(tenantId);
    return fn(db);
  }
  // SAFETY: runWithTenant hands the callback a session-scoped drizzle instance
  // Whose surface is a NodePgDatabase; the generic schema parameter is erased.
  return dbUnit.runWithTenant(tenantId, (db) => fn(db));
}
