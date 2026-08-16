import { hrAnnouncement } from "#/db-schemas";
import { ANNOUNCEMENT_EVENTS } from "#/pubsub";
import { fetchAnnouncementById } from "#/utils/announcement-utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const unpinAnnouncement = Workflow.name("hr.announcement.unpin")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const existing = await fetchAnnouncementById(ctx.db, id);

    if (!ctx.actorId) {
      throw new Error("Announcement unpinning requires an authenticated actor.");
    }

    if (!existing.isPinned) {
      return existing;
    }

    const [updated] = await ctx.db
      .update(hrAnnouncement)
      .set({ isPinned: false, pinnedBy: ctx.actorId, updatedAt: new Date() })
      .where(eq(hrAnnouncement.id, id))
      .returning();

    await ctx.pubsub.publish(ANNOUNCEMENT_EVENTS.PINNED, {
      announcementId: id,
      isPinned: false,
      pinnedBy: ctx.actorId,
    });

    return updated;
  });
