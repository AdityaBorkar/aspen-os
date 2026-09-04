import { hrAnnouncement, hrAnnouncementRecipient } from "#/db-schemas";
import { ANNOUNCEMENT_EVENTS } from "#/pubsub";
import { fetchAnnouncementById, resolveRecipients } from "#/utils/announcement-utils";
import { assertUpdated } from "#/workflows/utils";

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

    const updated = await ctx.db.transaction(async (tx) => {
      // A retried publish after a partial failure must not duplicate recipients.
      if (recipients.length > 0) {
        const [present] = await tx
          .select({ id: hrAnnouncementRecipient.id })
          .from(hrAnnouncementRecipient)
          .where(eq(hrAnnouncementRecipient.announcementId, id))
          .limit(1);
        if (!present) {
          await tx.insert(hrAnnouncementRecipient).values(
            recipients.map((recipient) => ({
              announcementId: id,
              employeeId: recipient.employeeId,
              hrUserId: recipient.hrUserId,
              userId: recipient.userId,
            })),
          );
        }
      }

      const [row] = await tx
        .update(hrAnnouncement)
        .set({ publishedAt: new Date(), status: "published", updatedAt: new Date() })
        .where(eq(hrAnnouncement.id, id))
        .returning();

      return assertUpdated(row, `Announcement "${id}"`);
    });

    const recipientUserIds = recipients
      .map((recipient) => recipient.userId)
      .filter((userId): userId is string => userId !== null);

    await ctx.pubsub.publish(ANNOUNCEMENT_EVENTS.PUBLISHED, {
      announcement: { id, title: existing.title },
      recipientUserIds,
    });

    return updated;
  });
