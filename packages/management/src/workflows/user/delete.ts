import { serviceProviderUser } from "#/db-schemas";
import { PLATFORM_USER_EVENTS } from "#/pubsub";
import { IdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchUserStep } from "#/workflow-steps/fetch-user";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const deleteUser = Workflow.name("user.delete")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    if (!ctx.auth) {
      throw new Error("Auth is required for user deletion");
    }
    const { auth } = ctx;
    const { id } = input;

    const previousState = await ctx.step.run(fetchUserStep, { id });

    await ctx.step.run("delete-auth-user", async () => {
      await auth.rest.user.remove({ id });
    });

    await ctx.step.run("delete-sp-assignment", async () => {
      await ctx.db.delete(serviceProviderUser).where(eq(serviceProviderUser.userId, id));
    });

    await ctx.audit.write({
      action: AUDIT_ACTION.PLATFORM_USER_DELETED,
      crudAction: "delete",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.PLATFORM_USER,
      previousState: previousState as Record<string, unknown>,
    });

    await ctx.pubsub.publish(PLATFORM_USER_EVENTS.DELETED, {
      userId: id,
    });
  });
