import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { serviceProvider, user } from "../db-schemas";
import { PLATFORM_USER_EVENTS } from "../pubsub";
import { IdSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, ROLES } from "../utils/constants";
import { logAuditStep } from "./steps/log-audit";

export const assignToServiceProvider = Workflow.name("user.assign-sp")
  .input(
    object({
      spId: IdSchema,
      userId: IdSchema,
    }),
  )
  .handler(async (input, ctx) => {
    const { userId, spId } = input;

    await ctx.step.run("validate-sp", async () => {
      const [sp] = await ctx.db
        .select({ status: serviceProvider.status })
        .from(serviceProvider)
        .where(eq(serviceProvider.id, spId))
        .limit(1);

      if (!sp) {
        throw new Error(`Service Provider with id "${spId}" not found.`);
      }
    });

    await ctx.step.run("update-user-sp", async () => {
      await ctx.db
        .update(user)
        .set({ role: ROLES.SP_USER, spId })
        .where(eq(user.id, userId));
    });

    await ctx.step.run(logAuditStep, {
      action: AUDIT_ACTION.SP_ASSIGNED_TO_USER,
      entityId: userId,
      entityType: AUDIT_ENTITY_TYPE.PLATFORM_USER,
      newState: { role: ROLES.SP_USER, spId },
    });

    await ctx.pubsub.publish(PLATFORM_USER_EVENTS.ROLE_ASSIGNED, {
      role: ROLES.SP_USER,
      userId,
    });
  });
