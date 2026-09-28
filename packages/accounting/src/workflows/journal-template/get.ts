import { accountingJournalTemplate } from "#/db-schemas/settings";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const getJournalTemplate = Workflow.name("accounting.journal-template.get")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [row] = await ctx.db
      .select()
      .from(accountingJournalTemplate)
      .where(eq(accountingJournalTemplate.id, id))
      .limit(1);
    if (!row) {
      throw new Error(`Journal template "${id}" not found.`);
    }
    return row;
  });
