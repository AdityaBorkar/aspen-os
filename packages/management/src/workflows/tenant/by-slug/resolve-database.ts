import { SlugSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import type { DatabaseUnit } from "@aspen-os/platform/server";
import { organization } from "@aspen-os/platform/server/db-schemas";
import { eq } from "drizzle-orm";
import { object } from "valibot";

/**
 * Resolve a workspace slug to its isolated tenant database name.
 * Single query used by request middleware to route `pm.run(databaseName)`.
 *
 * The database name is not stored on the organization row: it is derived
 * via `DatabaseUnit.resolveDatabaseName`, the same single source of truth
 * `provisionTenant` and `getTenantDb` use.
 */
export function createResolveTenantDatabase(dbUnit: DatabaseUnit) {
  return Workflow.name("tenant.resolve-database")
    .input(object({ slug: SlugSchema }))
    .handler(async (input, ctx) =>
      ctx.step.run("query", async () => {
        const [row] = await ctx.db
          .select({ id: organization.id })
          .from(organization)
          .where(eq(organization.slug, input.slug))
          .limit(1);

        if (!row) {
          throw new Error("Workspace not found");
        }

        const databaseName = await dbUnit.resolveDatabaseName(row.id);
        return { databaseName };
      }),
    );
}
