import { hrPosition } from "#/db-schemas";
import { POSITION_EVENTS } from "#/pubsub";
import { assertNoActiveAssignments, fetchPositionById } from "#/utils/position-utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deactivatePosition = Workflow.name("hr.position.deactivate")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const position = await fetchPositionById(ctx.db, id);
    if (!position.isActive) {
      return position;
    }

    await assertNoActiveAssignments(ctx.db, id);

    const [updated] = await ctx.db
      .update(hrPosition)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(hrPosition.id, id))
      .returning();

    await ctx.pubsub.publish(POSITION_EVENTS.DEACTIVATED, { positionId: id });

    return updated;
  });
