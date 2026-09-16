import { TenantMemberGetInputSchema } from "#/schemas/tenant-member";
import { requireTenantId } from "#/utils/require-tenant";
import { toTenantMemberDto } from "#/utils/tenant-member";

import { Workflow } from "@aspen-os/platform/server";
import { member, user } from "@aspen-os/platform/server/db-schemas";
import { and, eq } from "drizzle-orm";

export const getTenantMember = Workflow.name("tenant-member.get")
  .input(TenantMemberGetInputSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const tenantId = await requireTenantId(ctx, input.slug);

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
    }),
  );
