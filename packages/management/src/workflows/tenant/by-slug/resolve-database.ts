import { tenant } from "#/db-schemas";
import { SlugSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { organization } from "@aspen-os/platform/server/db-schemas";
import { eq } from "drizzle-orm";
import { object } from "valibot";

/**
 * Resolve a workspace slug to its isolated tenant database name.
 * Single query used by request middleware to route `pm.run(databaseName)`.
 */
export const resolveTenantDatabase = Workflow.name("tenant.resolve-database")
  .input(object({ slug: SlugSchema }))
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const [row] = await ctx.db
        .select({
          databaseName: tenant.database_name,
          id: organization.id,
        })
        .from(organization)
        .leftJoin(tenant, eq(tenant.id, organization.id))
        .where(eq(organization.slug, input.slug))
        .limit(1);

      if (!row) {
        throw new Error("Workspace not found");
      }

      if (!row.databaseName) {
        throw new Error("Workspace database is not configured");
      }

      return { databaseName: row.databaseName };
    }),
  );
