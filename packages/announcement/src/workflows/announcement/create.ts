import { announcement } from "#/db-schemas";
import { ANNOUNCEMENT_EVENTS } from "#/pubsub";
import { CreateAnnouncementSchema } from "#/types";
import { resolveAudienceDefinition, validateAudienceStrongRefs } from "#/utils/announcement-utils";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateAnnouncementSchema,
});

export const createAnnouncement = Workflow.name("announcement.create")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    let scheduledAt: Date | null = null;
    if (parsed.scheduleAt) {
      scheduledAt = new Date(parsed.scheduleAt);
      if (Number.isNaN(scheduledAt.getTime())) {
        throw new Error("scheduleAt must be a valid date.");
      }
      if (scheduledAt.getTime() <= Date.now()) {
        throw new Error("Scheduling requires scheduleAt in the future.");
      }
    }

    const { ids, type } = resolveAudienceDefinition({
      audience: parsed.audience,
    });
    await validateAudienceStrongRefs(ctx.db, type, ids);

    if (!ctx.actorId) {
      throw new Error("Announcement author identity is required.");
    }

    const [result] = await ctx.db
      .insert(announcement)
      .values({
        audience: parsed.audience,
        author: ctx.actorId,
        body: parsed.body,
        priority: parsed.priority,
        require_acknowledgement: parsed.requireAcknowledgement,
        scheduled_for: scheduledAt,
        status: scheduledAt ? "scheduled" : "draft",
        title: parsed.title,
      })
      .returning();

    if (!result) {
      throw new Error("Failed to create announcement.");
    }

    await ctx.pubsub.publish(ANNOUNCEMENT_EVENTS.CREATED, {
      announcement: {
        id: result.id,
        status: result.status,
        title: result.title,
      },
    });

    return result;
  });
