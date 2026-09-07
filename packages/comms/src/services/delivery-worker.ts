import { commsChannel, commsMessage, commsTemplate } from "#/db-schemas";
import type { CommsChannel } from "#/db-schemas/channel";
import type { CommsProvider } from "#/db-schemas/provider";
import { MESSAGE_EVENTS } from "#/pubsub";
import type { ProviderCredential } from "#/schemas/channel";
import { createAdapter } from "#/services/adapters/index";
import type { DeliveryAdapter } from "#/services/adapters/index";
import { providerKindForChannel } from "#/services/adapters/shared";
import { resolveChannelProvider, resolveDeliveryCredential } from "#/services/credential-service";
import { runInTenantContext, tenantIdFromMetadata } from "#/services/tenant";
import { SCHEDULED_JOBS } from "#/utils/constants";

import type { DatabaseUnit, KvStoreUnit, LogUnit, PubSubUnit } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export const MESSAGE_SWEEPER_CRON = "* * * * *";

export const MAX_DELIVERY_ATTEMPTS = 5;

const SWEEP_CONCURRENCY = 10;

export interface DeliveryWorkerDeps {
  batchSize: number;
  db: DatabaseUnit;
  kvStore: KvStoreUnit;
  log?: LogUnit;
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
  } catch (error) {
    // Best-effort cleanup; surfacing keeps shutdown honest without failing it.
    console.warn(`Failed to unregister message sweeper "${topic}": ${String(error)}`);
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
  if (deps.db.tenancyMode === "isolated") {
    return sweepIsolatedTenants(deps);
  }
  const rows = await deps.db.controlPlaneDb
    .select()
    .from(commsMessage)
    .where(eq(commsMessage.status, "queued"))
    .limit(deps.batchSize);
  return processBatch(rows, deps);
}

async function sweepIsolatedTenants(deps: DeliveryWorkerDeps): Promise<number> {
  const tenantIds = (await deps.db.resolver?.list().catch((): string[] => [])) ?? [];
  const scopes = ["$global", ...tenantIds];
  let processed = 0;
  // oxlint-disable eslint/no-await-in-loop
  for (const tenantId of scopes) {
    const db =
      tenantId === "$global" ? deps.db.controlPlaneDb : await deps.db.getTenantDb(tenantId);
    const rows = await db
      .select()
      .from(commsMessage)
      .where(eq(commsMessage.status, "queued"))
      .limit(deps.batchSize);
    processed += await processBatch(rows, deps);
  }
  // oxlint-enable eslint/no-await-in-loop
  return processed;
}

async function processBatch(
  rows: (typeof commsMessage.$inferSelect)[],
  deps: DeliveryWorkerDeps,
): Promise<number> {
  let processed = 0;
  // oxlint-disable eslint/no-await-in-loop
  for (let index = 0; index < rows.length; index += SWEEP_CONCURRENCY) {
    const chunk = rows.slice(index, index + SWEEP_CONCURRENCY);
    const outcomes = await Promise.allSettled(
      chunk.map(async (message) => processMessage(message, deps)),
    );
    for (const outcome of outcomes) {
      if (outcome.status === "rejected") {
        const { reason } = outcome;
        deps.log?.error(
          "Message sweep failed for a queued message.",
          reason instanceof Error ? reason : new Error(String(reason)),
        );
      }
      processed++;
    }
  }
  // oxlint-enable eslint/no-await-in-loop
  return processed;
}

async function processMessage(
  message: typeof commsMessage.$inferSelect,
  deps: DeliveryWorkerDeps,
): Promise<void> {
  const { channelId } = message;
  if (!channelId) {
    await failMessageOnControlPlane(deps, message, "Message has no channelId.");
    return;
  }

  const tenantId = message.tenantId ?? tenantIdFromMetadata(message.metadata);
  if (!tenantId) {
    await failMessageOnControlPlane(
      deps,
      message,
      "Message metadata is missing tenantId; refusing to route to a default database.",
    );
    return;
  }

  await runInTenantContext(deps.db, tenantId, async (db) => {
    const claimed = await db
      .update(commsMessage)
      .set({ status: "sending" })
      .where(and(eq(commsMessage.id, message.id), eq(commsMessage.status, "queued")))
      .returning();

    if (claimed.length === 0) {
      return;
    }

    const [channel] = await db
      .select()
      .from(commsChannel)
      .where(eq(commsChannel.id, channelId))
      .limit(1);

    if (!channel || channel.status !== "active") {
      await recordOutcome({
        db,
        deps,
        error: "Channel is missing or not active.",
        message,
      });
      return;
    }

    const controlPlane = deps.db.controlPlaneDb;
    const provider = channel.providerId
      ? await resolveChannelProvider(channel, controlPlane)
      : null;

    const template = message.templateId
      ? await db
          .select()
          .from(commsTemplate)
          .where(eq(commsTemplate.id, message.templateId))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : null;

    if (message.channelType === "whatsapp" && !template?.providerTemplateId) {
      await recordOutcome({
        db,
        deps,
        error: "WhatsApp delivery requires a provider template.",
        message,
      });
      return;
    }

    const credential = await deliveryCredentialOrRecord({ channel, db, deps, message, provider });
    if (!credential) {
      return;
    }

    const adapter = await deliveryAdapterOrRecord({ channel, db, deps, message });
    if (!adapter) {
      return;
    }

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
      await recordOutcome({ db, deps, error: errorText, message });
    }
  });
}

