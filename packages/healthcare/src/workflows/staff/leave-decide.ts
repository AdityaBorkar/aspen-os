import { healthcareLeaveRequest } from "#/db-schemas/staff";
import { OPERATIONS_EVENTS } from "#/pubsub";
import { DecideLeaveSchema } from "#/schemas/staff";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const LeaveDecideInputSchema = object({ input: DecideLeaveSchema });

export const leaveDecide = Workflow.name("healthcare.staff.leave-decide")
  .input(LeaveDecideInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(DecideLeaveSchema, input);
    const branchId = parsed.branchId ?? "main";
    const [leave] = await ctx.step.run("load-leave", async () =>
      ctx.db
        .select()
        .from(healthcareLeaveRequest)
        .where(eq(healthcareLeaveRequest.id, parsed.leaveId))
        .limit(1),
    );
    if (!leave) {
      throw new Error("Leave request not found; verify the leave id and retry");
    }
    if (leave.status !== "applied") {
      throw new Error("Only applied leaves can be decided; check the leave status");
    }
    if (parsed.decidedBy === leave.staff_id) {
      throw new Error("Leave needs maker-checker; a different decider must approve");
    }
    const status = parsed.decision === "approve" ? "approved" : "rejected";
    const [row] = await ctx.step.run("decide-leave", async () =>
      ctx.db
        .update(healthcareLeaveRequest)
        .set({
          decided_at: new Date(),
          decided_by: parsed.decidedBy,
          status,
          updated_at: new Date(),
        })
        .where(eq(healthcareLeaveRequest.id, leave.id))
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to decide leave.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.OPERATIONS,
        newState: { decidedBy: row.decided_by, status: row.status },
      });
      await ctx.pubsub.publish(OPERATIONS_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return { leaveId: row.id, status: row.status };
  });
