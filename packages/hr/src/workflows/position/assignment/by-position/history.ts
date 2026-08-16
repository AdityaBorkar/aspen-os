import { hrPositionAssignment } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { desc, eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  positionId: pipe(string(), minLength(1, "positionId is required")),
});

export const getPositionHistory = Workflow.name("hr.position.get-position-history")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { positionId } = input;

    return ctx.db
      .select()
      .from(hrPositionAssignment)
      .where(eq(hrPositionAssignment.positionId, positionId))
      .orderBy(desc(hrPositionAssignment.fromDate));
  });
