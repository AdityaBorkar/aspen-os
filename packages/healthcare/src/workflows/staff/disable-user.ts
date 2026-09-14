import { healthcareStaff } from "#/db-schemas/staff";
import { OPERATIONS_EVENTS } from "#/pubsub";
import { DisableUserSchema } from "#/schemas/staff";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchStaffStep } from "#/workflow-steps/fetch-staff";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const DisableUserInputSchema = object({ input: DisableUserSchema });

export const disableUser = Workflow.name("healthcare.staff.disable-user")
  .input(DisableUserInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(DisableUserSchema, input);
    const branchId = parsed.branchId ?? "main";
    const staff = await ctx.step.run(fetchStaffStep, { id: parsed.staffId });
    if (staff.status === "exited") {
      throw new Error("Staff is already exited; no status change needed");
    }
    const [row] = await ctx.step.run("disable-staff", async () =>
      ctx.db
        .update(healthcareStaff)
        .set({
          payload: {
            ...staff.payload,
            disableReason: parsed.reason,
            disabledAt: new Date().toISOString(),
            disabledBy: ctx.actorId ?? null,
          },
          status: parsed.status,
          updated_at: new Date(),
        })
        .where(eq(healthcareStaff.id, staff.id))
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to disable user.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.OPERATIONS,
        newState: { reason: parsed.reason, status: row.status },
      });
      await ctx.pubsub.publish(OPERATIONS_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return { id: row.id, status: row.status };
  });
