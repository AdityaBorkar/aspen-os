import { hrPositionAssignment } from "#/db-schemas";
import { POSITION_EVENTS } from "#/pubsub";
import { AssignEmployeeSchema } from "#/types";
import {
  clearOtherCurrentPrimaryAssignments,
  ensureNoOpenAssignmentForEmployeeInPosition,
  ensurePositionActive,
  ensurePositionHasCapacity,
  todayString,
} from "#/utils/position-utils";
import { fetchEmployeeById } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, isNull } from "drizzle-orm";
import { minLength, object, optional, parse, pipe, string } from "valibot";

const InputSchema = object({
  employeeId: pipe(string(), minLength(1, "employeeId is required")),
  input: optional(AssignEmployeeSchema),
  positionId: pipe(string(), minLength(1, "positionId is required")),
});

export const assignEmployee = Workflow.name("hr.position.assign")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { positionId, employeeId } = input;
    const parsed = input.input ? parse(AssignEmployeeSchema, input.input) : null;

    const position = await ensurePositionActive(ctx.db, positionId);
    await fetchEmployeeById(ctx.db, employeeId);

    const fromDate = parsed?.fromDate ?? todayString();
    const isPrimary = parsed?.isPrimary ?? false;
    const toDate = parsed?.toDate ?? null;

    // Close a conflicting open-ended assignment of the same employee to the same position.
    await ctx.db
      .update(hrPositionAssignment)
      .set({ toDate: fromDate, updatedAt: new Date() })
      .where(
        and(
          eq(hrPositionAssignment.employeeId, employeeId),
          eq(hrPositionAssignment.positionId, positionId),
          isNull(hrPositionAssignment.toDate),
        ),
      );

    if (isPrimary) {
      await clearOtherCurrentPrimaryAssignments(ctx.db, employeeId);
    }

    await ensurePositionHasCapacity(ctx.db, positionId);
    await ensureNoOpenAssignmentForEmployeeInPosition(ctx.db, employeeId, positionId);

    const [result] = await ctx.db
      .insert(hrPositionAssignment)
      .values({
        employeeId,
        fromDate,
        isPrimary,
        positionId,
        toDate,
      })
      .returning();

    if (!result) {
      throw new Error("Failed to assign employee to position.");
    }

    await ctx.pubsub.publish(POSITION_EVENTS.ASSIGNED, {
      assignment: {
        employeeId,
        fromDate,
        positionId,
      },
    });

    return { assignment: result, position };
  });
