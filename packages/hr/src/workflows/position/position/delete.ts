import { hrPosition } from "#/db-schemas";
import { assertNoActiveAssignments, fetchPositionById } from "#/utils/position-utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deletePosition = Workflow.name("hr.position.delete")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    await fetchPositionById(ctx.db, id);
    await assertNoActiveAssignments(ctx.db, id);

    const [updated] = await ctx.db
      .update(hrPosition)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(hrPosition.id, id))
      .returning();

    return updated;
  });
