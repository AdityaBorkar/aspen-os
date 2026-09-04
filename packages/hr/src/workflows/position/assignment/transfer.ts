import { hrPositionAssignment } from "#/db-schemas";
import { POSITION_EVENTS } from "#/pubsub";
import { TransferAssignmentSchema } from "#/types";
import {
  closeConflictingAssignment,
  ensureAssignable,
  ensurePositionActive,
  fetchPositionAssignmentById,
  todayString,
} from "#/utils/position-utils";
import { fetchEmployeeById } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, isNull } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  assignmentId: pipe(string(), minLength(1, "assignmentId is required")),
  input: TransferAssignmentSchema,
});

export const transferAssignment = Workflow.name("hr.position.transfer")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { assignmentId, input: transferInput } = input;

    const source = await fetchPositionAssignmentById(ctx.db, assignmentId);

    if (source.toDate !== null) {
      throw new Error(`Assignment "${assignmentId}" is already closed.`);
    }

    await Promise.all([
      ensurePositionActive(ctx.db, transferInput.newPositionId),
      fetchEmployeeById(ctx.db, source.employeeId),
    ]);

    const toDate = transferInput.toDate ?? todayString();
    const fromDate = todayString();

    const { closed, created } = await ctx.db.transaction(async (tx) => {
      const [closedSource] = await tx
        .update(hrPositionAssignment)
        .set({ toDate, updatedAt: new Date() })
        .where(and(eq(hrPositionAssignment.id, assignmentId), isNull(hrPositionAssignment.toDate)))
        .returning();

      if (!closedSource) {
        throw new Error("Failed to close source position assignment.");
      }

      await closeConflictingAssignment(tx, {
        employeeId: source.employeeId,
        positionId: transferInput.newPositionId,
        toDate: fromDate,
      });
      await ensureAssignable(tx, {
        employeeId: source.employeeId,
        isPrimary: source.isPrimary,
        positionId: transferInput.newPositionId,
      });

      const [createdTarget] = await tx
        .insert(hrPositionAssignment)
        .values({
          employeeId: source.employeeId,
          fromDate,
          isPrimary: source.isPrimary,
          positionId: transferInput.newPositionId,
        })
        .returning();

      if (!createdTarget) {
        throw new Error("Failed to create target position assignment.");
      }
      return { closed: closedSource, created: createdTarget };
    });

    await ctx.pubsub.publish(POSITION_EVENTS.UNASSIGNED, {
      employeeId: source.employeeId,
      positionId: source.positionId,
      toDate,
    });
    await ctx.pubsub.publish(POSITION_EVENTS.REASSIGNED, {
      employeeId: source.employeeId,
      fromPositionId: source.positionId,
      toPositionId: transferInput.newPositionId,
    });

    return { from: closed, to: created };
  });
