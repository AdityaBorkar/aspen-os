import { PLATFORM_USER_EVENTS } from "#/pubsub";
import { IdSchema, RoleSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, ROLES } from "#/utils/constants";
import { requireAuth } from "#/utils/require-auth";
import { clearSpAssignment } from "#/utils/sp-assignment";
import { fetchUserStep } from "#/workflow-steps/fetch-user";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

export const assignRole = Workflow.name("user.assign-role")
  .input(
    object({
      id: IdSchema,
      role: RoleSchema,
    }),
  )
  .handler(async (input, ctx) => {
    const auth = requireAuth(ctx);
    const { id, role } = input;

    const current = await ctx.step.run(fetchUserStep, { id });

    if (role === ROLES.SP_USER && !current.spId) {
      throw new Error("Cannot assign role 'sp_user' without a service provider assignment.");
    }

    await ctx.step.run("assign-auth-role", async () => {
      await auth.rest.user.role.assign({
        roleName: role,
        userId: id,
      });
    });

    if (role !== ROLES.SP_USER && current.spId) {
      await ctx.step.run("clear-sp-assignment", async () => {
        await clearSpAssignment(ctx, id);
      });
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.ROLE_ASSIGNED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.PLATFORM_USER,
        newState: { role },
      });

      await ctx.pubsub.publish(PLATFORM_USER_EVENTS.ROLE_ASSIGNED, {
        role,
        userId: id,
      });
    });
  });
