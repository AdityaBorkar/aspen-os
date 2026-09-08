import { commsMessage } from "#/db-schemas";
import { ListMessagesSchema } from "#/schemas/message";
import { listPagination } from "#/workflow-steps/lists";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object } from "valibot";

const ListInputSchema = object({ input: ListMessagesSchema });

export const listMessages = Workflow.name("comms.message.list")
  .input(ListInputSchema)
  .handler(async ({ input }, ctx) => {
    const { filters } = input;

    const where = [];
    if (filters?.status) {
      where.push(eq(commsMessage.status, filters.status));
    }
    if (filters?.channelType) {
      where.push(eq(commsMessage.channel_type, filters.channelType));
    }
    if (filters?.channelId) {
      where.push(eq(commsMessage.channel_id, filters.channelId));
    }
    if (filters?.notificationId) {
      where.push(eq(commsMessage.notification_id, filters.notificationId));
    }

    const { limit, offset } = listPagination(filters ?? undefined);
    // `and()` with no conditions returns undefined, and `.where(undefined)`
    // is a no-op — one chain covers the filtered and unfiltered cases.
    return ctx.db
      .select()
      .from(commsMessage)
      .where(and(...where))
      .orderBy(desc(commsMessage.created_at))
      .limit(limit)
      .offset(offset);
  });
