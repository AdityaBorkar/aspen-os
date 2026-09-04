import { serviceProvider } from "#/db-schemas";

import type { SchemaMap, WorkflowContext } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export async function requireServiceProvider<TSchemas extends SchemaMap>(
  ctx: WorkflowContext<TSchemas>,
  spId: string,
): Promise<void> {
  const [sp] = await ctx.db
    .select({ id: serviceProvider.id })
    .from(serviceProvider)
    .where(eq(serviceProvider.id, spId))
    .limit(1);

  if (!sp) {
    throw new Error(`Service Provider with id "${spId}" not found.`);
  }
}
