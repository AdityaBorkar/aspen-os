import { commsPreference } from "#/db-schemas";
import { ListPreferencesSchema } from "#/schemas/preference";
import { listPagination } from "#/workflow-steps/lists";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object } from "valibot";

const ListInputSchema = object({ input: ListPreferencesSchema });

export const listPreferences = Workflow.name("comms.preference.list")
  .input(ListInputSchema)
  .handler(async ({ input }, ctx) => {
    const { filters } = input;

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

    const { limit, offset } = listPagination(filters ?? undefined);
    // `and()` with no conditions returns undefined, and `.where(undefined)`
    // is a no-op — one chain covers the filtered and unfiltered cases.
    return ctx.db
      .select()
      .from(commsPreference)
      .where(and(...where))
      .orderBy(desc(commsPreference.createdAt))
      .limit(limit)
      .offset(offset);
  });
