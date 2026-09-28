import { commsMessage, commsNotification, commsTemplate } from "#/db-schemas";
import type { CommsTemplate } from "#/db-schemas/template";
import { MESSAGE_EVENTS, NOTIFICATION_EVENTS } from "#/pubsub";
import { JsonValueSchema } from "#/schemas/json";
import { NotifySchema } from "#/schemas/notification";
import type { NotifyInput } from "#/schemas/notification";
import type { CommsPushConfig, PushPayload } from "#/services/push";
import { sendPushToSubscriptions } from "#/services/push";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, CHANNEL_ADDRESS_FIELD } from "#/utils/constants";
import { auditAndPublish } from "#/workflow-steps/audit";
import { routeNotification } from "#/workflow-steps/notification-router";
import type { RoutedOutOfBand } from "#/workflow-steps/notification-router";
import { resolveRecipient } from "#/workflow-steps/recipient-resolver";
import type { ResolvedRecipient } from "#/workflow-steps/recipient-resolver";
import { renderTemplate } from "#/workflow-steps/template-renderer";
import { ensureDefaults } from "#/workflows/channel/ensure-defaults";

import type { ChannelType } from "@aspen-os/constants";
import { CHANNEL_TYPE } from "@aspen-os/constants";
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
 * (provider lookup on the control plane) and for push fan-out (subscriptions
 * are host-global). The module wires this with its own DatabaseUnit and the
 * VAPID config.
 */
export function createNotify(dbUnit: DatabaseUnit, pushConfig?: CommsPushConfig) {
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
          channel_types: routed.channelTypes,
          metadata: input.metadata ?? null,
          recipient_id: resolved.recipientId,
          recipient_type: resolved.recipientType,
          severity: input.severity ?? "normal",
          source_entity: input.sourceEntity ?? null,
          source_module: input.sourceModule ?? "comms",
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
        dbUnit,
        notificationId: row.id,
        parsed: input,
        pubsub: ctx.pubsub,
        pushConfig,
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
            channelTypes: row.channel_types,
            notificationId: row.id,
            recipientId: row.recipient_id,
            recipientType: row.recipient_type,
            type: row.type,
          },
          topic: NOTIFICATION_EVENTS.CREATED,
        },
        newState: {
          recipientId: row.recipient_id,
          recipientType: row.recipient_type,
          type: row.type,
        },
      });

      return { dispatched, notification: row, skipped };
    });
}

