import { commsMessage } from "#/db-schemas";
import { ListMessagesSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ListInputSchema = object({ input: ListMessagesSchema });

export const listMessages = Workflow.name("comms.message.list")
  .input(ListInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ListMessagesSchema, input);
    const { filters } = parsed;

    const where = [];
    if (filters?.status) {
      where.push(eq(commsMessage.status, filters.status));
    }
    if (filters?.channelType) {
      where.push(eq(commsMessage.channelType, filters.channelType));
    }
    if (filters?.channelId) {
      where.push(eq(commsMessage.channelId, filters.channelId));
    }
    if (filters?.notificationId) {
      where.push(eq(commsMessage.notificationId, filters.notificationId));
    }

    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;

    const query =
      where.length === 0
        ? ctx.db.select().from(commsMessage)
        : ctx.db
            .select()
            .from(commsMessage)
            .where(and(...where));

    return query.orderBy(desc(commsMessage.createdAt)).limit(limit).offset(offset);
  });
