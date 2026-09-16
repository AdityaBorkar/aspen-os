import { TENANT_MEMBER_EVENTS } from "#/pubsub";
import { UpdateTenantMemberInputSchema } from "#/schemas/tenant-member";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { requireAuth } from "#/utils/require-auth";
import { requireTenantId } from "#/utils/require-tenant";
import { toTenantMemberDto } from "#/utils/tenant-member";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { member, user } from "@aspen-os/platform/server/db-schemas";
import { and, eq } from "drizzle-orm";

export const updateTenantMember = Workflow.name("tenant-member.update")
  .input(UpdateTenantMemberInputSchema)
  .handler(async (input, ctx) => {
    const auth = requireAuth(ctx);
    const tenantId = await ctx.step.run("resolve-tenant", () => requireTenantId(ctx, input.slug));

    const [current] = await ctx.step.run("fetch-current", async () =>
      ctx.db
        .select({
          email: user.email,
          id: member.id,
          name: user.name,
          role: member.role,
          userId: member.userId,
        })
        .from(member)
        .innerJoin(user, eq(member.userId, user.id))
        .where(and(eq(member.organizationId, tenantId), eq(member.id, input.id)))
        .limit(1),
    );

    if (!current) {
      throw new Error("User not found in this workspace");
    }

    const { name, role } = input.patch;
    const changes: Record<string, JsonValue> = {};

    if (name !== undefined && name !== current.name) {
      await ctx.step.run("update-auth-user", async () => {
        await auth.rest.user.update({ data: { name }, id: current.userId });
      });
      changes.name = name;
    }

    if (role !== undefined && role !== current.role) {
      await ctx.step.run("update-member-role", async () => {
        await ctx.db
          .update(member)
          .set({ role })
          .where(and(eq(member.organizationId, tenantId), eq(member.id, input.id)));
      });
      changes.role = role;
    }

    if (Object.keys(changes).length > 0) {
      await ctx.step.run("audit-and-notify", async () => {
        await ctx.audit.write({
          action: AUDIT_ACTION.TENANT_MEMBER_UPDATED,
          changes,
          crudAction: "update",
          entityId: input.id,
          entityType: AUDIT_ENTITY_TYPE.TENANT_MEMBER,
        });

        await ctx.pubsub.publish(TENANT_MEMBER_EVENTS.UPDATED, {
          changes,
          memberId: input.id,
          tenantId,
        });
      });
    }

    return ctx.step.run("read-updated", async () => {
      const [row] = await ctx.db
        .select({
          createdAt: member.createdAt,
          email: user.email,
          id: member.id,
          name: user.name,
          role: member.role,
          userId: member.userId,
        })
        .from(member)
        .innerJoin(user, eq(member.userId, user.id))
        .where(and(eq(member.organizationId, tenantId), eq(member.id, input.id)))
        .limit(1);

      if (!row) {
        throw new Error("User not found in this workspace");
      }

      return toTenantMemberDto(row);
    });
  });
