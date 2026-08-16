import { commsProvider } from "#/db-schemas";
import { ListProvidersSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ListInputSchema = object({ input: ListProvidersSchema });

export const listProviders = Workflow.name("comms.provider.list")
  .input(ListInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ListProvidersSchema, input);
    const { filters } = parsed;

    const where = [];
    if (filters?.kind) {
      where.push(eq(commsProvider.kind, filters.kind));
    }
    if (filters?.isActive !== undefined) {
      where.push(eq(commsProvider.isActive, filters.isActive));
    }

    if (where.length === 0) {
      return ctx.db.select().from(commsProvider);
    }
    return ctx.db
      .select()
      .from(commsProvider)
      .where(and(...where));
  });
