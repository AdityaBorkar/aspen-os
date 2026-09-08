import { hrAnnouncementRecipient } from "#/db-schemas";
import { fetchAnnouncementById } from "#/utils/announcement-utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq, sql } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  announcementId: pipe(string(), minLength(1, "announcementId is required")),
});

export const getAnnouncementStats = Workflow.name("hr.announcement.stats.get")
  .input(InputSchema)
  .handler(async ({ announcementId }, ctx) => {
    await fetchAnnouncementById(ctx.db, announcementId);

    const recipients = await ctx.db
      .select({ hasUser: hrAnnouncementRecipient.user_id })
      .from(hrAnnouncementRecipient)
      .where(eq(hrAnnouncementRecipient.announcement_id, announcementId));

    const totalRecipients = recipients.length;
    const deliveredUserCount = recipients.filter((recipient) => recipient.hasUser !== null).length;
    const employeeOnlyCount = totalRecipients - deliveredUserCount;

    // NOTE: comms_notification is owned by @aspen-os/comms. Its drizzle table
    // cannot be imported here: comms' built declarations reference the
    // package-local `#/*` alias, which would resolve to hr's own sources.
    // Query the table directly so the dependency stays one-directional.
    const statusCounts = await ctx.db.execute<{ count: number; status: string }>(sql`
      SELECT status, COUNT(*)::int AS "count"
      FROM comms_notification
      WHERE source_module = 'hr'
        AND source_entity->>'type' = 'announcement'
        AND source_entity->>'id' = ${announcementId}
      GROUP BY status
    `);

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
