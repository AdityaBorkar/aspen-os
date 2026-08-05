import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { PLATFORM_USER_EVENTS } from "../pubsub";
import { IdSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";
import { fetchUserStep } from "./steps/fetch-user";
import { logAuditStep } from "./steps/log-audit";

export const deleteUser = Workflow.name("user.delete")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    if (!ctx.auth) throw new Error("Auth is required for user deletion");
    const auth = ctx.auth;
    const { id } = input;

    const previousState = await ctx.step.run(fetchUserStep, { id });

    await ctx.step.run("delete-auth-user", async () => {
      await auth._.user.remove({ id });
    });

    await ctx.step.run(logAuditStep, {
      action: AUDIT_ACTION.PLATFORM_USER_DELETED,
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.PLATFORM_USER,
      previousState: previousState as Record<string, unknown>,
    });

    await ctx.pubsub.publish(PLATFORM_USER_EVENTS.DELETED, {
      userId: id,
    });
  });
