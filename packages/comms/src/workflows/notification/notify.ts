import { commsMessage, commsNotification, commsTemplate } from "#/db-schemas";
import { MESSAGE_EVENTS, NOTIFICATION_EVENTS } from "#/pubsub";
import { getCommsRuntime } from "#/runtime";
import { JsonValueSchema } from "#/schemas/json";
import { routeNotification } from "#/services/notification-router";
import type { RoutingResult } from "#/services/notification-router";
import { resolveRecipient } from "#/services/recipient-resolver";
import type { ResolvedRecipient } from "#/services/recipient-resolver";
import { renderTemplate } from "#/services/template-renderer";
import { NotifySchema } from "#/types";
import type { NotifyInput } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { ensureDefaults } from "#/workflows/channel/ensure-defaults";

import type { ChannelType } from "@aspen-os/constants";
import { getContext, Workflow } from "@aspen-os/platform/server";
import type { JsonValue, PubSubUnit } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { object, parse, record, safeParse, string } from "valibot";

const NotifyInputSchema = object({ input: NotifySchema });

export const notify = Workflow.name("comms.notification.notify")
  .input(NotifyInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(NotifySchema, input);
    const { auth, db } = getCommsRuntime();

    const resolved = await resolveRecipient(parsed.recipient, auth);
    if (!resolved) {
      throw new Error(
        `Recipient "${parsed.recipient.type}:${parsed.recipient.id}" could not be resolved.`,
      );
    }

    const ensure = ensureDefaults(db);
    const routed = await routeNotification(parsed, resolved, {
      db: ctx.db,
      ensureDefaults: ensure,
    });

    const [row] = await ctx.db
      .insert(commsNotification)
      .values({
        body: parsed.body ?? null,
        channelTypes: routed.channelTypes,
        metadata: parsed.metadata ?? null,
        recipientId: resolved.recipientId,
        recipientType: resolved.recipientType,
        severity: parsed.severity ?? "normal",
        sourceEntity: parsed.sourceEntity ?? null,
        sourceModule: parsed.sourceModule ?? "comms",
        title: parsed.title,
        to: resolved.to,
        type: parsed.type,
      })
      .returning();

    if (!row) {
      throw new Error("Failed to create notification.");
    }

    await enqueueOutOfBandMessages({
      db: ctx.db,
      notificationId: row.id,
      parsed,
      pubsub: ctx.pubsub,
      resolved,
      routed,
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.NOTIFIED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.NOTIFICATION,
        newState: {
          recipientId: row.recipientId,
          recipientType: row.recipientType,
          type: row.type,
        },
      });

      await ctx.pubsub.publish(NOTIFICATION_EVENTS.CREATED, {
        channelTypes: row.channelTypes,
        notificationId: row.id,
        recipientId: row.recipientId,
        recipientType: row.recipientType,
        type: row.type,
      });
    });

    return row;
  });

interface EnqueueContext {
  db: PostgresJsDatabase;
  notificationId: string;
  parsed: NotifyInput;
  pubsub: PubSubUnit;
  resolved: ResolvedRecipient;
  routed: RoutingResult;
}

async function enqueueOutOfBandMessages(ctx: EnqueueContext): Promise<void> {
  const { db, notificationId, parsed, pubsub, resolved, routed } = ctx;
  const now = new Date();
  // oxlint-disable eslint/no-await-in-loop
  for (const decision of routed.outOfBand) {
    const { channel } = decision;
    if (!channel) {
      continue;
    }
    const to = addressFor(decision.channelType, resolved.to);
    if (!to) {
      continue;
    }

    const template = parsed.templateId
      ? await db
          .select()
          .from(commsTemplate)
          .where(eq(commsTemplate.id, parsed.templateId))
          .limit(1)
          .then((rows) => rows[0])
      : null;

    if (template && !template.isActive) {
      continue;
    }
    if (decision.channelType === "whatsapp" && !template?.providerTemplateId) {
      continue;
    }

    const params = templateParams(parsed.metadata ?? null);
    const body = template ? renderTemplate(template.body, params) : (parsed.body ?? parsed.title);
    const subject = template && template.subject ? renderTemplate(template.subject, params) : null;

    const [row] = await db
      .insert(commsMessage)
      .values({
        body,
        channelId: channel.id,
        channelType: decision.channelType,
        metadata: { ...parsed.metadata, tenantId: getContext().tenantId ?? "default" },
        notificationId,
        providerId: channel.providerId ?? null,
        queuedAt: now,
        status: "queued",
        subject,
        templateId: parsed.templateId ?? null,
        to,
      })
      .returning();

    if (!row) {
      continue;
    }

    await pubsub.publish(MESSAGE_EVENTS.QUEUED, {
      channelType: row.channelType,
      messageId: row.id,
      to: row.to,
    });
  }
  // oxlint-enable eslint/no-await-in-loop
}

function addressFor(
  channelType: ChannelType,
  to: { email?: string; phone?: string } | null,
): string | null {
  if (!to) {
    return null;
  }
  if (channelType === "email") {
    return to.email ?? null;
  }
  return to.phone ?? null;
}

function templateParams(metadata: Record<string, JsonValue> | null): Record<string, JsonValue> {
  if (!metadata) {
    return {};
  }
  const parsed = safeParse(record(string(), JsonValueSchema), metadata.templateParams);
  return parsed.success ? parsed.output : {};
}
