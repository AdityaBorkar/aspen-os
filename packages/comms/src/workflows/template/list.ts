import { commsTemplate } from "#/db-schemas";
import { ListTemplatesSchema } from "#/schemas/template";
import { listPagination } from "#/workflow-steps/lists";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object } from "valibot";

const ListInputSchema = object({ input: ListTemplatesSchema });

export const listTemplates = Workflow.name("comms.template.list")
  .input(ListInputSchema)
  .handler(async ({ input }, ctx) => {
    const { filters } = input;

    const where = [];
    if (filters?.channelType) {
      where.push(eq(commsTemplate.channelType, filters.channelType));
    }
    if (filters?.name) {
      where.push(eq(commsTemplate.name, filters.name));
    }
    if (filters?.isActive !== undefined) {
      where.push(eq(commsTemplate.isActive, filters.isActive));
    }

    const { limit, offset } = listPagination(filters ?? undefined);
    // `and()` with no conditions returns undefined, and `.where(undefined)`
    // is a no-op — one chain covers the filtered and unfiltered cases.
    return ctx.db
      .select()
      .from(commsTemplate)
      .where(and(...where))
      .orderBy(desc(commsTemplate.createdAt))
      .limit(limit)
      .offset(offset);
  });
