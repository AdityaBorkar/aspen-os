import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { serviceProvider, user } from "../db-schemas";
import { PLATFORM_USER_EVENTS } from "../pubsub";
import { IdSchema, UpdatePlatformUserSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, ROLES } from "../utils/constants";
import { fetchUserStep } from "./steps/fetch-user";
import { logAuditStep } from "./steps/log-audit";

export const updateUser = Workflow.name("user.update")
  .input(
    object({
      id: IdSchema,
      patch: UpdatePlatformUserSchema,
    }),
  )
  .handler(async (input, ctx) => {
    if (!ctx.auth) throw new Error("Auth is required for user update");
    const auth = ctx.auth;
    const { id, patch } = input;

    if (patch.role === ROLES.SP_USER && patch.spId === null) {
      throw new Error("spId is required when role is 'sp_user'.");
    }
    if (
      patch.role !== undefined &&
      patch.role !== ROLES.SP_USER &&
      patch.spId
    ) {
      throw new Error("spId must not be set when role is not 'sp_user'.");
    }

    if (patch.spId) {
      const [sp] = await ctx.db
        .select({ status: serviceProvider.status })
        .from(serviceProvider)
        .where(eq(serviceProvider.id, patch.spId))
        .limit(1);

      if (!sp) {
        throw new Error(`Service Provider with id "${patch.spId}" not found.`);
      }
    }

    const changes: Record<string, unknown> = {};

    await ctx.step.run("update-auth-user", async () => {
      if (patch.name !== undefined || patch.role !== undefined) {
        const updateData: { name?: string; role?: string } = {};
        if (patch.name !== undefined) {
          updateData.name = patch.name;
          changes.name = patch.name;
        }
        if (patch.role !== undefined) {
          updateData.role = String(patch.role);
          changes.role = patch.role;
        }

        await auth._.user.update({ data: updateData, id });
      }
    });

    await ctx.step.run("update-db-user", async () => {
      if (patch.spId !== undefined) {
        await ctx.db
          .update(user)
          .set({ spId: patch.spId })
          .where(eq(user.id, id));
        changes.spId = patch.spId;
      }
    });

    await ctx.step.run("audit-and-notify", async () => {
      if (Object.keys(changes).length === 0) return;

      await ctx.step.run(logAuditStep, {
        action: AUDIT_ACTION.PLATFORM_USER_UPDATED,
        changes,
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
