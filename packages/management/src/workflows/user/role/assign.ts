import { PLATFORM_USER_EVENTS } from "#/pubsub";
import { IdSchema, RoleSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

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
    if (!ctx.auth) {
      throw new Error("Auth is required for role assignment");
    }
    const { auth } = ctx;
    const { id, role } = input;

    await ctx.step.run("assign-auth-role", async () => {
      await auth.rest.user.role.assign({
        roleName: role,
        userId: id,
      });
    });

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
