import { commsTemplate } from "#/db-schemas";
import { ListTemplatesSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ListInputSchema = object({ input: ListTemplatesSchema });

export const listTemplates = Workflow.name("comms.template.list")
  .input(ListInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ListTemplatesSchema, input);
    const { filters } = parsed;

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

    if (where.length === 0) {
      return ctx.db.select().from(commsTemplate);
    }
    return ctx.db
      .select()
      .from(commsTemplate)
      .where(and(...where));
  });
