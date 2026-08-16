import { commsPreference } from "#/db-schemas";
import { GetPreferenceSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, isNull } from "drizzle-orm";
import { object, parse } from "valibot";

const GetInputSchema = object({ input: GetPreferenceSchema });

export const getPreference = Workflow.name("comms.preference.get")
  .input(GetInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(GetPreferenceSchema, input);

    const [exact] = await ctx.db
      .select()
      .from(commsPreference)
      .where(
        and(
          eq(commsPreference.userId, parsed.userId),
          eq(commsPreference.type, parsed.type ?? ""),
          eq(commsPreference.channelType, parsed.channelType),
        ),
      )
      .limit(1);

    if (exact) {
      return exact;
    }

    const [defaultRule] = await ctx.db
      .select()
      .from(commsPreference)
      .where(
        and(
          eq(commsPreference.userId, parsed.userId),
          isNull(commsPreference.type),
          eq(commsPreference.channelType, parsed.channelType),
        ),
      )
      .limit(1);

    if (defaultRule) {
      return defaultRule;
    }

    return {
      channelType: parsed.channelType,
      enabled: true,
      priority: builtinPriority(parsed.channelType),
      type: parsed.type ?? null,
      userId: parsed.userId,
    };
  });

function builtinPriority(channelType: string): number {
  switch (channelType) {
    case "inapp": {
      return 1;
    }
    case "email": {
      return 2;
    }
    case "sms": {
      return 3;
    }
    case "whatsapp": {
      return 4;
    }
    default: {
      return 5;
    }
  }
}
