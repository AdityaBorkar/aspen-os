import { hrAnnouncementRecipient } from "#/db-schemas";
import { fetchAnnouncementById } from "#/utils/announcement-utils";

import { dbSchema } from "@aspen-os/comms";
import { Workflow } from "@aspen-os/platform/server";
import { and, count, eq, sql } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const { commsNotification } = dbSchema;

const InputSchema = object({
  announcementId: pipe(string(), minLength(1, "announcementId is required")),
});

export const getAnnouncementStats = Workflow.name("hr.announcement.stats.get")
  .input(InputSchema)
  .handler(async ({ announcementId }, ctx) => {
    await fetchAnnouncementById(ctx.db, announcementId);

    const recipients = await ctx.db
      .select({ hasUser: hrAnnouncementRecipient.userId })
      .from(hrAnnouncementRecipient)
      .where(eq(hrAnnouncementRecipient.announcementId, announcementId));

    const totalRecipients = recipients.length;
    const deliveredUserCount = recipients.filter((recipient) => recipient.hasUser !== null).length;
    const employeeOnlyCount = totalRecipients - deliveredUserCount;

    const statusCounts = await ctx.db
      .select({ count: count(), status: commsNotification.status })
      .from(commsNotification)
      .where(
        and(
          eq(commsNotification.sourceModule, "hr"),
          sql`${commsNotification.sourceEntity}->>'type' = 'announcement'`,
          sql`${commsNotification.sourceEntity}->>'id' = ${announcementId}`,
        ),
      )
      .groupBy(commsNotification.status);

    const countFor = (status: "dismissed" | "read" | "unread"): number =>
      statusCounts.find((row) => row.status === status)?.count ?? 0;

    const unreadCount = countFor("unread");
    const readCount = countFor("read");
    const dismissedCount = countFor("dismissed");

    return {
      acknowledgementCount: readCount,
      deliveredUserCount,
      dismissedCount,
      employeeOnlyCount,
      readCount,
      totalRecipients,
      unreadCount,
    };
  });
