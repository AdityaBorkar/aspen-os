import { hrAnnouncement } from "#/db-schemas";
import { fetchAnnouncementById } from "#/utils/announcement-utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const cancelScheduleAnnouncement = Workflow.name("hr.announcement.cancel-schedule")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const existing = await fetchAnnouncementById(ctx.db, id);

    if (existing.status !== "scheduled") {
      throw new Error("Only scheduled announcements can have their schedule cancelled.");
    }

    const [updated] = await ctx.db
      .update(hrAnnouncement)
      .set({ scheduledFor: null, status: "draft", updatedAt: new Date() })
      .where(eq(hrAnnouncement.id, id))
      .returning();

    return updated;
  });
