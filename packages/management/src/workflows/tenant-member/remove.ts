import { TENANT_MEMBER_EVENTS } from "#/pubsub";
import { RemoveTenantMemberInputSchema } from "#/schemas/tenant-member";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { requireTenantId } from "#/utils/require-tenant";

import { Workflow } from "@aspen-os/platform/server";
import { member } from "@aspen-os/platform/server/db-schemas";
import { and, eq } from "drizzle-orm";

export const removeTenantMember = Workflow.name("tenant-member.remove")
  .input(RemoveTenantMemberInputSchema)
  .handler(async (input, ctx) => {
    const tenantId = await ctx.step.run("resolve-tenant", () => requireTenantId(ctx, input.slug));

    const [current] = await ctx.step.run("fetch-current", async () =>
      ctx.db
        .select({ id: member.id, userId: member.userId })
        .from(member)
        .where(and(eq(member.organizationId, tenantId), eq(member.id, input.id)))
        .limit(1),
    );

    if (!current) {
      throw new Error("User not found in this workspace");
    }

    await ctx.step.run("remove-member", async () => {
      await ctx.db
        .delete(member)
        .where(and(eq(member.organizationId, tenantId), eq(member.id, input.id)));
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.TENANT_MEMBER_REMOVED,
        crudAction: "delete",
        entityId: input.id,
        entityType: AUDIT_ENTITY_TYPE.TENANT_MEMBER,
        previousState: { tenantId, userId: current.userId },
      });

      await ctx.pubsub.publish(TENANT_MEMBER_EVENTS.REMOVED, {
        memberId: input.id,
        tenantId,
      });
    });

    return { id: input.id };
  });
