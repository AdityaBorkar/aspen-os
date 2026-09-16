import { TENANT_MEMBER_EVENTS } from "#/pubsub";
import { CreateTenantMemberInputSchema } from "#/schemas/tenant-member";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, ROLES } from "#/utils/constants";
import { requireAuth } from "#/utils/require-auth";
import { requireTenantId } from "#/utils/require-tenant";
import { toTenantMemberDto } from "#/utils/tenant-member";

import { Workflow } from "@aspen-os/platform/server";
import { member } from "@aspen-os/platform/server/db-schemas";
import { and, eq } from "drizzle-orm";

export const createTenantMember = Workflow.name("tenant-member.create")
  .input(CreateTenantMemberInputSchema)
  .handler(async (input, ctx) => {
    const auth = requireAuth(ctx);
    const tenantId = await ctx.step.run("resolve-tenant", () => requireTenantId(ctx, input.slug));

    const platformRole = input.role === "admin" ? ROLES.TENANT_ADMIN : ROLES.TENANT_USER;

    const createdUser = await ctx.step.run("create-auth-user", async () =>
      auth.rest.user.create({
        email: input.email,
        name: input.name,
        password: input.password,
      }),
    );

    await ctx.step.run("assign-platform-role", async () => {
      await auth.rest.user.role.assign({
        roleName: platformRole,
        userId: createdUser.id,
      });
    });

    const memberId = crypto.randomUUID();

    try {
      await ctx.step.run("add-member", async () => {
        await ctx.db.insert(member).values({
          createdAt: new Date(),
          id: memberId,
          organizationId: tenantId,
          role: input.role,
          userId: createdUser.id,
        });
      });
    } catch (error) {
      await ctx.step
        .run("rollback-auth-user", async () => {
          await auth.rest.user.remove({ id: createdUser.id });
        })
        .catch((rollbackError) => {
          ctx.log.error(
            "Failed to roll back partially created workspace user",
            rollbackError instanceof Error ? rollbackError : new Error(String(rollbackError)),
            { userId: createdUser.id },
          );
        });
      throw error;
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.TENANT_MEMBER_ADDED,
        crudAction: "create",
        entityId: memberId,
        entityType: AUDIT_ENTITY_TYPE.TENANT_MEMBER,
        newState: {
          email: input.email,
          role: input.role,
          tenantId,
          userId: createdUser.id,
        },
      });

      await ctx.pubsub.publish(TENANT_MEMBER_EVENTS.ADDED, {
        member: {
          email: input.email,
          id: memberId,
          role: input.role,
          userId: createdUser.id,
        },
        tenantId,
      });
    });

    return ctx.step.run("read-created", async () => {
      const [row] = await ctx.db
        .select({
          createdAt: member.createdAt,
          id: member.id,
          role: member.role,
        })
        .from(member)
        .where(and(eq(member.organizationId, tenantId), eq(member.id, memberId)))
        .limit(1);

      if (!row) {
        throw new Error("User not found in this workspace");
      }

      return toTenantMemberDto({
        createdAt: row.createdAt,
        email: input.email,
        id: row.id,
        name: input.name,
        role: row.role,
        userId: createdUser.id,
      });
    });
  });
