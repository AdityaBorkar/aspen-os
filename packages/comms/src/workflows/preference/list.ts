import { commsPreference } from "#/db-schemas";
import { ListPreferencesSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ListInputSchema = object({ input: ListPreferencesSchema });

export const listPreferences = Workflow.name("comms.preference.list")
  .input(ListInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ListPreferencesSchema, input);
    const { filters } = parsed;

    const where = [];
    if (filters?.userId) {
      where.push(eq(commsPreference.userId, filters.userId));
    }
    if (filters?.type) {
      where.push(eq(commsPreference.type, filters.type));
    }
    if (filters?.channelType) {
      where.push(eq(commsPreference.channelType, filters.channelType));
    }

    if (where.length === 0) {
      return ctx.db.select().from(commsPreference);
    }
    return ctx.db
      .select()
      .from(commsPreference)
      .where(and(...where));
  });
