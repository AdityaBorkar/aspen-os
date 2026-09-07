import { commsChannel } from "#/db-schemas";
import { CHANNEL_EVENTS } from "#/pubsub";
import { EnsureDefaultsSchema } from "#/schemas/channel";
import { findFirstActiveProvider } from "#/services/providers";
import {
  AUDIT_ACTION,
  AUDIT_ENTITY_TYPE,
  DEFAULT_CHANNEL_TYPES,
  SETTING_KEYS,
  providerKindsForChannelType,
} from "#/utils/constants";
import { auditAndPublish } from "#/workflow-steps/audit";
import { getSetting } from "#/workflow-steps/settings-service";

import { getContext, Workflow } from "@aspen-os/platform/server";
import type { DatabaseUnit } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, safeParse, string } from "valibot";

const EnsureDefaultsInputSchema = object({ input: EnsureDefaultsSchema });

export function ensureDefaults(dbUnit: DatabaseUnit) {
  return Workflow.name("comms.channel.ensure-defaults")
    .input(EnsureDefaultsInputSchema)
    .handler(async ({ input }, ctx) => {
      const entityType = input.entityType ?? "organization";
      const entityId = input.entityId ?? getContext().tenantId ?? "default";
      const types = input.channelTypes ?? DEFAULT_CHANNEL_TYPES;

      const senderOverride = await getSetting(
        ctx.db,
        SETTING_KEYS.HOST_DEFAULT_SENDER_ADDRESS_OVERRIDE,
      );
      const parsedOverride = safeParse(string(), senderOverride);
      const defaultSenderAddress = parsedOverride.success ? parsedOverride.output : null;

      const results = await Promise.all(
        types.map(async (type) => {
          const existing = await ctx.db
            .select({ id: commsChannel.id })
            .from(commsChannel)
            .where(
              and(
                eq(commsChannel.entityId, entityId),
                eq(commsChannel.entityType, entityType),
                eq(commsChannel.status, "active"),
                eq(commsChannel.type, type),
              ),
            )
            .limit(1);

          if (existing.length > 0) {
            return null;
          }

          const providerKinds = providerKindsForChannelType(type);
          if (!providerKinds) {
            ctx.log.warn(`ensure-defaults skips unsupported channel type "${type}".`, {
              entityId,
              type,
            });
            return null;
          }

          const provider = await findFirstActiveProvider(
            // SAFETY: providers live on the control plane; ctx.db is tenant-scoped.
            dbUnit.controlPlaneDb,
            providerKinds,
          );
          if (!provider) {
            return null;
          }

          const senderAddress = defaultSenderAddress ?? provider.defaultSenderAddress;
          if (!senderAddress) {
            ctx.log.warn(`ensure-defaults skips "${type}": provider has no sender address.`, {
              providerId: provider.id,
              type,
            });
            return null;
          }

          const [row] = await ctx.db
            .insert(commsChannel)
            .values({
              entityId,
              entityType,
              isDefault: true,
              name: `Default ${type}`,
              providerId: provider.id,
              senderAddress,
              source: "host",
              status: "active",
              type,
              verifiedAt: new Date(),
            })
            .returning();

          if (!row) {
            return null;
          }

          await auditAndPublish(ctx, {
            action: AUDIT_ACTION.CREATED,
            crudAction: "create",
            entityId: row.id,
            entityType: AUDIT_ENTITY_TYPE.CHANNEL,
            event: {
              payload: { channelId: row.id, isDefault: true, type },
              topic: CHANNEL_EVENTS.DEFAULT_CHANGED,
            },
            newState: {
              entityId,
              entityType,
              name: row.name,
              providerId: provider.id,
              source: "host",
              type,
            },
          });

          return row.id;
        }),
      );

      const materialized = results.filter((id) => id !== null).length;
      return { entityId, entityType, materialized };
    });
}
