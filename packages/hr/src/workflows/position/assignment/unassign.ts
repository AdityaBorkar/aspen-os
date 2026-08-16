import { hrPositionAssignment } from "#/db-schemas";
import { POSITION_EVENTS } from "#/pubsub";
import { fetchPositionAssignmentById, todayString } from "#/utils/position-utils";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, isNull } from "drizzle-orm";
import { minLength, nullable, object, optional, pipe, string } from "valibot";

const InputSchema = object({
  assignmentId: pipe(string(), minLength(1, "assignmentId is required")),
  toDate: optional(nullable(string())),
});

export const unassignEmployee = Workflow.name("hr.position.unassign")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { assignmentId } = input;

    const assignment = await fetchPositionAssignmentById(ctx.db, assignmentId);

    if (assignment.toDate !== null) {
      throw new Error(`Assignment "${assignmentId}" is already closed.`);
    }

    const toDate = input.toDate ?? todayString();

    const [updated] = await ctx.db
      .update(hrPositionAssignment)
      .set({ toDate, updatedAt: new Date() })
      .where(and(eq(hrPositionAssignment.id, assignmentId), isNull(hrPositionAssignment.toDate)))
      .returning();

    if (!updated) {
      throw new Error("Failed to close position assignment.");
    }

    await ctx.pubsub.publish(POSITION_EVENTS.UNASSIGNED, {
      employeeId: assignment.employeeId,
      positionId: assignment.positionId,
      toDate,
    });

    return updated;
  });
