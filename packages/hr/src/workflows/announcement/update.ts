import { hrAnnouncement } from "#/db-schemas";
import { ANNOUNCEMENT_EVENTS } from "#/pubsub";
import { UpdateAnnouncementSchema } from "#/types";
import {
  fetchAnnouncementById,
  resolveAudienceDefinition,
  validateAudienceStrongRefs,
} from "#/utils/announcement-utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateAnnouncementSchema,
});

export const updateAnnouncement = Workflow.name("hr.announcement.update")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateAnnouncementSchema, patch);
    const existing = await fetchAnnouncementById(ctx.db, id);

    if (existing.status !== "draft" && existing.status !== "scheduled") {
      throw new Error("Only draft or scheduled announcements can be edited.");
    }

    const channel = parsed.channel ?? existing.channel;
    const audience = parsed.audience !== undefined ? parsed.audience : existing.audience;

    const { ids, type } = resolveAudienceDefinition({ audience, channel });
    await validateAudienceStrongRefs(ctx.db, type, ids);

    const [updated] = await ctx.db
      .update(hrAnnouncement)
      .set({
        ...parsed,
        audience: channel === "custom" ? audience : null,
        updatedAt: new Date(),
      })
      .where(eq(hrAnnouncement.id, id))
      .returning();

    const changes = Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => value !== undefined),
    );

    await ctx.pubsub.publish(ANNOUNCEMENT_EVENTS.UPDATED, {
      announcement: { id },
      changes,
    });

    return updated;
  });
