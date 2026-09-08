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

    if (source.to_date !== null) {
      throw new Error(`Assignment "${assignmentId}" is already closed.`);
    }

    await Promise.all([
      ensurePositionActive(ctx.db, transferInput.newPositionId),
      fetchEmployeeById(ctx.db, source.employee_id),
    ]);

    const toDate = transferInput.toDate ?? todayString();
    const fromDate = todayString();

    const { closed, created } = await ctx.db.transaction(async (tx) => {
      const [closedSource] = await tx
        .update(hrPositionAssignment)
        .set({ to_date: toDate, updated_at: new Date() })
        .where(and(eq(hrPositionAssignment.id, assignmentId), isNull(hrPositionAssignment.to_date)))
        .returning();

      if (!closedSource) {
        throw new Error("Failed to close source position assignment.");
      }

      await closeConflictingAssignment(tx, {
        employeeId: source.employee_id,
        positionId: transferInput.newPositionId,
        toDate: fromDate,
      });
      await ensureAssignable(tx, {
        employeeId: source.employee_id,
        isPrimary: source.is_primary,
        positionId: transferInput.newPositionId,
      });

      const [createdTarget] = await tx
        .insert(hrPositionAssignment)
        .values({
          employee_id: source.employee_id,
          from_date: fromDate,
          is_primary: source.is_primary,
          position_id: transferInput.newPositionId,
        })
        .returning();

      if (!createdTarget) {
        throw new Error("Failed to create target position assignment.");
      }
      return { closed: closedSource, created: createdTarget };
    });

    await ctx.pubsub.publish(POSITION_EVENTS.UNASSIGNED, {
      employeeId: source.employee_id,
      positionId: source.position_id,
      toDate,
    });
    await ctx.pubsub.publish(POSITION_EVENTS.REASSIGNED, {
      employeeId: source.employee_id,
      fromPositionId: source.position_id,
      toPositionId: transferInput.newPositionId,
    });

    return { from: closed, to: created };
  });
