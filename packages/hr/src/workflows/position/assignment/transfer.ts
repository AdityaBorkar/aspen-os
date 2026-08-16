import { hrPositionAssignment } from "#/db-schemas";
import { POSITION_EVENTS } from "#/pubsub";
import { TransferAssignmentSchema } from "#/types";
import {
  clearOtherCurrentPrimaryAssignments,
  ensureNoOpenAssignmentForEmployeeInPosition,
  ensurePositionActive,
  ensurePositionHasCapacity,
  fetchPositionAssignmentById,
  todayString,
} from "#/utils/position-utils";
import { fetchEmployeeById } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, isNull } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

const InputSchema = object({
  assignmentId: pipe(string(), minLength(1, "assignmentId is required")),
  input: TransferAssignmentSchema,
});

export const transferAssignment = Workflow.name("hr.position.transfer")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { assignmentId, input: transferInput } = input;
    const parsed = parse(TransferAssignmentSchema, transferInput);

    const source = await fetchPositionAssignmentById(ctx.db, assignmentId);

    if (source.toDate !== null) {
      throw new Error(`Assignment "${assignmentId}" is already closed.`);
    }

    await ensurePositionActive(ctx.db, parsed.newPositionId);
    await fetchEmployeeById(ctx.db, source.employeeId);

    const toDate = parsed.toDate ?? todayString();
    const fromDate = todayString();

    // Close the source assignment.
    const [closed] = await ctx.db
      .update(hrPositionAssignment)
      .set({ toDate, updatedAt: new Date() })
      .where(and(eq(hrPositionAssignment.id, assignmentId), isNull(hrPositionAssignment.toDate)))
      .returning();

    if (!closed) {
      throw new Error("Failed to close source position assignment.");
    }

    // Close a conflicting open-ended assignment of the same employee to the target position.
    await ctx.db
      .update(hrPositionAssignment)
      .set({ toDate: fromDate, updatedAt: new Date() })
      .where(
        and(
          eq(hrPositionAssignment.employeeId, source.employeeId),
          eq(hrPositionAssignment.positionId, parsed.newPositionId),
          isNull(hrPositionAssignment.toDate),
        ),
      );

    if (source.isPrimary) {
      await clearOtherCurrentPrimaryAssignments(ctx.db, source.employeeId);
    }

    await ensurePositionHasCapacity(ctx.db, parsed.newPositionId);
    await ensureNoOpenAssignmentForEmployeeInPosition(
      ctx.db,
      source.employeeId,
      parsed.newPositionId,
    );

    const [created] = await ctx.db
      .insert(hrPositionAssignment)
      .values({
        employeeId: source.employeeId,
        fromDate,
        isPrimary: source.isPrimary,
        positionId: parsed.newPositionId,
      })
      .returning();

    if (!created) {
      throw new Error("Failed to create target position assignment.");
    }

    await ctx.pubsub.publish(POSITION_EVENTS.UNASSIGNED, {
      employeeId: source.employeeId,
      positionId: source.positionId,
      toDate,
    });
    await ctx.pubsub.publish(POSITION_EVENTS.REASSIGNED, {
      employeeId: source.employeeId,
      fromPositionId: source.positionId,
      toPositionId: parsed.newPositionId,
    });

    return { from: closed, to: created };
  });
