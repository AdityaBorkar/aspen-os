import { PLATFORM_USER_EVENTS } from "#/pubsub";
import { CreatePlatformUserSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { requireAuth } from "#/utils/require-auth";
import { requireServiceProvider } from "#/utils/require-sp";
import { upsertSpAssignment, validateRoleAssignment } from "#/utils/sp-assignment";

import { Workflow } from "@aspen-os/platform/server";

export const createUser = Workflow.name("user.create")
  .input(CreatePlatformUserSchema)
  .handler(async (input, ctx) => {
    const auth = requireAuth(ctx);

    validateRoleAssignment(input.role, input.spId);

    if (input.spId) {
      await requireServiceProvider(ctx, input.spId);
    }

    const createdUser = await ctx.step.run("create-auth-user", async () =>
      auth.rest.user.create({
        email: input.email,
        name: input.name,
        password: input.password,
      }),
    );

    await ctx.step.run("assign-role", async () => {
      await auth.rest.user.role.assign({
        roleName: input.role,
        userId: createdUser.id,
      });
    });

    if (input.spId) {
      const { spId } = input;
      await ctx.step.run("create-sp-assignment", async () => {
        await upsertSpAssignment(ctx, createdUser.id, spId);
      });
    }

    await ctx.step.run("audit-and-notify", async () => {
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
    });

    return { ...createdUser, role: input.role, spId: input.spId ?? null };
  });
