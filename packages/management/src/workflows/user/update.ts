import { PLATFORM_USER_EVENTS } from "#/pubsub";
import { IdSchema, UpdatePlatformUserSchema } from "#/types";
import type { UpdatePlatformUserInput } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { requireAuth } from "#/utils/require-auth";
import { requireServiceProvider } from "#/utils/require-sp";
import {
  clearSpAssignment,
  upsertSpAssignment,
  validateRoleAssignment,
} from "#/utils/sp-assignment";
import { fetchUserStep } from "#/workflow-steps/fetch-user";

import { Workflow } from "@aspen-os/platform/server";
import type { JsonValue } from "@aspen-os/platform/server";
import { object } from "valibot";

export const updateUser = Workflow.name("user.update")
  .input(
    object({
      id: IdSchema,
      patch: UpdatePlatformUserSchema,
    }),
  )
  .handler(async (input, ctx) => {
    const auth = requireAuth(ctx);
    const { id, patch } = input;

    const current = await ctx.step.run(fetchUserStep, { id });

    const effectiveRole = patch.role ?? current.role;
    const effectiveSpId = patch.spId !== undefined ? patch.spId : current.spId;
    if (patch.role !== undefined || patch.spId !== undefined) {
      validateRoleAssignment(effectiveRole, effectiveSpId);
    }

    if (patch.spId) {
      await requireServiceProvider(ctx, patch.spId);
    }

    const changes: Record<string, JsonValue> = {};

    await ctx.step.run("update-auth-user", async () => {
      if (patch.name === undefined && patch.role === undefined) {
        return;
      }
      const updateData: Pick<UpdatePlatformUserInput, "name" | "role"> = {};
      if (patch.name !== undefined) {
        updateData.name = patch.name;
        changes.name = patch.name;
      }
      if (patch.role !== undefined) {
        updateData.role = patch.role;
        changes.role = patch.role;
      }

      await auth.rest.user.update({ data: updateData, id });
    });

    await ctx.step.run("update-sp-assignment", async () => {
      if (patch.spId === undefined) {
        return;
      }

      if (patch.spId === null) {
        await clearSpAssignment(ctx, id);
        changes.spId = null;
        return;
      }

      await upsertSpAssignment(ctx, id, patch.spId);
      changes.spId = patch.spId;
    });

    await ctx.step.run("audit-and-notify", async () => {
      if (Object.keys(changes).length === 0) {
        return;
      }

      await ctx.audit.write({
        action: AUDIT_ACTION.PLATFORM_USER_UPDATED,
        changes,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.PLATFORM_USER,
      });

      await ctx.pubsub.publish(PLATFORM_USER_EVENTS.UPDATED, {
        changes,
        userId: id,
      });
    });

    return ctx.step.run(fetchUserStep, { id });
  });
