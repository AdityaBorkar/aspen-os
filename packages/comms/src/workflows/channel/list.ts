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
      where.push(eq(commsChannel.entityType, filters.entityType));
    }
    if (filters?.entityId) {
      where.push(eq(commsChannel.entityId, filters.entityId));
    }
    if (filters?.isDefault !== undefined) {
      where.push(eq(commsChannel.isDefault, filters.isDefault));
    }

    const { limit, offset } = listPagination(filters ?? undefined);
    if (where.length === 0) {
      return ctx.db
        .select()
        .from(commsChannel)
        .orderBy(desc(commsChannel.createdAt))
        .limit(limit)
        .offset(offset);
    }
    return ctx.db
      .select()
      .from(commsChannel)
      .where(and(...where))
      .orderBy(desc(commsChannel.createdAt))
      .limit(limit)
      .offset(offset);
  });
