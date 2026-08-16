import { hrAnnouncement } from "#/db-schemas";
import { ANNOUNCEMENT_EVENTS } from "#/pubsub";
import { fetchAnnouncementById } from "#/utils/announcement-utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const archiveAnnouncement = Workflow.name("hr.announcement.archive")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const existing = await fetchAnnouncementById(ctx.db, id);

    if (existing.status !== "published") {
      throw new Error("Only published announcements can be archived.");
    }

    const [updated] = await ctx.db
      .update(hrAnnouncement)
      .set({ archivedAt: new Date(), status: "archived", updatedAt: new Date() })
      .where(eq(hrAnnouncement.id, id))
      .returning();

    await ctx.pubsub.publish(ANNOUNCEMENT_EVENTS.ARCHIVED, { announcementId: id });

    return updated;
  });
