import { commsProvider } from "#/db-schemas";
import { ListProvidersSchema } from "#/schemas/provider";
import { listPagination } from "#/workflow-steps/lists";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object } from "valibot";

const ListInputSchema = object({ input: ListProvidersSchema });

export const listProviders = Workflow.name("comms.provider.list")
  .input(ListInputSchema)
  .handler(async ({ input }, ctx) => {
    const { filters } = input;

    const where = [];
    if (filters?.kind) {
      where.push(eq(commsProvider.kind, filters.kind));
    }
    if (filters?.isActive !== undefined) {
      where.push(eq(commsProvider.is_active, filters.isActive));
    }

    const { limit, offset } = listPagination(filters ?? undefined);
    // `and()` with no conditions returns undefined, and `.where(undefined)`
    // is a no-op — one chain covers the filtered and unfiltered cases.
    return ctx.db
      .select()
      .from(commsProvider)
      .where(and(...where))
      .orderBy(desc(commsProvider.created_at))
      .limit(limit)
      .offset(offset);
  });
