import { hrAnnouncement } from "#/db-schemas";
import { ANNOUNCEMENT_EVENTS } from "#/pubsub";
import { fetchAnnouncementById } from "#/utils/announcement-utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const restoreAnnouncement = Workflow.name("hr.announcement.restore")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const existing = await fetchAnnouncementById(ctx.db, id);

    if (existing.status !== "archived") {
      throw new Error("Only archived announcements can be restored.");
    }

    const [updated] = await ctx.db
      .update(hrAnnouncement)
      .set({ archivedAt: null, status: "published", updatedAt: new Date() })
      .where(eq(hrAnnouncement.id, id))
      .returning();

    await ctx.pubsub.publish(ANNOUNCEMENT_EVENTS.ARCHIVED, { announcementId: id });

    return updated;
  });
