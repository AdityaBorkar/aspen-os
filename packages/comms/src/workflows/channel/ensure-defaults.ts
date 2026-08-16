import { commsChannel, commsProvider } from "#/db-schemas";
import { CHANNEL_EVENTS } from "#/pubsub";
import { getSetting } from "#/services/settings-service";
import { EnsureDefaultsSchema } from "#/types";
import {
  AUDIT_ENTITY_TYPE,
  SETTING_KEYS,
  DEFAULT_CHANNEL_TYPES,
  PROVIDER_KINDS_BY_CHANNEL_TYPE,
} from "#/utils/constants";

import type { ChannelType } from "@aspen-os/constants";
import { getContext, Workflow } from "@aspen-os/platform/server";
import type { DatabaseUnit } from "@aspen-os/platform/server";
import { and, eq, inArray } from "drizzle-orm";
import { object, parse, safeParse, string } from "valibot";

const EnsureDefaultsInputSchema = object({ input: EnsureDefaultsSchema });

function channelTypeKinds(type: ChannelType) {
  switch (type) {
    case "email": {
      return PROVIDER_KINDS_BY_CHANNEL_TYPE.email;
    }
    case "sms": {
      return PROVIDER_KINDS_BY_CHANNEL_TYPE.sms;
    }
    case "whatsapp": {
      return PROVIDER_KINDS_BY_CHANNEL_TYPE.whatsapp;
    }
    default: {
      return null;
    }
  }
}

export function ensureDefaults(dbUnit: DatabaseUnit) {
  return Workflow.name("comms.channel.ensure-defaults")
    .input(EnsureDefaultsInputSchema)
    .handler(async ({ input }, ctx) => {
      const parsed = parse(EnsureDefaultsSchema, input);
      const entityType = parsed.entityType ?? "organization";
      const entityId = parsed.entityId ?? getContext().tenantId ?? "default";
      const types = parsed.channelTypes ?? [...DEFAULT_CHANNEL_TYPES];

      const senderOverride = await getSetting(
        ctx.db,
        SETTING_KEYS.HOST_DEFAULT_SENDER_ADDRESS_OVERRIDE,
      );
      const parsedOverride = safeParse(string(), senderOverride);
      const defaultSenderAddress = parsedOverride.success ? parsedOverride.output : null;

      let materialized = 0;
      // oxlint-disable eslint/no-await-in-loop
      for (const type of types) {
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
          continue;
        }

        const providerKinds = channelTypeKinds(type);
        if (!providerKinds) {
          continue;
        }

        const [provider] = await dbUnit.controlPlaneDb
          .select()
          .from(commsProvider)
          .where(
            and(eq(commsProvider.isActive, true), inArray(commsProvider.kind, [...providerKinds])),
          )
          .orderBy(commsProvider.createdAt)
          .limit(1);
        if (!provider) {
          continue;
        }

        const senderAddress = defaultSenderAddress ?? provider.defaultSenderAddress;
        if (!senderAddress) {
          continue;
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
          continue;
        }

        materialized++;
        await ctx.audit.write({
          action: "created",
          crudAction: "create",
          entityId: row.id,
          entityType: AUDIT_ENTITY_TYPE.CHANNEL,
          newState: {
            entityId,
            entityType,
            name: row.name,
            providerId: provider.id,
            source: "host",
            type,
          },
        });

        await ctx.pubsub.publish(CHANNEL_EVENTS.DEFAULT_CHANGED, {
          channelId: row.id,
          isDefault: true,
          type,
        });
      }

      return { entityId, entityType, materialized };
      // oxlint-enable eslint/no-await-in-loop
    });
}
