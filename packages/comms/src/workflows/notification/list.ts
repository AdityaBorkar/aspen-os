import { commsNotification } from "#/db-schemas";
import { ListNotificationsSchema } from "#/schemas/notification";
import { listPagination } from "#/workflow-steps/lists";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object } from "valibot";

const ListInputSchema = object({ input: ListNotificationsSchema });

export const listNotifications = Workflow.name("comms.notification.list")
  .input(ListInputSchema)
  .handler(async ({ input }, ctx) => {
    const { filters } = input;

    const where = [];
    if (filters?.recipientType) {
      where.push(eq(commsNotification.recipientType, filters.recipientType));
    }
    if (filters?.recipientId) {
      where.push(eq(commsNotification.recipientId, filters.recipientId));
    }
    if (filters?.type) {
      where.push(eq(commsNotification.type, filters.type));
    }
    if (filters?.severity) {
      where.push(eq(commsNotification.severity, filters.severity));
    }
    if (filters?.status) {
      where.push(eq(commsNotification.status, filters.status));
    }

    const { limit, offset } = listPagination(filters ?? undefined);
    // `and()` with no conditions returns undefined, and `.where(undefined)`
    // is a no-op — one chain covers the filtered and unfiltered cases.
    return ctx.db
      .select()
      .from(commsNotification)
      .where(and(...where))
      .orderBy(desc(commsNotification.createdAt))
      .limit(limit)
      .offset(offset);
  });
