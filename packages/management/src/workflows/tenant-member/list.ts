import { TenantMemberListInputSchema } from "#/schemas/tenant-member";
import { requireTenantId } from "#/utils/require-tenant";
import { toTenantMemberDto } from "#/utils/tenant-member";

import { Workflow } from "@aspen-os/platform/server";
import { member, user } from "@aspen-os/platform/server/db-schemas";
import { asc, eq } from "drizzle-orm";

export const listTenantMembers = Workflow.name("tenant-member.list")
  .input(TenantMemberListInputSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const tenantId = await requireTenantId(ctx, input.slug);

      const rows = await ctx.db
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
        .where(eq(member.organizationId, tenantId))
        .orderBy(asc(user.name));

      return rows.map(toTenantMemberDto);
    }),
  );
