import { commsNotification } from "#/db-schemas";
import { GetInboxSchema } from "#/schemas/notification";
import { clampListLimit, clampListOffset } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { object } from "valibot";

const GetInboxInputSchema = object({ input: GetInboxSchema });

export const getInbox = Workflow.name("comms.notification.get-inbox")
  .input(GetInboxInputSchema)
  .handler(async ({ input }, ctx) => {
    const { filters } = input;

    if (!ctx.actorId) {
      throw new Error("Inbox queries require an authenticated actor.");
    }

    const where = [eq(commsNotification.recipient_id, ctx.actorId)];
    if (filters?.unreadOnly) {
      where.push(eq(commsNotification.status, "unread"));
    }
    if (filters?.type) {
      where.push(eq(commsNotification.type, filters.type));
    }
    if (filters?.severity) {
      where.push(eq(commsNotification.severity, filters.severity));
    }
    if (filters?.fromDate) {
      where.push(gte(commsNotification.created_at, new Date(filters.fromDate)));
    }
    if (filters?.toDate) {
      where.push(lte(commsNotification.created_at, new Date(filters.toDate)));
    }

    const limit = clampListLimit(filters?.limit);
    const offset = clampListOffset(filters?.offset);

    return ctx.db
      .select()
      .from(commsNotification)
      .where(and(...where))
      .orderBy(
        sql`CASE ${commsNotification.severity}
          WHEN 'urgent' THEN 0
          WHEN 'important' THEN 1
          ELSE 2
        END`,
        desc(commsNotification.created_at),
      )
      .limit(limit)
      .offset(offset);
  });
