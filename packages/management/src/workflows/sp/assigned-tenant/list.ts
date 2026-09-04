import { tenant } from "#/db-schemas";
import { IdSchema, LimitSchema, OffsetSchema } from "#/types";
import { requireServiceProvider } from "#/utils/require-sp";

import { Workflow } from "@aspen-os/platform/server";
import { asc, eq } from "drizzle-orm";
import { object } from "valibot";

export const listAssignedTenants = Workflow.name("sp.assigned-tenants")
  .input(
    object({
      limit: LimitSchema,
      offset: OffsetSchema,
      spId: IdSchema,
    }),
  )
  .handler(async (input, ctx) => {
    const { spId } = input;

    await requireServiceProvider(ctx, spId);

    return ctx.step.run("query", async () =>
      ctx.db
        .select()
        .from(tenant)
        .where(eq(tenant.serviceProviderId, spId))
        .orderBy(asc(tenant.id))
        .limit(input.limit ?? 50)
        .offset(input.offset ?? 0),
    );
  });
