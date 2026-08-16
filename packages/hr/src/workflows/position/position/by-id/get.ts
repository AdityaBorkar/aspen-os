import { hrPosition, hrPositionAssignment } from "#/db-schemas";
import { fetchPositionById } from "#/utils/position-utils";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, isNull } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getPositionById = Workflow.name("hr.position.get-by-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const position = await fetchPositionById(ctx.db, id);

    const [directSubPositions, incumbents] = await Promise.all([
      ctx.db
        .select({ id: hrPosition.id })
        .from(hrPosition)
        .where(eq(hrPosition.reportsToPosition, id)),
      ctx.db
        .select()
        .from(hrPositionAssignment)
        .where(and(eq(hrPositionAssignment.positionId, id), isNull(hrPositionAssignment.toDate))),
    ]);

    return {
      ...position,
      directSubPositionCount: directSubPositions.length,
      incumbents,
    };
  });
