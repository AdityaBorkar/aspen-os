import { serviceProvider, serviceProviderUser } from "#/db-schemas";
import { PLATFORM_USER_EVENTS } from "#/pubsub";
import { IdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, ROLES } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

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

    await ctx.step.run("create-assignment", async () => {
      const [existing] = await ctx.db
        .select({ id: serviceProviderUser.id })
        .from(serviceProviderUser)
        .where(eq(serviceProviderUser.userId, userId))
        .limit(1);

      await (existing
        ? ctx.db
            .update(serviceProviderUser)
            .set({ serviceProviderId: spId, updatedAt: new Date() })
            .where(eq(serviceProviderUser.id, existing.id))
        : ctx.db.insert(serviceProviderUser).values({
            serviceProviderId: spId,
            userId,
          }));
    });

    await ctx.step.run("assign-auth-role", async () => {
      await ctx.auth?.rest.user.role.assign({
        roleName: ROLES.SP_USER,
        userId,
      });
    });

    await ctx.audit.write({
      action: AUDIT_ACTION.SP_ASSIGNED_TO_USER,
      crudAction: "update",
      entityId: userId,
      entityType: AUDIT_ENTITY_TYPE.PLATFORM_USER,
      newState: { role: ROLES.SP_USER, spId },
    });

    await ctx.pubsub.publish(PLATFORM_USER_EVENTS.ROLE_ASSIGNED, {
      role: ROLES.SP_USER,
      userId,
    });
  });
