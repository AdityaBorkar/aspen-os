import { healthcareAttendance } from "#/db-schemas/staff";
import { OPERATIONS_EVENTS } from "#/pubsub";
import { MarkAttendanceSchema } from "#/schemas/staff";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchStaffStep } from "#/workflow-steps/fetch-staff";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const AttendanceMarkInputSchema = object({ input: MarkAttendanceSchema });

export const attendanceMark = Workflow.name("healthcare.staff.attendance-mark")
  .input(AttendanceMarkInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(MarkAttendanceSchema, input);
    const branchId = parsed.branchId ?? "main";
    const staff = await ctx.step.run(fetchStaffStep, { id: parsed.staffId });
    if (staff.status !== "active") {
      throw new Error("Only active staff can be marked present; check the staff status");
    }
    const [row] = await ctx.step.run("insert-attendance", async () =>
      ctx.db
        .insert(healthcareAttendance)
        .values({
          branch_id: branchId,
          date: parsed.date,
          staff_id: staff.id,
          status: parsed.status,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to mark attendance.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.OPERATIONS,
        newState: { date: row.date, staffId: row.staff_id, status: row.status },
      });
      await ctx.pubsub.publish(OPERATIONS_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        data: {
          date: row.date,
          healthcareAttendanceId: row.id,
          hrOwner: "hr-attendance.attendance",
          staffId: row.staff_id,
          status: row.status,
        },
        id: row.id,
      });
    });
    return { date: row.date, id: row.id, staffId: row.staff_id, status: row.status };
  });