interface EnqueueContext {
  db: PostgresJsDatabase;
  dbUnit: DatabaseUnit;
  notificationId: string;
  parsed: NotifyInput;
  pubsub: PubSubUnit;
  pushConfig?: CommsPushConfig;
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
  if (template && !template.is_active) {
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

  const pushOutcomes = await dispatchPush(ctx);
  const channelDecisions = routed.filter((decision) => decision.channelType !== CHANNEL_TYPE.PUSH);

  const channelOutcomes = await Promise.all(
    channelDecisions.map(async (decision): Promise<EnqueueOutcome> => {
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
      if (decision.channelType === "whatsapp" && !template?.provider_template_id) {
        return skip("whatsapp_requires_provider_template");
      }

      const body = template ? renderTemplate(template.body, params) : (parsed.body ?? parsed.title);
      const subject = template?.subject != null ? renderTemplate(template.subject, params) : null;

      const [row] = await db
        .insert(commsMessage)
        .values({
          body,
          channel_id: decision.channel.id,
          channel_type: decision.channelType,
          metadata: parsed.metadata ?? null,
          notification_id: notificationId,
          provider_id: decision.channel.provider_id ?? null,
          queued_at: now,
          status: "queued",
          subject,
          template_id: parsed.templateId ?? null,
          tenant_id: tenantId ?? null,
          to,
        })
        .returning();

      if (!row) {
        return skip("insert_failed");
      }

      await pubsub.publish(MESSAGE_EVENTS.QUEUED, {
        channelType: row.channel_type,
        messageId: row.id,
        to: row.to,
      });
      return {
        dispatched: { channelType: row.channel_type, messageId: row.id },
        skipped: null,
      };
    }),
  );

  const dispatched: DispatchedMessage[] = [];
  const skipped: DispatchSkipped[] = [];
  for (const outcome of [...channelOutcomes, ...pushOutcomes]) {
    if (outcome.dispatched) {
      dispatched.push(outcome.dispatched);
    }
    if (outcome.skipped) {
      skipped.push(outcome.skipped);
    }
  }
  return { dispatched, skipped };
}

function pushSkip(reason: string): EnqueueOutcome {
  return {
    dispatched: null,
    skipped: { channelType: CHANNEL_TYPE.PUSH, reason },
  };
}

/**
 * Sends the notification to every stored Web Push subscription for the
 * recipient and records one outbox row per device. Push never queues: the
 * tenant message sweeper is a background process that this app does not run,
 * so a pushed notification would otherwise sit `queued` forever. Failures are
 * reported per endpoint and never fail the whole notify.
 */
async function dispatchPush(ctx: EnqueueContext): Promise<EnqueueOutcome[]> {
  const { db, dbUnit, notificationId, parsed, pushConfig, resolved, routed, template } = ctx;
  if (!routed.some((decision) => decision.channelType === CHANNEL_TYPE.PUSH)) {
    return [];
  }

  if (resolved.recipientType !== "user") {
    return [pushSkip("push_requires_user_recipient")];
  }
  if (!pushConfig) {
    return [pushSkip("push_not_configured")];
  }

  const params = templateParams(parsed);
  const payload: PushPayload = {
    body: template ? renderTemplate(template.body, params) : (parsed.body ?? parsed.title),
    data: { notificationId, type: parsed.type },
    tag: `notification-${notificationId}`,
    title: template?.subject != null ? renderTemplate(template.subject, params) : parsed.title,
    url: "/",
  };

  const sendResult = await (async () => {
    try {
      return {
        ok: true as const,
        value: await sendPushToSubscriptions({
          config: pushConfig,
          db: dbUnit.controlPlaneDb,
          log: getContext().log,
          payload,
          userId: resolved.recipientId,
        }),
      };
    } catch (error) {
      return { error, ok: false as const };
    }
  })();

  if (!sendResult.ok) {
    return [pushSkip(sendResult.error instanceof Error ? sendResult.error.message : "push_failed")];
  }
  const outcomes = sendResult.value;

  if (outcomes.length === 0) {
    return [pushSkip("push_no_subscriptions")];
  }

  const { tenantId } = getContext();
  const now = new Date();
  return Promise.all(
    outcomes.map(async (outcome): Promise<EnqueueOutcome> => {
      const [row] = await db
        .insert(commsMessage)
        .values({
          body: payload.body ?? parsed.title,
          channel_type: CHANNEL_TYPE.PUSH,
          delivered_at: outcome.ok ? now : null,
          last_error: outcome.ok ? null : (outcome.error ?? "push_failed"),
          metadata: { pushSubscriptionId: outcome.subscriptionId },
          notification_id: notificationId,
          sent_at: outcome.ok ? now : null,
          status: outcome.ok ? "delivered" : "failed",
          subject: payload.title,
          template_id: parsed.templateId ?? null,
          tenant_id: tenantId ?? null,
          to: outcome.endpoint,
        })
        .returning();

      if (outcome.ok) {
        return {
          dispatched: {
            channelType: CHANNEL_TYPE.PUSH,
            messageId: row?.id ?? outcome.subscriptionId,
          },
          skipped: null,
        };
      }
      return {
        dispatched: null,
        skipped: {
          channelType: CHANNEL_TYPE.PUSH,
          reason: outcome.statusCode
            ? `push_delivery_failed_${outcome.statusCode}`
            : "push_delivery_failed",
        },
      };
    }),
  );
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
  // `record()` also accepts arrays at runtime; those are not valid param maps.
  if (parsed.success && !Array.isArray(parsed.output)) {
    return parsed.output;
  }
  return {};
}
