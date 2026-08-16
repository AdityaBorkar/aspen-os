import { hrAnnouncement } from "#/db-schemas";
import { ANNOUNCEMENT_EVENTS } from "#/pubsub";
import { fetchAnnouncementById } from "#/utils/announcement-utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  scheduledFor: pipe(string(), minLength(1, "scheduledFor is required")),
});

export const scheduleAnnouncement = Workflow.name("hr.announcement.schedule")
  .input(InputSchema)
  .handler(async ({ id, scheduledFor }, ctx) => {
    const existing = await fetchAnnouncementById(ctx.db, id);

    if (existing.status !== "draft" && existing.status !== "scheduled") {
      throw new Error("Only draft or scheduled announcements can be scheduled.");
    }

    const scheduledAt = new Date(scheduledFor);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new Error("scheduledFor must be a valid date.");
    }
    if (scheduledAt.getTime() <= Date.now()) {
      throw new Error("Scheduling requires scheduledFor in the future.");
    }

    const [updated] = await ctx.db
      .update(hrAnnouncement)
      .set({ scheduledFor: scheduledAt, status: "scheduled", updatedAt: new Date() })
      .where(eq(hrAnnouncement.id, id))
      .returning();

    await ctx.pubsub.publish(ANNOUNCEMENT_EVENTS.SCHEDULED, {
      announcementId: id,
      scheduledFor: scheduledAt.toISOString(),
    });

    return updated;
  });
