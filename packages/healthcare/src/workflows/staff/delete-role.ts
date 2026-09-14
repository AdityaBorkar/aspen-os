import { healthcareStaff, healthcareStaffRole } from "#/db-schemas/staff";
import { OPERATIONS_EVENTS } from "#/pubsub";
import { RoleIdSchema } from "#/schemas/staff";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const DeleteRoleInputSchema = object({ input: RoleIdSchema });

export const deleteRole = Workflow.name("healthcare.staff.delete-role")
  .input(DeleteRoleInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RoleIdSchema, input);
    const branchId = parsed.branchId ?? "main";
    const [role] = await ctx.step.run("load-role", async () =>
      ctx.db
        .select()
        .from(healthcareStaffRole)
        .where(eq(healthcareStaffRole.id, parsed.id))
        .limit(1),
    );
    if (!role) {
      throw new Error("Role not found; verify the role id and retry");
    }
    const holders = await ctx.step.run("check-holders", async () =>
      ctx.db
        .select({ id: healthcareStaff.id })
        .from(healthcareStaff)
        .where(
          and(
            eq(healthcareStaff.branch_id, branchId),
            eq(healthcareStaff.role, role.name),
            eq(healthcareStaff.status, "active"),
          ),
        )
        .limit(5),
    );
    if (holders.length > 0) {
      throw new Error(`Role ${role.name} is held by active staff; reassign them before deleting`);
    }
    await ctx.step.run("delete-role", async () =>
      ctx.db.delete(healthcareStaffRole).where(eq(healthcareStaffRole.id, role.id)),
    );
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DELETED,
        crudAction: "delete",
        entityId: role.id,
        entityType: AUDIT_ENTITY_TYPE.OPERATIONS,
        newState: { name: role.name },
      });
      await ctx.pubsub.publish(OPERATIONS_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: role.id,
      });
    });
    return { id: role.id, name: role.name };
  });
