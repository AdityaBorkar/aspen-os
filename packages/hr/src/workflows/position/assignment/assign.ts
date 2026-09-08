import { hrPositionAssignment } from "#/db-schemas";
import { POSITION_EVENTS } from "#/pubsub";
import { AssignEmployeeSchema } from "#/types";
import {
  closeConflictingAssignment,
  ensureAssignable,
  ensurePositionActive,
  todayString,
} from "#/utils/position-utils";
import { fetchEmployeeById } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { minLength, object, optional, pipe, string } from "valibot";

const InputSchema = object({
  employeeId: pipe(string(), minLength(1, "employeeId is required")),
  input: optional(AssignEmployeeSchema),
  positionId: pipe(string(), minLength(1, "positionId is required")),
});

export const assignEmployee = Workflow.name("hr.position.assign")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { positionId, employeeId, input: assignmentOptions } = input;

    const fromDate = assignmentOptions?.fromDate ?? todayString();
    const isPrimary = assignmentOptions?.isPrimary ?? false;
    const toDate = assignmentOptions?.toDate ?? null;

    const [position] = await Promise.all([
      ensurePositionActive(ctx.db, positionId),
      fetchEmployeeById(ctx.db, employeeId),
    ]);

    const assignment = await ctx.db.transaction(async (tx) => {
      await closeConflictingAssignment(tx, { employeeId, positionId, toDate: fromDate });
      await ensureAssignable(tx, { employeeId, isPrimary, positionId });

      const [created] = await tx
        .insert(hrPositionAssignment)
        .values({
          employee_id: employeeId,
          from_date: fromDate,
          is_primary: isPrimary,
          position_id: positionId,
          to_date: toDate,
        })
        .returning();

      if (!created) {
        throw new Error("Failed to assign employee to position.");
      }
      return created;
    });

    await ctx.pubsub.publish(POSITION_EVENTS.ASSIGNED, {
      assignment: {
        employeeId,
        fromDate,
        positionId,
      },
    });

    return { assignment, position };
  });
