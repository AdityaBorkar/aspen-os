import { healthcareLeaveRequest } from "#/db-schemas/staff";
import { OPERATIONS_EVENTS } from "#/pubsub";
import { RequestLeaveSchema } from "#/schemas/staff";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchStaffStep } from "#/workflow-steps/fetch-staff";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const LeaveRequestInputSchema = object({ input: RequestLeaveSchema });

export const leaveRequest = Workflow.name("healthcare.staff.leave-request")
  .input(LeaveRequestInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RequestLeaveSchema, input);
    const branchId = parsed.branchId ?? "main";
    const staff = await ctx.step.run(fetchStaffStep, { id: parsed.staffId });
    if (parsed.from > parsed.to) {
      throw new Error("Leave from-date is after to-date; fix the range and retry");
    }
    const overlap = await ctx.step.run("check-overlap", async () =>
      ctx.db
        .select({ id: healthcareLeaveRequest.id })
        .from(healthcareLeaveRequest)
        .where(
          and(
            eq(healthcareLeaveRequest.branch_id, branchId),
            eq(healthcareLeaveRequest.staff_id, staff.id),
            eq(healthcareLeaveRequest.status, "applied"),
          ),
        )
        .limit(50),
    );
    if (overlap.length > 0) {
      throw new Error("Staff already has a pending leave; decide it before requesting again");
    }
    const [row] = await ctx.step.run("insert-leave", async () =>
      ctx.db
        .insert(healthcareLeaveRequest)
        .values({
          branch_id: branchId,
          from_date: parsed.from,
          reason: parsed.reason,
          staff_id: staff.id,
          status: "applied",
          to_date: parsed.to,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to request leave.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.OPERATIONS,
        newState: { from: row.from_date, staffId: row.staff_id, to: row.to_date },
      });
      await ctx.pubsub.publish(OPERATIONS_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return { id: row.id, staffId: row.staff_id, status: row.status };
  });
