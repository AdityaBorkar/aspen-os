import { commsChannel } from "#/db-schemas";
import { ListChannelsSchema } from "#/schemas/channel";
import { listPagination } from "#/workflow-steps/lists";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object } from "valibot";

const ListInputSchema = object({ input: ListChannelsSchema });

export const listChannels = Workflow.name("comms.channel.list")
  .input(ListInputSchema)
  .handler(async ({ input }, ctx) => {
    const { filters } = input;

    const where = [];
    if (filters?.type) {
      where.push(eq(commsChannel.type, filters.type));
    }
    if (filters?.source) {
      where.push(eq(commsChannel.source, filters.source));
    }
    if (filters?.status) {
      where.push(eq(commsChannel.status, filters.status));
    }
    if (filters?.entityType) {
      where.push(eq(commsChannel.entity_type, filters.entityType));
    }
    if (filters?.entityId) {
      where.push(eq(commsChannel.entity_id, filters.entityId));
    }
    if (filters?.isDefault !== undefined) {
      where.push(eq(commsChannel.is_default, filters.isDefault));
    }

    const { limit, offset } = listPagination(filters ?? undefined);
    // `and()` with no conditions returns undefined, and `.where(undefined)`
    // is a no-op — one chain covers the filtered and unfiltered cases.
    return ctx.db
      .select()
      .from(commsChannel)
      .where(and(...where))
      .orderBy(desc(commsChannel.created_at))
      .limit(limit)
      .offset(offset);
  });
