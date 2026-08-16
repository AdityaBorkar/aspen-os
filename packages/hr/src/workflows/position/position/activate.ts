import { hrPosition } from "#/db-schemas";
import { POSITION_EVENTS } from "#/pubsub";
import { fetchPositionById } from "#/utils/position-utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const activatePosition = Workflow.name("hr.position.activate")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const position = await fetchPositionById(ctx.db, id);
    if (position.isActive) {
      return position;
    }

    const [updated] = await ctx.db
      .update(hrPosition)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(hrPosition.id, id))
      .returning();

    await ctx.pubsub.publish(POSITION_EVENTS.ACTIVATED, { positionId: id });

    return updated;
  });
