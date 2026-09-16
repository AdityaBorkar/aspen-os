import type { SchemaMap, WorkflowContext } from "@aspen-os/platform/server";
import { organization } from "@aspen-os/platform/server/db-schemas";
import { eq } from "drizzle-orm";

export async function requireTenantId<TSchemas extends SchemaMap>(
  ctx: WorkflowContext<TSchemas>,
  slug: string,
): Promise<string> {
  const [row] = await ctx.db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, slug))
    .limit(1);

  if (!row) {
    throw new Error("Workspace not found");
  }

  return row.id;
}
