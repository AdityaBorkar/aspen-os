import { commsPreference } from "#/db-schemas";
import { GetPreferenceSchema } from "#/schemas/preference";
import { channelTypePriority } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, isNull } from "drizzle-orm";
import { object } from "valibot";

const GetInputSchema = object({ input: GetPreferenceSchema });

export const getPreference = Workflow.name("comms.preference.get")
  .input(GetInputSchema)
  .handler(async ({ input }, ctx) => {
    if (input.type != null) {
      const [exact] = await ctx.db
        .select()
        .from(commsPreference)
        .where(
          and(
            eq(commsPreference.user_id, input.userId),
            eq(commsPreference.type, input.type),
            eq(commsPreference.channel_type, input.channelType),
          ),
        )
        .limit(1);

      if (exact) {
        return exact;
      }
    }

    const [defaultRule] = await ctx.db
      .select()
      .from(commsPreference)
      .where(
        and(
          eq(commsPreference.user_id, input.userId),
          isNull(commsPreference.type),
          eq(commsPreference.channel_type, input.channelType),
        ),
      )
      .limit(1);

    if (defaultRule) {
      return defaultRule;
    }

    return {
      channelType: input.channelType,
      enabled: true,
      priority: channelTypePriority(input.channelType),
      type: input.type ?? null,
      userId: input.userId,
    };
  });