/**
 * Resolves the delivery adapter, recording a retryable outcome instead of
 * throwing when the channel type has no sender. Returns null when the message
 * was recorded and the caller should stop.
 */
async function deliveryAdapterOrRecord({
  channel,
  db,
  deps,
  message,
}: {
  channel: CommsChannel;
  db: PostgresJsDatabase;
  deps: DeliveryWorkerDeps;
  message: typeof commsMessage.$inferSelect;
}): Promise<DeliveryAdapter | null> {
  try {
    return createAdapter(channel.type);
  } catch (error) {
    const errorText = error instanceof Error ? error.message : String(error);
    await recordOutcome({ db, deps, error: errorText, message });
    return null;
  }
}

/**
 * Resolves the delivery credential, recording a retryable outcome instead of
 * throwing when resolution fails. Returns null when the message was recorded
 * and the caller should stop.
 */
async function deliveryCredentialOrRecord({
  channel,
  db,
  deps,
  message,
  provider,
}: {
  channel: CommsChannel;
  db: PostgresJsDatabase;
  deps: DeliveryWorkerDeps;
  message: typeof commsMessage.$inferSelect;
  provider: CommsProvider | null;
}): Promise<ProviderCredential | null> {
  try {
    return await resolveDeliveryCredential({
      channel,
      kvStore: deps.kvStore,
      provider,
    });
  } catch (error) {
    const errorText = error instanceof Error ? error.message : String(error);
    await recordOutcome({ db, deps, error: errorText, message });
    return null;
  }
}

/**
 * Single outcome recorder. The write is one atomic UPDATE (SQL-side attempts
 * increment, terminal state decided up front) so a concurrently sweeping
 * worker can never observe a half-applied requeue. Terminal state derives
 * from MAX_DELIVERY_ATTEMPTS in exactly one place.
 */
async function recordOutcome({
  db,
  deps,
  error,
  message,
}: {
  db: PostgresJsDatabase;
  deps: DeliveryWorkerDeps;
  error: string;
  message: typeof commsMessage.$inferSelect;
}): Promise<void> {
  const terminal = message.attempts + 1 >= MAX_DELIVERY_ATTEMPTS;
  // SAFETY: the increment expression targets the attempts column of the same
  // row being updated; drizzle sql fragments are the supported way to express
  // atomic column arithmetic.
  const [updated] = await db
    .update(commsMessage)
    .set({
      attempts: sql`${commsMessage.attempts} + 1`,
      lastError: error,
      status: terminal ? "failed" : "queued",
    })
    .where(eq(commsMessage.id, message.id))
    .returning({ attempts: commsMessage.attempts });

  const attempts = updated?.attempts ?? message.attempts + 1;
  if (terminal) {
    await deps.pubsub.publish(MESSAGE_EVENTS.FAILED, {
      attempts,
      error,
      messageId: message.id,
    });
  }
}

async function failMessageOnControlPlane(
  deps: DeliveryWorkerDeps,
  message: typeof commsMessage.$inferSelect,
  error: string,
): Promise<void> {
  const db = deps.db.controlPlaneDb;
  // SAFETY: the increment expression targets the attempts column of the same
  // row being updated; drizzle sql fragments are the supported way to express
  // atomic column arithmetic.
  await db
    .update(commsMessage)
    .set({ attempts: sql`${commsMessage.attempts} + 1`, lastError: error, status: "failed" })
    .where(eq(commsMessage.id, message.id));
  await deps.pubsub.publish(MESSAGE_EVENTS.FAILED, {
    attempts: message.attempts + 1,
    error,
    messageId: message.id,
  });
}
