import { commsNotification } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { and, count, eq } from "drizzle-orm";

export const unreadCount = Workflow.name("comms.notification.unread-count").handler(
  async (_input: Record<string, never>, ctx) => {
    if (!ctx.actorId) {
      throw new Error("Unread count requires an authenticated actor.");
    }
    const [row] = await ctx.db
      .select({ value: count() })
      .from(commsNotification)
      .where(
        and(eq(commsNotification.recipientId, ctx.actorId), eq(commsNotification.status, "unread")),
      );
    return { unread: row?.value ?? 0 };
  },
);
