import { commsNotification } from "#/db-schemas";
import { ListNotificationsSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ListInputSchema = object({ input: ListNotificationsSchema });

export const listNotifications = Workflow.name("comms.notification.list")
  .input(ListInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ListNotificationsSchema, input);
    const { filters } = parsed;

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

    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;

    const query =
      where.length === 0
        ? ctx.db.select().from(commsNotification)
        : ctx.db
            .select()
            .from(commsNotification)
            .where(and(...where));

    return query.orderBy(desc(commsNotification.createdAt)).limit(limit).offset(offset);
  });
