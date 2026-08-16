import { hrAnnouncement, hrAnnouncementRecipient } from "#/db-schemas";
import { ANNOUNCEMENT_EVENTS } from "#/pubsub";
import { fetchAnnouncementById, resolveRecipients } from "#/utils/announcement-utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const publishAnnouncement = Workflow.name("hr.announcement.publish")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const existing = await fetchAnnouncementById(ctx.db, id);

    if (existing.status === "published") {
      return existing;
    }
    if (existing.status !== "draft" && existing.status !== "scheduled") {
      throw new Error("Only draft or scheduled announcements can be published.");
    }

    const recipients = await resolveRecipients(ctx.db, {
      audience: existing.audience,
      channel: existing.channel,
    });

    if (recipients.length > 0) {
      await ctx.db.insert(hrAnnouncementRecipient).values(
        recipients.map((recipient) => ({
          announcementId: id,
          employeeId: recipient.employeeId,
          hrUserId: recipient.hrUserId,
          userId: recipient.userId,
        })),
      );
    }

    const [updated] = await ctx.db
      .update(hrAnnouncement)
      .set({ publishedAt: new Date(), status: "published", updatedAt: new Date() })
      .where(eq(hrAnnouncement.id, id))
      .returning();

    const recipientUserIds = recipients
      .map((recipient) => recipient.userId)
      .filter((userId): userId is string => userId !== null);

    await ctx.pubsub.publish(ANNOUNCEMENT_EVENTS.PUBLISHED, {
      announcement: { id, title: existing.title },
      recipientUserIds,
    });

    return updated;
  });
