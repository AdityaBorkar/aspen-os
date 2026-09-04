import { PLATFORM_USER_EVENTS } from "#/pubsub";
import { IdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { requireAuth } from "#/utils/require-auth";
import { clearSpAssignment } from "#/utils/sp-assignment";
import { fetchUserStep } from "#/workflow-steps/fetch-user";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

export const deleteUser = Workflow.name("user.delete")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const auth = requireAuth(ctx);
    const { id } = input;

    const previousState = await ctx.step.run(fetchUserStep, { id });

    await ctx.step.run("delete-sp-assignment", async () => {
      await clearSpAssignment(ctx, id);
    });

    await ctx.step.run("delete-auth-user", async () => {
      await auth.rest.user.remove({ id });
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.PLATFORM_USER_DELETED,
        crudAction: "delete",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.PLATFORM_USER,
        previousState,
      });

      await ctx.pubsub.publish(PLATFORM_USER_EVENTS.DELETED, {
        userId: id,
      });
    });
  });
