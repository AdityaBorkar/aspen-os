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
      where.push(eq(commsProvider.isActive, filters.isActive));
    }

    const { limit, offset } = listPagination(filters ?? undefined);
    if (where.length === 0) {
      return ctx.db
        .select()
        .from(commsProvider)
        .orderBy(desc(commsProvider.createdAt))
        .limit(limit)
        .offset(offset);
    }
    return ctx.db
      .select()
      .from(commsProvider)
      .where(and(...where))
      .orderBy(desc(commsProvider.createdAt))
      .limit(limit)
      .offset(offset);
  });
