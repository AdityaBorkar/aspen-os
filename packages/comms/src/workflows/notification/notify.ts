import { commsMessage, commsNotification, commsTemplate } from "#/db-schemas";
import type { CommsTemplate } from "#/db-schemas/template";
import { MESSAGE_EVENTS, NOTIFICATION_EVENTS } from "#/pubsub";
import { JsonValueSchema } from "#/schemas/json";
import { NotifySchema } from "#/schemas/notification";
import type { NotifyInput } from "#/schemas/notification";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, CHANNEL_ADDRESS_FIELD } from "#/utils/constants";
import { auditAndPublish } from "#/workflow-steps/audit";
import { routeNotification } from "#/workflow-steps/notification-router";
import type { RoutedOutOfBand } from "#/workflow-steps/notification-router";
import { resolveRecipient } from "#/workflow-steps/recipient-resolver";
import type { ResolvedRecipient } from "#/workflow-steps/recipient-resolver";
import { renderTemplate } from "#/workflow-steps/template-renderer";
import { ensureDefaults } from "#/workflows/channel/ensure-defaults";

import type { ChannelType } from "@aspen-os/constants";
import { getContext, Workflow } from "@aspen-os/platform/server";
import type { DatabaseUnit, JsonValue, PubSubUnit } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { object, record, safeParse, string } from "valibot";

const NotifyInputSchema = object({ input: NotifySchema });

export interface DispatchSkipped {
  channelType: string;
  reason: string;
}

export interface DispatchedMessage {
  channelType: string;
  messageId: string;
}

export interface NotifyResult {
  dispatched: DispatchedMessage[];
  notification: typeof commsNotification.$inferSelect;
  skipped: DispatchSkipped[];
}

/**
 * Factory because notify needs the DatabaseUnit for ensure-defaults
 * (provider lookup on the control plane). The module wires this with its
 * own DatabaseUnit.
 */
export function createNotify(dbUnit: DatabaseUnit) {
  return Workflow.name("comms.notification.notify")
    .input(NotifyInputSchema)
    .handler(async ({ input }, ctx): Promise<NotifyResult> => {
      if (!ctx.auth) {
        throw new Error("Notify requires auth; call inside Platform.run().");
      }
      const resolved = await resolveRecipient(input.recipient, ctx.auth);
      if (!resolved) {
        throw new Error(
          `Recipient "${input.recipient.type}:${input.recipient.id}" could not be resolved.`,
        );
      }

      const ensure = ensureDefaults(dbUnit);
      const routed = await routeNotification(input, resolved, {
        db: ctx.db,
        ensureDefaults: ensure,
      });

      const [row] = await ctx.db
        .insert(commsNotification)
        .values({
          body: input.body ?? null,
          channelTypes: routed.channelTypes,
          metadata: input.metadata ?? null,
          recipientId: resolved.recipientId,
          recipientType: resolved.recipientType,
          severity: input.severity ?? "normal",
          sourceEntity: input.sourceEntity ?? null,
          sourceModule: input.sourceModule ?? "comms",
          title: input.title,
          to: resolved.to,
          type: input.type,
        })
        .returning();

      if (!row) {
        throw new Error("Failed to create notification.");
      }

      const template = await fetchTemplate(ctx.db, input.templateId ?? null);
      const { dispatched, skipped } = await enqueueOutOfBandMessages({
        db: ctx.db,
        notificationId: row.id,
        parsed: input,
        pubsub: ctx.pubsub,
        resolved,
        routed: routed.outOfBand,
        template,
      });

      if (skipped.length > 0) {
        ctx.log.warn(`notify skipped ${skipped.length} out-of-band channel(s).`, {
          notificationId: row.id,
          skipped: skipped.map((entry) => `${entry.channelType}:${entry.reason}`),
        });
      }

      await auditAndPublish(ctx, {
        action: AUDIT_ACTION.NOTIFIED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.NOTIFICATION,
        event: {
          payload: {
            channelTypes: row.channelTypes,
            notificationId: row.id,
            recipientId: row.recipientId,
            recipientType: row.recipientType,
            type: row.type,
          },
          topic: NOTIFICATION_EVENTS.CREATED,
        },
        newState: {
          recipientId: row.recipientId,
          recipientType: row.recipientType,
          type: row.type,
        },
      });

      return { dispatched, notification: row, skipped };
    });
}

