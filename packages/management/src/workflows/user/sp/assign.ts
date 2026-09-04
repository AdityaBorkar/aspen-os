import { PLATFORM_USER_EVENTS } from "#/pubsub";
import { IdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, ROLES } from "#/utils/constants";
import { requireAuth } from "#/utils/require-auth";
import { requireServiceProvider } from "#/utils/require-sp";
import { upsertSpAssignment } from "#/utils/sp-assignment";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

export const assignToServiceProvider = Workflow.name("user.assign-sp")
  .input(
    object({
      id: IdSchema,
      spId: IdSchema,
    }),
  )
  .handler(async (input, ctx) => {
    const auth = requireAuth(ctx);
    const { id: userId, spId } = input;

    await requireServiceProvider(ctx, spId);

    await ctx.step.run("create-assignment", async () => {
      await upsertSpAssignment(ctx, userId, spId);
    });

    await ctx.step.run("assign-auth-role", async () => {
      await auth.rest.user.role.assign({
        roleName: ROLES.SP_USER,
        userId,
      });
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.SP_ASSIGNED_TO_USER,
        crudAction: "update",
        entityId: userId,
        entityType: AUDIT_ENTITY_TYPE.PLATFORM_USER,
        newState: { role: ROLES.SP_USER, spId },
      });

      await ctx.pubsub.publish(PLATFORM_USER_EVENTS.SP_ASSIGNED, {
        role: ROLES.SP_USER,
        spId,
        userId,
      });
    });
  });
