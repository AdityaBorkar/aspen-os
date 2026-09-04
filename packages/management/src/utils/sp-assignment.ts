import { serviceProviderUser } from "#/db-schemas";
import { ROLES } from "#/utils/constants";

import type { SchemaMap, WorkflowContext } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export function validateRoleAssignment(
  role: string | null | undefined,
  spId: string | null | undefined,
): void {
  if (role === ROLES.SP_USER && !spId) {
    throw new Error("spId is required when role is 'sp_user'.");
  }
  if (role !== ROLES.SP_USER && spId) {
    throw new Error("spId must not be set when role is not 'sp_user'.");
  }
}

export async function upsertSpAssignment<TSchemas extends SchemaMap>(
  ctx: WorkflowContext<TSchemas>,
  userId: string,
  spId: string,
): Promise<void> {
  const [existing] = await ctx.db
    .select({ id: serviceProviderUser.id })
    .from(serviceProviderUser)
    .where(eq(serviceProviderUser.userId, userId))
    .limit(1);

  if (existing) {
    await ctx.db
      .update(serviceProviderUser)
      .set({ serviceProviderId: spId, updatedAt: new Date() })
      .where(eq(serviceProviderUser.id, existing.id));
    return;
  }

  await ctx.db.insert(serviceProviderUser).values({
    serviceProviderId: spId,
    userId,
  });
}

export async function clearSpAssignment<TSchemas extends SchemaMap>(
  ctx: WorkflowContext<TSchemas>,
  userId: string,
): Promise<void> {
  await ctx.db.delete(serviceProviderUser).where(eq(serviceProviderUser.userId, userId));
}