interface EnqueueContext {
  db: PostgresJsDatabase;
  notificationId: string;
  parsed: NotifyInput;
  pubsub: PubSubUnit;
  resolved: ResolvedRecipient;
  routed: RoutedOutOfBand[];
  template: CommsTemplate | null;
}

interface EnqueueOutcome {
  dispatched: DispatchedMessage | null;
  skipped: DispatchSkipped | null;
}

interface EnqueueResult {
  dispatched: DispatchedMessage[];
  skipped: DispatchSkipped[];
}

async function fetchTemplate(
  db: PostgresJsDatabase,
  templateId: string | null,
): Promise<CommsTemplate | null> {
  if (!templateId) {
    return null;
  }
  const [template] = await db
    .select()
    .from(commsTemplate)
    .where(eq(commsTemplate.id, templateId))
    .limit(1);
  return template ?? null;
}

async function enqueueOutOfBandMessages(ctx: EnqueueContext): Promise<EnqueueResult> {
  const { db, notificationId, parsed, pubsub, resolved, routed, template } = ctx;
  if (template && !template.isActive) {
    return {
      dispatched: [],
      skipped: routed.map((decision) => ({
        channelType: decision.channelType,
        reason: "template_inactive",
      })),
    };
  }

  const params = templateParams(parsed);
  const { tenantId } = getContext();
  const now = new Date();

  const outcomes = await Promise.all(
    routed.map(async (decision): Promise<EnqueueOutcome> => {
      const skip = (reason: string): EnqueueOutcome => ({
        dispatched: null,
        skipped: { channelType: decision.channelType, reason },
      });
      if (!decision.channel) {
        return skip("no_channel");
      }
      const to = addressFor(decision.channelType, resolved.to);
      if (!to) {
        return skip("no_address");
      }
      if (decision.channelType === "whatsapp" && !template?.providerTemplateId) {
        return skip("whatsapp_requires_provider_template");
      }

      const body = template ? renderTemplate(template.body, params) : (parsed.body ?? parsed.title);
      const subject =
        template && template.subject !== null && template.subject !== undefined
          ? renderTemplate(template.subject, params)
          : null;

      const [row] = await db
        .insert(commsMessage)
        .values({
          body,
          channelId: decision.channel.id,
          channelType: decision.channelType,
          metadata: parsed.metadata ?? null,
          notificationId,
          providerId: decision.channel.providerId ?? null,
          queuedAt: now,
          status: "queued",
          subject,
          templateId: parsed.templateId ?? null,
          tenantId: tenantId ?? null,
          to,
        })
        .returning();

      if (!row) {
        return skip("insert_failed");
      }

      await pubsub.publish(MESSAGE_EVENTS.QUEUED, {
        channelType: row.channelType,
        messageId: row.id,
        to: row.to,
      });
      return {
        dispatched: { channelType: row.channelType, messageId: row.id },
        skipped: null,
      };
    }),
  );

  const dispatched: DispatchedMessage[] = [];
  const skipped: DispatchSkipped[] = [];
  for (const outcome of outcomes) {
    if (outcome.dispatched) {
      dispatched.push(outcome.dispatched);
    }
    if (outcome.skipped) {
      skipped.push(outcome.skipped);
    }
  }
  return { dispatched, skipped };
}

function addressFor(
  channelType: ChannelType,
  to: { email?: string; phone?: string } | null,
): string | null {
  if (!to) {
    return null;
  }
  if (!Object.hasOwn(CHANNEL_ADDRESS_FIELD, channelType)) {
    return null;
  }
  // SAFETY: hasOwn above proves channelType is a present key of the closed map.
  const field = CHANNEL_ADDRESS_FIELD[channelType as keyof typeof CHANNEL_ADDRESS_FIELD];
  return to[field] ?? null;
}

function templateParams(input: NotifyInput): Record<string, JsonValue> {
  if (input.templateParams) {
    return input.templateParams;
  }
  const { metadata } = input;
  if (!metadata || Array.isArray(metadata)) {
    return {};
  }
  const parsed = safeParse(record(string(), JsonValueSchema), metadata.templateParams);
  if (parsed.success) {
    const nested = parsed.output;
    if (!Array.isArray(nested)) {
      return nested;
    }
  }
  return {};
}
