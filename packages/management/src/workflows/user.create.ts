import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { serviceProvider, serviceProviderUser } from "../db-schemas";
import { PLATFORM_USER_EVENTS } from "../pubsub";
import { CreatePlatformUserSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, ROLES } from "../utils/constants";

export const createUser = Workflow.name("user.create")
  .input(CreatePlatformUserSchema)
  .handler(async (input, ctx) => {
    if (!ctx.auth) {
      throw new Error("Auth is required for user creation");
    }
    const { auth } = ctx;

    if (input.role === ROLES.SP_USER && !input.spId) {
      throw new Error("spId is required when role is 'sp_user'.");
    }
    if (input.role !== ROLES.SP_USER && input.spId) {
      throw new Error("spId must not be set when role is not 'sp_user'.");
    }

    if (input.spId) {
      const [sp] = await ctx.db
        .select({ status: serviceProvider.status })
        .from(serviceProvider)
        .where(eq(serviceProvider.id, input.spId))
        .limit(1);

      if (!sp) {
        throw new Error(`Service Provider with id "${input.spId}" not found.`);
      }
    }

    const response = await auth.service.api.createUser({
      body: {
        email: input.email,
        name: input.name,
        password: input.password,
        role: input.role as "admin",
      },
    });
    const createdUser = response.user;

    if (input.spId) {
      await ctx.db.insert(serviceProviderUser).values({
        serviceProviderId: input.spId,
        userId: createdUser.id,
      });
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.PLATFORM_USER_CREATED,
      crudAction: "create",
      entityId: createdUser.id,
      entityType: AUDIT_ENTITY_TYPE.PLATFORM_USER,
      newState: {
        email: createdUser.email,
        role: input.role,
        spId: input.spId ?? null,
      },
    });

    await ctx.pubsub.publish(PLATFORM_USER_EVENTS.CREATED, {
      user: {
        email: createdUser.email,
        id: createdUser.id,
        role: input.role,
      },
    });

    return { ...createdUser, spId: input.spId ?? null };
  });
